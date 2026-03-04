"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle,
  Truck,
  MapPin,
  CreditCard,
  X,
  Loader2,
  Clock,
  ThumbsUp,
  Copy,
  Check,
  AlertCircle,
  ChevronRight,
  Home,
  Package,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/state/store";
import {
  fetchBookedOrdersByUserId,
  updateBookedOrderRiderCode,
  cancelBookedOrder,
  updateBookedOrderAsync,
} from "@/state/bookedOrdersSlice";
import { branches } from "../../../data/branches";
import { useRouter } from "next/navigation";
import { usePayment } from "@/context/paymentContext";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import OrderFeedbackModal from "../myorders/[orderId]/OrderFeedbackModal";
import NoLatestOrder from "./NoLatestOrder";
import ErrorState from "./ErrorState";
import Loading from "./Loading";
import CancelDialog from "./CancelDialog";
import { client, validateEnv } from "@/utils/appwrite";

// Status config
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:       { label: "Pending",        color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-amber-950/30",  border: "border-amber-200 dark:border-amber-800" },
  confirmed:     { label: "Confirmed",      color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-950/30",    border: "border-blue-200 dark:border-blue-800" },
  preparing:     { label: "Preparing",      color: "text-purple-600 dark:text-purple-400",bg: "bg-purple-50 dark:bg-purple-950/30",border: "border-purple-200 dark:border-purple-800" },
  out_for_delivery:{ label: "On the way",   color: "text-orange-600 dark:text-orange-400",bg: "bg-orange-50 dark:bg-orange-950/30",border: "border-orange-200 dark:border-orange-800" },
  delivered:     { label: "Delivered",      color: "text-green-600 dark:text-green-400",  bg: "bg-green-50 dark:bg-green-950/30",  border: "border-green-200 dark:border-green-800" },
  cancelled:     { label: "Cancelled",      color: "text-red-600 dark:text-red-400",      bg: "bg-red-50 dark:bg-red-950/30",      border: "border-red-200 dark:border-red-800" },
};

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] },
});

export default function OrderConfirmation() {
  const SERVICE_CHARGE = 200;

  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const { user } = useSelector((state: RootState) => state.auth);
  const { orders, loading, error } = useSelector((state: RootState) => state.bookedOrders);
  const { payWithPaystack, paying, paymentError } = usePayment();

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  useEffect(() => {
    if (user?.userId) {
      dispatch(fetchBookedOrdersByUserId(user.userId));
      const { bookedOrdersCollectionId, databaseId } = validateEnv();
      const channel = `databases.${databaseId}.collections.${bookedOrdersCollectionId}.documents`;
      const unsubscribe = client.subscribe(channel, (response: any) => {
        if (
          response.payload?.customerId === user.userId &&
          (response.events.some((e: string) => e.endsWith(".create")) ||
            response.events.some((e: string) => e.endsWith(".update")) ||
            response.events.some((e: string) => e.endsWith(".delete")))
        ) {
          dispatch(fetchBookedOrdersByUserId(user.userId));
        }
      });
      return () => unsubscribe();
    }
  }, [user?.userId, dispatch]);

  const latestOrder = orders && orders.length > 0 ? orders[0] : null;
  const branch = latestOrder ? branches.find((b) => b.id === latestOrder.selectedBranchId) : null;
  const riderCode = latestOrder?.orderId ? latestOrder.orderId.slice(-4).toUpperCase() : "";

  useEffect(() => {
    if (latestOrder && !latestOrder.riderCode && riderCode) {
      dispatch(updateBookedOrderRiderCode({ id: latestOrder.$id, riderCode }));
    }
  }, [latestOrder, riderCode, dispatch]);

  const canCancel = latestOrder?.status === "pending";
  const isCash = latestOrder?.paymentMethod === "cash";
  const fullTotal = latestOrder?.total ?? 0;
  const deliveryFeeStored = latestOrder?.deliveryFee ?? 0;
  const amountToPayOnline = latestOrder?.amountPaidOnline ?? (isCash ? fullTotal - deliveryFeeStored : fullTotal);
  const amountDueOnDelivery = latestOrder?.amountDueOnDelivery ?? (isCash ? deliveryFeeStored : 0);

  const statusConfig = STATUS_CONFIG[latestOrder?.status ?? "pending"] ?? STATUS_CONFIG.pending;

  const handleCopyCode = async () => {
    if (riderCode) {
      try {
        await navigator.clipboard.writeText(riderCode);
        setIsCopied(true);
        toast.success("Code copied!");
        setTimeout(() => setIsCopied(false), 2000);
      } catch {
        toast.error("Failed to copy code");
      }
    }
  };

  const handlePayNow = () => {
    if (!latestOrder) return;
    payWithPaystack({
      email: user?.email || "user@example.com",
      amount: amountToPayOnline,
      reference: latestOrder.orderId || latestOrder.$id,
      orderId: latestOrder.$id,
      onSuccess: () => router.push(`/myorders/${latestOrder.orderId}`),
      onClose: () => {},
    });
  };

  const handleCancelOrder = async () => {
    if (!latestOrder) return;
    if (latestOrder.status !== "pending") {
      toast.error("Only pending orders can be cancelled");
      setCancelDialogOpen(false);
      return;
    }
    setCancelling(true);
    try {
      await dispatch(cancelBookedOrder(latestOrder.$id));
      toast.success("Order cancelled successfully!");
      if (user?.userId) await dispatch(fetchBookedOrdersByUserId(user.userId));
      router.push("/myorders");
    } catch (e) {
      toast.error("Failed to cancel order");
    } finally {
      setCancelling(false);
      setCancelDialogOpen(false);
    }
  };

  const handleTrackOrFeedback = () => {
    if (!latestOrder) return;
    if (latestOrder.status === "delivered") setShowFeedbackModal(true);
    else router.push(`/myorders/${latestOrder.orderId}`);
  };

  const handleFeedbackSubmit = async (rating: number, comment: string) => {
    if (!latestOrder) return;
    try {
      await dispatch(updateBookedOrderAsync({ orderId: latestOrder.$id, orderData: { feedbackRating: rating, feedbackComment: comment } }));
    } catch (err) {
      console.error("Failed to save feedback:", err);
      throw err;
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  if (!latestOrder || !branch) return <NoLatestOrder />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4 py-8 sm:py-12">
      <OrderFeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={handleFeedbackSubmit}
        customerPhone={user?.phoneNumber ?? ""}
        riderCode={latestOrder.riderCode}
      />

      <div className="max-w-lg mx-auto w-full space-y-4">

        {/* ── Top nav row ── */}
        <motion.div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-orange-500 transition-colors font-medium"
          >
            <Home className="w-3.5 h-3.5" />
            Home
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-gray-800 shadow border border-gray-100 dark:border-gray-700 hover:border-orange-300 transition-colors"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </motion.div>

        {/* ── Hero success banner ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-3xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #f97316 0%, #ea580c 60%, #c2410c 100%)" }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />

          <div className="relative px-6 py-8 text-center space-y-4">
            {/* Animated check */}
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.15 }}
              className="relative mx-auto w-16 h-16"
            >
              <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
              <div className="relative w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg shadow-black/20">
                <CheckCircle className="w-9 h-9 text-orange-500" strokeWidth={2.5} />
              </div>
            </motion.div>

            <motion.div>
              <h2 className="text-2xl font-extrabold text-white">Order Confirmed!</h2>
              <p className="text-white/70 text-sm mt-1">
                We're notifying the restaurant now
              </p>
            </motion.div>

            {/* Rider code */}
            <motion.div>
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <ThumbsUp className="w-3.5 h-3.5 text-white/70" />
                <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">
                  Show to Rider
                </p>
              </div>
              <div className="inline-flex items-center gap-3">
                <div className="flex gap-1.5">
                  {riderCode.split("").map((char, i) => (
                    <div
                      key={i}
                      className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-xl font-extrabold text-white shadow-inner border border-white/30"
                    >
                      {char}
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleCopyCode}
                  className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 flex items-center justify-center transition-colors"
                  aria-label="Copy code"
                >
                  {isCopied
                    ? <Check className="w-4 h-4 text-white" />
                    : <Copy className="w-4 h-4 text-white" />
                  }
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* ── Status pill ── */}
        <motion.div >
          <div className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border ${statusConfig.bg} ${statusConfig.border}`}>
            <div className="flex items-center gap-2.5">
              <Clock className={`w-4 h-4 flex-shrink-0 ${statusConfig.color}`} />
              <div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                  Your order is currently
                </p>
                <p className={`text-sm font-bold capitalize ${statusConfig.color}`}>
                  {latestOrder.status.replace(/_/g, " ")}
                </p>
              </div>
            </div>
            <span className="text-sm font-bold text-gray-800 dark:text-white">
              {latestOrder.deliveryTime || "ASAP"}
            </span>
          </div>
        </motion.div>

        {/* ── Details card ── */}
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-gray-800"
        >
          {/* Branch */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-orange-500" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500">Branch</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{branch.name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{branch.address}</p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900">
              <Truck className="w-3 h-3 text-orange-500" />
              <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">Delivery</span>
            </div>
          </div>

          {/* Address */}
          {latestOrder.address && (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <Home className="w-4 h-4 text-gray-400" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500">Delivering to</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{latestOrder.address}</p>
              </div>
            </div>
          )}

          {/* Payment method */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-4 h-4 text-gray-400" />
            </span>
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500">Payment</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100 capitalize">
                {latestOrder.paymentMethod.replace(/_/g, " ")}
              </p>
            </div>
            {latestOrder.paid && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900 text-[10px] font-bold text-green-600 dark:text-green-400">
                <Check className="w-3 h-3" /> Paid
              </span>
            )}
          </div>
        </motion.div>

        {/* ── Cash breakdown ── */}
        {isCash && amountDueOnDelivery > 0 && (
          <motion.div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm px-4 py-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Payment breakdown
              </p>
              <div className="space-y-2">
                {[
                  { label: "Paid now (items + service)", value: amountToPayOnline, accent: false },
                  { label: "Due on delivery (delivery fee)", value: amountDueOnDelivery, accent: true },
                ].map(({ label, value, accent }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{label}</span>
                    <span className={`font-bold ${accent ? "text-orange-500" : "text-gray-800 dark:text-gray-100"}`}>
                      ₦{value.toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="h-px bg-gray-100 dark:bg-gray-800" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-800 dark:text-white">Total order value</span>
                  <span className="text-base font-extrabold text-orange-500">₦{fullTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Actions ── */}
        <motion.div className="space-y-3">
          {/* Pay now */}
          {!latestOrder.paid && (
            <button
              onClick={handlePayNow}
              disabled={paying}
              className="w-full h-13 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/25 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
            >
              {paying ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
              ) : (
                <><CreditCard className="w-4 h-4" /> Pay ₦{amountToPayOnline.toLocaleString()} now</>
              )}
            </button>
          )}

          {isCash && amountDueOnDelivery > 0 && !latestOrder.paid && (
            <p className="text-xs text-center text-gray-400 dark:text-gray-500">
              + ₦{amountDueOnDelivery.toLocaleString()} delivery fee due to rider on arrival
            </p>
          )}

          {/* Track / Feedback + Cancel row */}
          <div className={`grid gap-3 ${canCancel && !latestOrder.paid ? "grid-cols-2" : "grid-cols-1"}`}>
            <button
              onClick={handleTrackOrFeedback}
              className="h-12 rounded-xl text-sm font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-950/50 border-2 border-orange-200 dark:border-orange-800 transition-all flex items-center justify-center gap-2"
            >
              {latestOrder.status === "delivered"
                ? <><ThumbsUp className="w-4 h-4" /> Leave feedback</>
                : <><Truck className="w-4 h-4" /> Track order</>
              }
            </button>

            {canCancel && !latestOrder.paid && (
              <button
                onClick={() => setCancelDialogOpen(true)}
                className="h-12 rounded-xl text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 border-2 border-red-200 dark:border-red-800 transition-all flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" /> Cancel order
              </button>
            )}

            {canCancel && latestOrder.paid && (
              <div className="h-12 rounded-xl text-sm font-medium text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2 cursor-not-allowed">
                <X className="w-4 h-4" /> Can't cancel (paid)
              </div>
            )}
          </div>

          {/* View orders link */}
          <button
            onClick={() => router.push("/myorders")}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm text-gray-400 dark:text-gray-500 hover:text-orange-500 transition-colors font-medium"
          >
            View all orders <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        {/* Payment error */}
        <AnimatePresence>
          {paymentError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900"
            >
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">{paymentError}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <CancelDialog
        cancelDialogOpen={cancelDialogOpen}
        cancelling={cancelling}
        handleCancelOrder={handleCancelOrder}
        latestOrder={latestOrder}
        riderCode={riderCode}
        setCancelDialogOpen={setCancelDialogOpen}
      />
    </div>
  );
}