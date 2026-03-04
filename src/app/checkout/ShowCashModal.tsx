import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, X, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";

interface IShowCashModalProps {
  setShowCashModal: React.Dispatch<React.SetStateAction<boolean>>;
}

const ShowCashModal: React.FC<IShowCashModalProps> = ({ setShowCashModal }) => {
  const onClose = () => setShowCashModal(false);

  return (
    <AnimatePresence>
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
          {/* Top accent */}
          <div className="h-1 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600" />

          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                    Cash on Delivery
                  </h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    How payment works
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>

            {/* Breakdown cards */}
            <div className="space-y-2">
              <div className="flex items-start gap-3 px-3 py-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900">
                <CreditCard className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-green-700 dark:text-green-400">
                    Paid now online
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-0.5 leading-relaxed">
                    Item subtotal + service charge are charged immediately so
                    the restaurant can start preparing your order.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 px-3 py-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900">
                <Truck className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-orange-700 dark:text-orange-400">
                    Paid on arrival
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-500 mt-0.5 leading-relaxed">
                    Delivery fee only is paid to the rider when your order
                    arrives at your door.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                <AlertCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Have the exact delivery fee ready in cash to ensure a smooth
                  handoff.
                </p>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={onClose}
              className="w-full h-12 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Got it, continue
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ShowCashModal;
