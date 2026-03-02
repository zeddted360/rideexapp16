import React from "react";
import { PaymentMethod } from "./PaymentMethodSelector";
import { ICartItemFetched } from "../../../types/types";
import Image from "next/image";
import { fileUrl, validateEnv } from "@/utils/appwrite";

interface OrderSummaryProps {
  orders: ICartItemFetched[];
  subtotal: number;
  deliveryFee: number;
  isCalculatingFee: boolean;
  deliveryDistance: string;
  deliveryDuration: string;
  paymentMethod: PaymentMethod;
  originalDeliveryFee: number;
}

const SERVICE_CHARGE = 200; // Must match the one in CheckoutClient

const OrderSummary: React.FC<OrderSummaryProps> = ({
  orders,
  subtotal,
  deliveryFee,
  isCalculatingFee,
  deliveryDistance,
  deliveryDuration,
}) => {
  const total = subtotal + deliveryFee + SERVICE_CHARGE;

  return (
    <div>
      <div className="pb-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          Order Summary
        </h2>
      </div>

      <div className="space-y-5">
        {orders.map((item, index) => (
          <div
            key={index}
            className="flex justify-between items-center bg-orange-50 dark:bg-gray-800 rounded-lg px-3 py-2 shadow-sm"
          >
            <div className="flex items-center space-x-3">
              {/* ←←← NEW IMAGE + QUANTITY BADGE */}
              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-orange-100 dark:bg-gray-700 flex-shrink-0">
                {item.image ? (
                  <Image
                    src={fileUrl(
                      validateEnv().menuBucketId ||
                        validateEnv().featuredBucketId ||
                        validateEnv().popularBucketId ||
                        validateEnv().discountBucketId,
                      item.image,
                    )}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">
                    🍔
                  </div>
                )}
                {/* Quantity badge (moved here) */}
                <div className="absolute -top-1 -right-1 bg-orange-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-gray-800">
                  {item.quantity}
                </div>
              </div>

              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {item.name}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    ₦{item.price}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    each
                  </span>
                  {Array.isArray(item.selectedExtras) &&
                    item.selectedExtras?.length > 0 && (
                      <span className="px-2 py-1 bg-orange-200 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-xs font-medium rounded-full">
                        + Extras
                      </span>
                    )}
                </div>
              </div>
            </div>
            <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">
              ₦{item.totalPrice?.toLocaleString()}
            </span>
          </div>
        ))}

        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-base">
            <span>Subtotal</span>
            <span>₦{subtotal.toLocaleString()}</span>
          </div>

          <div className="flex justify-between text-base">
            <span>Delivery Fee</span>
            <span className="flex items-center gap-2">
              {isCalculatingFee && (
                <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              )}
              ₦{deliveryFee.toLocaleString()}
            </span>
          </div>

          {/* Service Charge Line */}
          <div className="flex justify-between text-base font-medium text-orange-600 dark:text-orange-400">
            <span>Service Charge</span>
            <span>₦{SERVICE_CHARGE.toLocaleString()}</span>
          </div>

          {deliveryDistance && deliveryDuration && (
            <div className="text-xs text-gray-500 bg-orange-50 dark:bg-gray-800 p-3 rounded-lg mt-3">
              <div className="flex justify-between">
                <span>Distance:</span>
                <span>{deliveryDistance}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Estimated time:</span>
                <span>{deliveryDuration}</span>
              </div>
            </div>
          )}

          <div className="border-t-2 border-orange-200 dark:border-orange-800 pt-4 mt-4">
            <div className="flex justify-between font-bold text-xl text-gray-900 dark:text-gray-100">
              <span>Total</span>
              <span>₦{total.toLocaleString()}</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Includes ₦{SERVICE_CHARGE} platform service charge
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
