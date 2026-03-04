import React, { Dispatch, FC, SetStateAction } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExceedModalProps {
  deliveryDistance: string;
  setShowDistanceExceededModal: Dispatch<SetStateAction<boolean>>;
}

const ExceededModal: FC<ExceedModalProps> = ({
  deliveryDistance,
  setShowDistanceExceededModal,
}) => {
  const onClose = () => setShowDistanceExceededModal(false);

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
          initial={{ y: 0, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 0, opacity: 0, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="bg-white dark:bg-gray-900 w-full sm:max-w-sm rounded-3xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top accent */}
          <div className="h-1 w-full bg-gradient-to-r from-red-400 via-red-500 to-orange-500" />

          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                    Outside delivery zone
                  </h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Delivery unavailable for this address
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

            {/* Distance pill */}
            {deliveryDistance && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900">
                <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-700 dark:text-red-400">
                  Detected distance:{" "}
                  <span className="font-bold">{deliveryDistance}</span>
                </p>
              </div>
            )}

            {/* Body */}
            <div className="px-1 space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                We currently deliver within{" "}
                <span className="font-semibold text-gray-800 dark:text-gray-100">
                  18 km
                </span>{" "}
                of the restaurant. Your selected address is beyond this range.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Try a different address closer to the restaurant, or contact us
                for special arrangements.
              </p>
            </div>

            {/* CTA */}
            <button
              onClick={onClose}
              className="w-full h-12 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
             OK
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ExceededModal;
