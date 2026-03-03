import React, { useEffect, useState } from "react";
import { PaymentMethod } from "./PaymentMethodSelector";
import {
  ICartItemFetched,
  IFetchedExtras,
  IPackFetched,
  ISelectedExtra,
} from "../../../types/types";
import Image from "next/image";
import { fileUrl, validateEnv, databases } from "@/utils/appwrite";
import { Query } from "appwrite";
import { Loader2, Package, Tag } from "lucide-react";

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

const SERVICE_CHARGE = 200;

const parsePrice = (p: string | number): number =>
  typeof p === "string" ? Number(p.replace(/[₦,]/g, "")) : Number(p);

// ── Per-item extra resolver ─────────────────────────────────────────────────
function useExtrasCache(orders: ICartItemFetched[]) {
  const [cache, setCache] = useState<
    Record<string, IFetchedExtras | IPackFetched>
  >({});

  useEffect(() => {
    const allIds = new Set<string>();
    orders.forEach((o) => {
      (o.selectedExtras || []).forEach((es: any) => {
        try {
          allIds.add(JSON.parse(es).extraId);
        } catch {}
      });
    });
    const toFetch = Array.from(allIds).filter((id) => !cache[id]);
    if (!toFetch.length) return;

    const { databaseId, extrasCollectionId, packsCollectionId } = validateEnv();
    Promise.all([
      databases.listDocuments(databaseId, extrasCollectionId, [
        Query.equal("$id", toFetch),
      ]),
      databases.listDocuments(databaseId, packsCollectionId, [
        Query.equal("$id", toFetch),
      ]),
    ])
      .then(([extras, packs]) => {
        const merged: Record<string, IFetchedExtras | IPackFetched> = {};
        [...extras.documents, ...packs.documents].forEach((d: any) => {
          merged[d.$id] = d;
        });
        setCache((prev) => ({ ...prev, ...merged }));
      })
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  return cache;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const getBucketId = (source: string) => {
  const env = validateEnv();
  switch (source) {
    case "featured":
      return env.featuredBucketId;
    case "popular":
      return env.popularBucketId;
    case "discount":
      return env.discountBucketId;
    case "offer":
      return env.promoOfferBucketId;
    default:
      return env.menuBucketId;
  }
};

// ── Component ────────────────────────────────────────────────────────────────
const OrderSummary: React.FC<OrderSummaryProps> = ({
  orders,
  subtotal,
  deliveryFee,
  isCalculatingFee,
  deliveryDistance,
  deliveryDuration,
  paymentMethod,
}) => {
  const total = subtotal + deliveryFee + SERVICE_CHARGE;
  const extrasCache = useExtrasCache(orders);

  return (
    <div className="space-y-5">
      {/* ── Title ── */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center shadow-sm shadow-orange-200 dark:shadow-orange-900/30">
          <Package className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
          Order Summary
        </h2>
      </div>

      {/* ── Items ── */}
      <div className="space-y-3">
        {orders.map((item, index) => {
          // Parse this item's extras
          const parsedExtras: { extraId: string; quantity: number }[] = [];
          (item.selectedExtras || []).forEach((es: any) => {
            try {
              parsedExtras.push(JSON.parse(es));
            } catch {}
          });

          // Find size option
          const sizeExtra = parsedExtras
            .map((pe) => ({ pe, doc: extrasCache[pe.extraId] }))
            .find(({ doc }) => doc && (doc as IFetchedExtras).isSizeOption);

          // Effective unit price — size price takes precedence
          const unitPrice = sizeExtra
            ? parsePrice(sizeExtra.doc!.price)
            : parsePrice(item.price);

          // Non-size, non-packaging extras for display
          const packagingRegex =
            /(container|pack|takeout|takeaway|plastic|box|bag)/i;
          const addonExtras = parsedExtras
            .map((pe) => ({ pe, doc: extrasCache[pe.extraId] }))
            .filter(
              ({ doc }) =>
                doc &&
                !(doc as IFetchedExtras).isSizeOption &&
                !packagingRegex.test(doc!.name),
            );

          const packExtras = parsedExtras
            .map((pe) => ({ pe, doc: extrasCache[pe.extraId] }))
            .filter(
              ({ doc }) =>
                doc &&
                !(doc as IFetchedExtras).isSizeOption &&
                packagingRegex.test(doc!.name),
            );

          return (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.07]"
            >
              {/* Image + qty badge */}
              <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-orange-50 dark:bg-orange-900/20">
                {item.image ? (
                  <Image
                    src={fileUrl(getBucketId(item.source || ""), item.image)}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    🍔
                  </div>
                )}
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-[#141414] shadow">
                  {item.quantity}
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate leading-snug">
                  {item.name}
                </p>

                {/* Size badge */}
                {sizeExtra && (
                  <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400">
                    {sizeExtra.doc!.name}
                  </span>
                )}

                {/* Unit price */}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  ₦{unitPrice.toLocaleString()} × {item.quantity}
                </p>

                {/* Add-on extras */}
                {addonExtras.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {addonExtras.map(({ pe, doc }) => (
                      <span
                        key={pe.extraId}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {doc!.name} ×{pe.quantity}
                      </span>
                    ))}
                  </div>
                )}

                {/* Packaging */}
                {packExtras.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {packExtras.map(({ pe, doc }) => (
                      <span
                        key={pe.extraId}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800/50"
                      >
                        {doc!.name} ×{pe.quantity}
                      </span>
                    ))}
                  </div>
                )}

                {/* Special instructions */}
                {item.specialInstructions && (
                  <p className="text-xs text-gray-400 italic mt-1.5 line-clamp-1">
                    "{item.specialInstructions}"
                  </p>
                )}
              </div>

              {/* Line total */}
              <p className="font-bold text-sm text-gray-900 dark:text-gray-100 tabular-nums shrink-0 pt-0.5">
                ₦{item.totalPrice?.toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Price breakdown ── */}
      <div className="rounded-2xl overflow-hidden border border-orange-200 dark:border-orange-500/20">
        <div className="bg-orange-50 dark:bg-orange-500/5 px-4 py-3 space-y-2.5">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Subtotal</span>
            <span className="tabular-nums">₦{subtotal.toLocaleString()}</span>
          </div>

          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Delivery fee</span>
            <span className="flex items-center gap-1.5 tabular-nums">
              {isCalculatingFee && (
                <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
              )}
              {paymentMethod === "cash" ? (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  Pay on delivery
                </span>
              ) : (
                `₦${deliveryFee.toLocaleString()}`
              )}
            </span>
          </div>

          <div className="flex justify-between text-sm text-orange-600 dark:text-orange-400 font-medium">
            <span>Service charge</span>
            <span className="tabular-nums">
              ₦{SERVICE_CHARGE.toLocaleString()}
            </span>
          </div>

          {/* Distance + duration info */}
          {(deliveryDistance || deliveryDuration) && (
            <div className="pt-1 mt-1 border-t border-orange-200 dark:border-orange-500/20 flex justify-between text-xs text-gray-400 dark:text-gray-500">
              {deliveryDistance && <span>📍 {deliveryDistance}</span>}
              {deliveryDuration && <span>⏱ {deliveryDuration}</span>}
            </div>
          )}
        </div>

        {/* Total bar */}
        <div className="bg-orange-500 px-4 py-3.5 flex justify-between items-center">
          <span className="text-white/90 font-semibold text-sm">Total</span>
          <span className="text-white font-bold text-xl tabular-nums">
            ₦{total.toLocaleString()}
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Includes ₦{SERVICE_CHARGE} platform service charge
      </p>
    </div>
  );
};

export default OrderSummary;
