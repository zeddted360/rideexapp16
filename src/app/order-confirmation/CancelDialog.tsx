import React, { Dispatch, FC, SetStateAction } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X, AlertTriangle, ShieldCheck } from "lucide-react";
import { IBookedOrderFetched } from "../../../types/types";

interface ICancelDialogProps {
  cancelDialogOpen: boolean;
  setCancelDialogOpen: Dispatch<SetStateAction<boolean>>;
  latestOrder: IBookedOrderFetched;
  handleCancelOrder: () => Promise<void>;
  cancelling: boolean;
  riderCode: string;
}

const CancelDialog: FC<ICancelDialogProps> = ({
  cancelDialogOpen,
  cancelling,
  handleCancelOrder,
  latestOrder,
  setCancelDialogOpen,
  riderCode,
}) => {
  const onClose = () => {
    if (!cancelling) setCancelDialogOpen(false);
  };
  const isPreparing = latestOrder.status === "preparing";

  return (
    <AnimatePresence>
      {cancelDialogOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(6px)",
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent — red for destructive action */}
            <div className="h-1 w-full bg-gradient-to-r from-red-400 via-red-500 to-rose-500" />

            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center flex-shrink-0">
                    <X className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                      Cancel order?
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Order #{riderCode}
                    </p>
                  </div>
                </div>
                {!cancelling && (
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                    aria-label="Close"
                  >
                    <X className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                )}
              </div>

              {/* Preparing warning */}
              {isPreparing && (
                <div className="flex items-start gap-3 px-3 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 leading-relaxed">
                    Your order may already be in preparation. Cancellation might
                    still incur a charge.
                  </p>
                </div>
              )}

              {/* Body */}
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed px-1">
                This will permanently cancel your order. This action cannot be
                undone.
              </p>

              {/* Reassurance */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                <ShieldCheck className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  If you've already paid, a refund will be processed within 3–5
                  business days.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={cancelling}
                  className="flex-1 h-12 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all disabled:opacity-50"
                >
                  Keep order
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="flex-1 h-12 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-md shadow-red-500/25 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Cancelling…
                    </>
                  ) : (
                    "Confirm cancel"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CancelDialog;
