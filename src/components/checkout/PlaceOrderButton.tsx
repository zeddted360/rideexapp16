import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { ICartItemFetched } from "../../../types/types";
import {
  ShoppingBag,
  MapPin,
  Phone,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Receipt,
} from "lucide-react";

interface PlaceOrderButtonProps {
  subtotal: number;
  SERVICE_CHARGE: number;
  deliveryFee: number;
  address: string;
  phoneNumber: string;
  orders: ICartItemFetched[];
  isOrderLoading: boolean;
  handlePlaceOrder: () => void;
  showConfirmation: boolean;
  setShowConfirmation: (open: boolean) => void;
  handleConfirmOrder: () => void;
  error: string | null;
  totalAmount: number;
  confirmError: string | null;
}

const PlaceOrderButton: React.FC<PlaceOrderButtonProps> = ({
  subtotal,
  deliveryFee,
  SERVICE_CHARGE,
  address,
  phoneNumber,
  orders,
  isOrderLoading,
  handlePlaceOrder,
  showConfirmation,
  setShowConfirmation,
  handleConfirmOrder,
  error,
  totalAmount,
  confirmError,
}) => {
  const [confirmTotal, setConfirmTotal] = useState(0);

  useEffect(() => {
    if (showConfirmation) {
      setConfirmTotal(subtotal + deliveryFee + SERVICE_CHARGE);
    }
  }, [showConfirmation, subtotal, deliveryFee, SERVICE_CHARGE]);

  const grandTotal = subtotal + deliveryFee + SERVICE_CHARGE;
  const isDisabled =
    !address || !phoneNumber || orders.length === 0 || isOrderLoading;

  const missingFields = [
    !address && "delivery address",
    !phoneNumber && "phone number",
    orders.length === 0 && "items in cart",
  ].filter(Boolean);

  return (
    <>
      {/* Validation hint */}
      {missingFields.length > 0 && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 mb-3">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Please add your{" "}
            <span className="font-semibold">{missingFields.join(" and ")}</span>{" "}
            to continue
          </p>
        </div>
      )}

      {/* CTA Button */}
      <button
        onClick={handlePlaceOrder}
        disabled={isDisabled}
        className={`w-full relative flex items-center justify-between px-5 py-4 rounded-2xl font-bold transition-all duration-200 overflow-hidden group
          ${
            isDisabled
              ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
              : "bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-px active:translate-y-0"
          }`}
      >
        {/* Shimmer effect on hover */}
        {!isDisabled && (
          <span className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
        )}

        <span className="flex items-center gap-2.5 relative">
          {isOrderLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          ) : (
            <ShoppingBag
              className={`w-5 h-5 ${isDisabled ? "text-gray-400 dark:text-gray-500" : "text-white"}`}
            />
          )}
          <span
            className={`text-base ${isDisabled ? "text-gray-400 dark:text-gray-500" : "text-white"}`}
          >
            {isOrderLoading ? "Processing…" : "Place Order"}
          </span>
        </span>

        <span
          className={`flex items-center gap-1.5 relative text-base font-extrabold
          ${isDisabled ? "text-gray-400 dark:text-gray-500" : "text-white"}`}
        >
          ₦{grandTotal.toLocaleString()}
          {!isDisabled && <ChevronRight className="w-4 h-4 opacity-80" />}
        </span>
      </button>

      {/* Inline error */}
      {error && (
        <div className="flex items-center gap-2 mt-2.5 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs font-semibold text-red-600 dark:text-red-400">
            {error}
          </p>
        </div>
      )}

      {/* ── Confirmation Modal — always centered ── */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-9999 flex items-center justify-center p-4"
            style={{
              backgroundColor: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(6px)",
            }}
            onClick={() => !isOrderLoading && setShowConfirmation(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal top accent */}
              <div className="h-1 w-full bg-linear-to-r from-orange-400 via-orange-500 to-orange-600" />

              <div className="p-6 space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                        Confirm your order
                      </h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        Review before placing
                      </p>
                    </div>
                  </div>
                  {!isOrderLoading && (
                    <button
                      onClick={() => setShowConfirmation(false)}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                  )}
                </div>

                {/* Delivery details */}
                <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500">
                        Delivering to
                      </p>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate mt-0.5">
                        {address}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Phone className="w-4 h-4 text-orange-400 shrink-0" />
                    <div>
                      <p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500">
                        Phone
                      </p>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">
                        {phoneNumber}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order breakdown */}
                <div className="space-y-2">
                  {[
                    { label: "Subtotal", value: subtotal },
                    { label: "Delivery fee", value: deliveryFee },
                    { label: "Service charge", value: SERVICE_CHARGE },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-500 dark:text-gray-400">
                        {label}
                      </span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        ₦{value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      Total
                    </span>
                    <span className="text-lg font-extrabold text-orange-500">
                      ₦{confirmTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Confirm error */}
                {confirmError && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                      {confirmError}
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirmation(false)}
                    disabled={isOrderLoading}
                    className="flex-1 h-12 rounded-xl font-semibold text-sm border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Go back
                  </Button>
                  <button
                    onClick={handleConfirmOrder}
                    disabled={isOrderLoading}
                    className="flex-1 h-12 rounded-xl font-bold text-sm text-white bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/25 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                  >
                    {isOrderLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Processing…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Confirm order
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PlaceOrderButton;
