"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/state/store";
import {
  fetchBookedOrderById,
  cancelBookedOrder,
  updateBookedOrderAsync,
} from "@/state/bookedOrdersSlice";
import { branches } from "../../../../data/branches";
import {
  CheckCircle,
  MapPin,
  CreditCard,
  Landmark,
  Truck,
  XCircle,
  Loader2,
  Clock,
  Package,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  AlertCircle,
  Phone,
  Copy,
  Check,
  ThumbsUp,
  Home,
} from "lucide-react";
import Image from "next/image";
import { client, validateEnv, fileUrl } from "@/utils/appwrite";
import { usePayment } from "@/context/paymentContext";
import { listAsyncFeaturedItems } from "@/state/featuredSlice";
import { listAsyncMenusItem } from "@/state/menuSlice";
import { listAsyncPopularItems } from "@/state/popularSlice";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "@/context/authContext";
import SupportModal from "./SupportModal";
import CancelDialog from "./CancelDialog";
import OrderFeedbackModal from "./OrderFeedbackModal";
import LodingState from "./LodingState";
import ErrorState from "./ErrorState";
import NoBranchOrder from "./NoBranchOrder";
import CanceledStatus from "./CanceledStatus";
import { listAsyncPromoOfferItems } from "@/state/offerSlice";

const statusSteps = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "preparing", label: "Preparing", icon: Package },
  { key: "out_for_delivery", label: "On the way", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
];

function getStatusIndex(status: string) {
  const idx = statusSteps.findIndex((s) => s.key === status);
  return idx !== -1 ? idx : 0;
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.3, ease: [0.22, 1, 0.36, 1] },
});

export default function OrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { currentOrder, loading, error } = useSelector(
    (state: RootState) => state.bookedOrders,
  );
  const menuItems = useSelector((state: RootState) => state.menuItem.menuItems);
  const featuredItems = useSelector(
    (state: RootState) => state.featuredItem.featuredItems,
  );
  const popularItems = useSelector(
    (state: RootState) => state.popularItem.popularItems,
  );
  const promoOffers = useSelector(
    (state: RootState) => state.promoOffer.offersItem,
  );
  const { payWithPaystack, paying, paymentError } = usePayment();
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [showItems, setShowItems] = React.useState(false);
  const [visibleCount, setVisibleCount] = useState(4);
  const [cancelling, setCancelling] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { user } = useAuth();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [prevStatus, setPrevStatus] = useState<string | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [remainingTime, setRemainingTime] = useState<string>("");

  const findItemById = (id: string) =>
    menuItems.find((i) => i.$id === id) ||
    featuredItems.find((i) => i.$id === id) ||
    popularItems.find((i) => i.$id === id) ||
    promoOffers.find((i) => i.$id === id);

  const getStatusMessage = (status: string, deliveryDuration?: string) => {
    switch (status) {
      case "pending":
        return "Your order is currently pending";
      case "confirmed":
        return "Your order has been confirmed";
      case "preparing":
        return "Your order is being prepared";
      case "out_for_delivery":
        if (remainingTime === "arriving now")
          return "Your order is arriving now!";
        if (remainingTime) return `Estimated arrival in ${remainingTime}`;
        if (deliveryDuration) return `Estimated arrival: ${deliveryDuration}`;
        return "Your order is on the way";
      case "delivered":
        return "Your order has been delivered!";
      default:
        return "Your order is being processed";
    }
  };

  useEffect(() => {
    if (orderId) {
      dispatch(fetchBookedOrderById(orderId));
      dispatch(listAsyncFeaturedItems());
      dispatch(listAsyncMenusItem());
      dispatch(listAsyncPopularItems());
      dispatch(listAsyncPromoOfferItems());
    }
  }, [orderId, dispatch]);

  useEffect(() => {
    if (!orderId) return;
    const { bookedOrdersCollectionId, databaseId } = validateEnv();
    const channel = `databases.${databaseId}.collections.${bookedOrdersCollectionId}.documents.${orderId}`;
    const unsubscribe = client.subscribe(channel, (response: any) => {
      if (
        response.events.includes("databases.*.collections.*.documents.*.update")
      ) {
        dispatch(fetchBookedOrderById(orderId));
      }
    });
    return () => unsubscribe();
  }, [orderId, dispatch]);

  useEffect(() => {
    if (
      currentOrder?.status === "delivered" &&
      !currentOrder.feedbackRating &&
      prevStatus !== "delivered"
    ) {
      setShowFeedbackModal(true);
    }
    if (currentOrder?.status) setPrevStatus(currentOrder.status);
  }, [currentOrder?.status, prevStatus, currentOrder?.feedbackRating]);

  useEffect(() => {
    if (
      currentOrder?.status === "out_for_delivery" &&
      prevStatus &&
      prevStatus !== "out_for_delivery" &&
      currentOrder.deliveryDuration
    ) {
      const match = currentOrder.deliveryDuration.match(/(\d+)/);
      const minutes = match ? parseInt(match[1], 10) : 30;
      if (minutes > 0) {
        localStorage.setItem(
          `deliveryEndTime_${orderId}`,
          (Date.now() + minutes * 60000).toString(),
        );
      }
    }
  }, [
    currentOrder?.status,
    prevStatus,
    currentOrder?.deliveryDuration,
    orderId,
  ]);

  useEffect(() => {
    if (
      currentOrder?.status !== "out_for_delivery" ||
      !currentOrder.deliveryDuration
    ) {
      setRemainingTime("");
      return;
    }
    const storageKey = `deliveryEndTime_${orderId}`;
    const saved = localStorage.getItem(storageKey);
    let endTime: Date;
    if (saved) {
      endTime = new Date(parseInt(saved, 10));
    } else {
      const match = currentOrder.deliveryDuration.match(/(\d+)/);
      const minutes = match ? parseInt(match[1], 10) : 30;
      endTime = new Date(Date.now() + minutes * 60000);
      localStorage.setItem(storageKey, endTime.getTime().toString());
    }
    const tick = () => {
      const diff = endTime.getTime() - Date.now();
      if (diff <= 0) {
        setRemainingTime("arriving now");
        localStorage.removeItem(storageKey);
        return;
      }
      const min = Math.floor(diff / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      setRemainingTime(`${min}:${sec.toString().padStart(2, "0")}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [currentOrder?.status, currentOrder?.deliveryDuration, orderId]);

  useEffect(() => {
    if (
      currentOrder &&
      (currentOrder.status === "delivered" ||
        currentOrder.status === "cancelled")
    ) {
      localStorage.removeItem(`deliveryEndTime_${orderId}`);
      setRemainingTime("");
    }
  }, [currentOrder?.status, orderId]);

  const branch = currentOrder
    ? branches.find((b) => b.id === currentOrder.selectedBranchId)
    : null;
  const statusIdx = currentOrder ? getStatusIndex(currentOrder.status) : 0;
  const riderCode =
    currentOrder?.riderCode ||
    currentOrder?.orderId?.slice(-4).toUpperCase() ||
    "";
  const canCancel = currentOrder?.status === "pending";
  const supportPhone = branch?.phone || "+234 800 000 0000";
  const isCash = currentOrder?.paymentMethod === "cash";
  const fullTotal = currentOrder?.total ?? 0;
  const deliveryFeeStored = currentOrder?.deliveryFee ?? 0;
  const amountToPayOnline = isCash ? fullTotal - deliveryFeeStored : fullTotal;
  const amountDueOnDelivery = isCash ? deliveryFeeStored : 0;
  const statusMessage = getStatusMessage(
    currentOrder?.status ?? "",
    currentOrder?.deliveryDuration,
  );

  const handleCopyCode = async () => {
    if (!riderCode) return;
    try {
      await navigator.clipboard.writeText(riderCode);
      setIsCopied(true);
      toast.success("Code copied!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const handleCancelOrder = async () => {
    if (!currentOrder) return;
    if (currentOrder.status !== "pending") {
      toast.error("Only pending orders can be cancelled");
      setCancelDialogOpen(false);
      return;
    }
    setCancelling(true);
    try {
      await dispatch(cancelBookedOrder(currentOrder.$id));
      toast.success("Order cancelled successfully!");
      router.push("/myorders");
    } catch {
      toast.error("Failed to cancel order");
    } finally {
      setCancelling(false);
      setCancelDialogOpen(false);
    }
  };

  const handlePayNow = () => {
    if (!currentOrder) return;
    payWithPaystack({
      email: user?.email || "user@example.com",
      amount: amountToPayOnline,
      reference: currentOrder.orderId || currentOrder.$id,
      orderId: currentOrder.$id,
      onSuccess: () => dispatch(fetchBookedOrderById(currentOrder.$id)),
      onClose: () => {},
    });
  };

  const handleFeedbackSubmit = async (rating: number, comment: string) => {
    if (!currentOrder) return;
    await dispatch(
      updateBookedOrderAsync({
        orderId: currentOrder.$id,
        orderData: { feedbackRating: rating, feedbackComment: comment },
      }),
    );
  };

  if (loading) return <LodingState />;
  if (error) return <ErrorState error={error} />;
  if (!currentOrder || !branch) return <NoBranchOrder />;
  if (currentOrder.status === "cancelled") return <CanceledStatus />;

  const itemIds: string[] = (currentOrder as any).itemIds || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4 py-6">
      <div className="max-w-lg mx-auto space-y-4">
        {/* ── Top nav ── */}
        <motion.div
          className="flex items-center justify-between"
        >
          <button
            onClick={() => router.push("/myorders")}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-orange-500 transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            My orders
          </button>
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
            #{riderCode}
          </span>
        </motion.div>

        {/* ── Hero header ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-3xl overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #f97316 0%, #ea580c 60%, #c2410c 100%)",
          }}
        >
          {/* Decorative blobs */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />

          <div className="relative px-5 pt-6 pb-5 space-y-4">
            {/* Greeting + support button */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/70 text-sm font-medium">
                  Hi {user?.username} 👋
                </p>
                <p className="text-white font-bold text-lg mt-0.5 leading-snug max-w-[220px]">
                  {statusMessage}
                </p>
              </div>

              {/* Animated support pulse button */}
              <motion.button
                onClick={() => setShowSupportModal(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative flex items-center justify-center w-14 h-14 bg-white/20 rounded-full flex-shrink-0"
                aria-label="Contact support"
              >
                <motion.div
                  className="absolute inset-0 rounded-full bg-white/30"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full bg-white/20"
                  animate={{ scale: [1, 1.7, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.4,
                  }}
                />
                <Phone className="w-6 h-6 text-white relative z-10" />
              </motion.button>
            </div>

            {/* Rider code */}
            <div className="flex items-center justify-between bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
              <div>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                  Delivery code
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <ThumbsUp className="w-3 h-3 text-white/60" />
                  <p className="text-white/80 text-xs font-semibold">
                    Show to rider
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {riderCode.split("").map((char, i) => (
                    <div
                      key={i}
                      className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-lg font-extrabold text-white border border-white/30"
                    >
                      {char}
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleCopyCode}
                  className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 flex items-center justify-center transition-colors flex-shrink-0"
                  aria-label="Copy code"
                >
                  {isCopied ? (
                    <Check className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Status progress stepper ── */}
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm px-4 py-5"
        >
          <div className="flex items-center justify-between">
            {statusSteps.map((step, idx) => {
              const StepIcon = step.icon;
              const done = idx < statusIdx;
              const active = idx === statusIdx;
              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: idx * 0.08 }}
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300
                        ${
                          done
                            ? "bg-orange-500 border-orange-500 shadow-sm shadow-orange-200 dark:shadow-orange-900/40"
                            : active
                              ? "bg-orange-500 border-orange-500 shadow-md shadow-orange-300 dark:shadow-orange-900/50"
                              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        }`}
                    >
                      {done ? (
                        <CheckCircle
                          className="w-5 h-5 text-white"
                          strokeWidth={2.5}
                        />
                      ) : active ? (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <StepIcon className="w-5 h-5 text-white" />
                        </motion.div>
                      ) : (
                        <StepIcon className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                      )}
                    </motion.div>
                    <p
                      className={`text-[10px] font-semibold text-center leading-tight
                      ${done || active ? "text-orange-500 dark:text-orange-400" : "text-gray-300 dark:text-gray-600"}`}
                    >
                      {step.label}
                    </p>
                  </div>
                  {idx < statusSteps.length - 1 && (
                    <div className="flex-1 h-0.5 -mt-5 mx-1">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${idx < statusIdx ? "bg-orange-500" : "bg-gray-200 dark:bg-gray-700"}`}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
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
              <p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500">
                Branch
              </p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
                {branch.name}
              </p>
              <p className="text-xs text-gray-400 truncate">{branch.address}</p>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900 flex-shrink-0">
              <Truck className="w-3 h-3 text-orange-500" />
              <span className="text-[10px] font-bold text-orange-500">
                Delivery
              </span>
            </div>
          </div>

          {/* Delivery address */}
          {currentOrder.address && (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <Home className="w-4 h-4 text-gray-400" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500">
                  Delivering to
                </p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {currentOrder.address}
                </p>
              </div>
            </div>
          )}

          {/* Payment */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              {currentOrder.paymentMethod === "card" ? (
                <CreditCard className="w-4 h-4 text-gray-400" />
              ) : (
                <Landmark className="w-4 h-4 text-gray-400" />
              )}
            </span>
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500">
                Payment
              </p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100 capitalize">
                {currentOrder.paymentMethod.replace(/_/g, " ")}
              </p>
              {isCash && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Delivery fee paid on arrival
                </p>
              )}
            </div>
            {currentOrder.paid && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900 text-[10px] font-bold text-green-600">
                <Check className="w-3 h-3" /> Paid
              </span>
            )}
          </div>

          {/* Delivery fee */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <Truck className="w-4 h-4 text-gray-400" />
            </span>
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500">
                Delivery fee
              </p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                ₦{currentOrder.deliveryFee?.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {isCash ? "Due to rider on arrival" : "Included in payment"}
              </p>
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between px-4 py-4">
            <span className="text-sm font-bold text-gray-800 dark:text-white">
              Total order value
            </span>
            <span className="text-xl font-extrabold text-orange-500">
              ₦{currentOrder.total?.toLocaleString()}
            </span>
          </div>
        </motion.div>

        {/* ── Payment required alert ── */}
        <AnimatePresence>
          {!currentOrder.paid && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
            >
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  Payment required
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  Complete payment so the restaurant can start preparing your
                  order.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Order items ── */}
        {itemIds.length > 0 && (
          <motion.div
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
          >
            <button
              onClick={() => setShowItems((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center">
                  <Package className="w-4 h-4 text-orange-500" />
                </span>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                  Order items{" "}
                  <span className="text-gray-400 font-normal">
                    ({itemIds.length})
                  </span>
                </span>
              </div>
              {showItems ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            <AnimatePresence>
              {showItems && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-2.5 border-t border-gray-50 dark:border-gray-800 pt-3">
                    {itemIds.slice(0, visibleCount).map((id) => {
                      const item = findItemById(id);
                      return (
                        <motion.div
                          key={id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700"
                        >
                          {item?.image ? (
                            <Image
                              src={
                                fileUrl(
                                  validateEnv().featuredBucketId,
                                  item.image,
                                ) ||
                                fileUrl(
                                  validateEnv().popularBucketId,
                                  item.image,
                                ) ||
                                fileUrl(
                                  validateEnv().menuBucketId,
                                  item.image,
                                ) ||
                                fileUrl(
                                  validateEnv().promoOfferBucketId,
                                  item.image,
                                )
                              }
                              alt={item.name}
                              width={48}
                              height={48}
                              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                              <Package className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                              {item ? item.name : `Item ${id}`}
                            </p>
                            {item?.description && (
                              <p className="text-xs text-gray-400 truncate mt-0.5">
                                {item.description}
                              </p>
                            )}
                            {item?.category && (
                              <span className="inline-block text-[10px] font-bold px-2 py-0.5 mt-1 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                                {item.category}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}

                    <div className="flex gap-2 pt-1">
                      {visibleCount < itemIds.length && (
                        <button
                          onClick={() => setVisibleCount((c) => c + 4)}
                          className="flex-1 h-9 rounded-xl text-xs font-semibold text-orange-600 bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900 hover:bg-orange-100 transition-colors"
                        >
                          Show more ({itemIds.length - visibleCount} remaining)
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setShowItems(false);
                          setVisibleCount(4);
                        }}
                        className="flex-1 h-9 rounded-xl text-xs font-semibold text-gray-500 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center gap-1"
                      >
                        <ChevronUp className="w-3.5 h-3.5" /> Hide
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Actions ── */}
        <motion.div  className="space-y-3">
          {/* Pay now */}
          {!currentOrder.paid && (
            <button
              onClick={handlePayNow}
              disabled={paying}
              className="w-full h-12 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/25 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
            >
              {paying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing…
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" /> Pay ₦
                  {amountToPayOnline.toLocaleString()} now
                </>
              )}
            </button>
          )}

          {isCash && amountDueOnDelivery > 0 && !currentOrder.paid && (
            <p className="text-xs text-center text-gray-400 dark:text-gray-500">
              + ₦{amountDueOnDelivery.toLocaleString()} delivery fee due to
              rider on arrival
            </p>
          )}

          {/* Cancel */}
          {canCancel && !currentOrder.paid && (
            <button
              onClick={() => setCancelDialogOpen(true)}
              className="w-full h-11 rounded-2xl text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 border-2 border-red-200 dark:border-red-800 transition-all flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" /> Cancel order
            </button>
          )}

          {canCancel && currentOrder.paid && (
            <div className="h-11 rounded-2xl text-sm font-medium text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2 cursor-not-allowed">
              Can't cancel (paid)
            </div>
          )}

          {/* Payment error */}
          <AnimatePresence>
            {paymentError && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900"
              >
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                  {paymentError}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-gray-400 dark:text-gray-500 pb-6"
        >
          Thank you for choosing{" "}
          <span className="font-bold text-orange-500">RideEx</span>
        </motion.p>
      </div>

      <CancelDialog
        cancelDialogOpen={cancelDialogOpen}
        cancelling={cancelling}
        currentOrder={currentOrder}
        handleCancelOrder={handleCancelOrder}
        setCancelDialogOpen={setCancelDialogOpen}
      />

      <SupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        branchName={branch.name}
        supportPhone={supportPhone}
        currentOrder={currentOrder}
        supportEmail="rideexlogistics@gmail.com"
        whatsappNumber="+2348161427755"
      />

      <OrderFeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={handleFeedbackSubmit}
        customerPhone={currentOrder.phone}
      />
    </div>
  );
}
