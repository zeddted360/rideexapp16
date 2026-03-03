"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus, ShoppingCart, X, AlertCircle, Flame, Leaf } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useShowCart } from "@/context/showCart";
import {
  ICartItemOrder,
  ICartItemFetched,
  IFetchedExtras,
  IPackFetched,
  ISelectedExtra,
} from "../../../types/types";
import {
  createOrderAsync,
  resetOrders,
  addOrder,
  deleteOrder,
  updateOrderAsync,
} from "@/state/orderSlice";
import { AppDispatch, RootState } from "@/state/store";
import { fileUrl, validateEnv } from "@/utils/appwrite";
import { databases } from "@/utils/appwrite";
import { Query } from "appwrite";
import { useAuth } from "@/context/authContext";

const AddToCartModal = () => {
  const { isOpen, setIsOpen, item } = useShowCart();
  const dispatch = useDispatch<AppDispatch>();
  const error = useSelector((state: RootState) => state.orders.error);
  const orders = useSelector((state: RootState) => state.orders.orders);

  const [quantity, setQuantity] = useState(item.quantity || 1);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [extraQuantities, setExtraQuantities] = useState<Record<string, number>>({});
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [allExtras, setAllExtras] = useState<(IFetchedExtras | IPackFetched)[]>([]);
  const [extrasLoading, setExtrasLoading] = useState<"idle" | "pending" | "succeeded" | "failed">("idle");
  const [extrasError, setExtrasError] = useState<string | null>(null);

  const maxInstructionsLength = 200;
  const { user } = useAuth();
  const userId = user?.userId;

  const isDiscountItem = item.category === "discount";
  const minOrderValue = item.minOrderValue || 0;
  const isValidQuantity = !isDiscountItem || quantity >= minOrderValue;
  const packagingRegex = /(container|pack)/i;

  useEffect(() => {
    if (isOpen && Array.isArray(item.extras) && item.extras.length > 0) {
      const fetchAllExtrasAndPacks = async () => {
        setExtrasLoading("pending");
        setExtrasError(null);
        try {
          const { databaseId, extrasCollectionId, packsCollectionId } = validateEnv();
          const extrasResponse = await databases.listDocuments(databaseId, extrasCollectionId, [Query.equal("$id", item.extras as string[])]);
          const packsResponse = await databases.listDocuments(databaseId, packsCollectionId, [Query.equal("$id", item.extras as string[])]);
          const combined = [...(extrasResponse.documents as unknown as IFetchedExtras[]), ...(packsResponse.documents as unknown as IPackFetched[])];
          setAllExtras(combined);
          setExtrasLoading("succeeded");
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Failed to fetch extras";
          setExtrasError(msg);
          setExtrasLoading("failed");
          toast.error(msg);
        }
      };
      fetchAllExtrasAndPacks();
    } else {
      setAllExtras([]);
      setExtraQuantities({});
      setSelectedSizeId(null);
    }
  }, [isOpen, item.extras]);

  const sizeOptions = useMemo(() => allExtras.filter((e): e is IFetchedExtras => "isSizeOption" in e && e.isSizeOption === true), [allExtras]);
  const packagingExtras = useMemo(() => allExtras.filter((e) => packagingRegex.test(e.name)), [allExtras]);
  const optionalExtras = useMemo(() => allExtras.filter((e) => !packagingRegex.test(e.name) && !("isSizeOption" in e && e.isSizeOption === true)), [allExtras]);

  useEffect(() => {
    if (sizeOptions.length > 0 && !selectedSizeId) setSelectedSizeId(sizeOptions[0].$id);
  }, [sizeOptions, selectedSizeId]);

  const parsePrice = (p: string | number) => typeof p === "string" ? Number(p.replace(/[₦,]/g, "")) : p;

  const itemPrice = parsePrice(item.price);
  const selectedSize = sizeOptions.find((s) => s.$id === selectedSizeId);
  const effectiveItemPrice = selectedSize ? parsePrice(selectedSize.price) : itemPrice;
  const subtotal = effectiveItemPrice * quantity;

  const extrasTotal = useMemo(() => {
    let total = 0;
    allExtras.forEach((e) => { total += parsePrice(e.price) * (extraQuantities[e.$id] || 0); });
    return total;
  }, [extraQuantities, allExtras]);

  const totalPrice = subtotal + extrasTotal;

  const handleExtraQuantityChange = (extraId: string, delta: number) => {
    setExtraQuantities((prev) => ({ ...prev, [extraId]: Math.max(0, (prev[extraId] || 0) + delta) }));
  };

  useEffect(() => {
    setExtraQuantities((prev) => {
      const updated = { ...prev };
      allExtras.forEach((e) => { if (packagingRegex.test(e.name)) updated[e.$id] = quantity; });
      return updated;
    });
  }, [quantity, allExtras]);

  useEffect(() => {
    if (!isOpen) {
      setQuantity(item.quantity || 1);
      setSpecialInstructions("");
      setExtraQuantities({});
      setSelectedSizeId(null);
      setAllExtras([]);
      setExtrasLoading("idle");
      setExtrasError(null);
      if (error) dispatch(resetOrders());
    }
  }, [isOpen, item.quantity, dispatch, error]);

  const handleAddToCart = async () => {
    if (isDiscountItem && quantity < minOrderValue) {
      toast.error(`Minimum order quantity for this discount: ${minOrderValue}`, { duration: 4000, position: "top-right" });
      return;
    }
    if (sizeOptions.length > 0 && !selectedSizeId) {
      toast.error("Please select a cup size", { position: "top-right" });
      return;
    }

    const newSelectedExtras: ISelectedExtra[] = [];
    allExtras.forEach((e) => {
      const qty = extraQuantities[e.$id] || 0;
      if (qty > 0 && !("isSizeOption" in e && e.isSizeOption)) newSelectedExtras.push({ extraId: e.$id, quantity: qty });
    });
    if (selectedSizeId) newSelectedExtras.push({ extraId: selectedSizeId, quantity: 1 });

    const stringifiedNewSelectedExtras = newSelectedExtras.map((e) => JSON.stringify(e));
    const existingOrder = orders?.find((o) => o.itemId === item.itemId && o.userId === userId);

    if (existingOrder) {
      const existingExtrasMap = new Map<string, number>();
      (existingOrder.selectedExtras || []).forEach((extraStr: any) => {
        try { const e: ISelectedExtra = JSON.parse(extraStr); existingExtrasMap.set(e.extraId, e.quantity); } catch {}
      });

      const isSize = (id: string) => allExtras.some((e) => e.$id === id && "isSizeOption" in e && e.isSizeOption);

      newSelectedExtras.forEach((newE) => {
        if (isSize(newE.extraId)) {
          Array.from(existingExtrasMap.keys()).forEach((key) => { if (isSize(key)) existingExtrasMap.delete(key); });
          existingExtrasMap.set(newE.extraId, 1);
        } else {
          existingExtrasMap.set(newE.extraId, (existingExtrasMap.get(newE.extraId) || 0) + newE.quantity);
        }
      });

      const mergedExtras = Array.from(existingExtrasMap.entries()).map(([extraId, quantity]) => ({ extraId, quantity }));
      const stringifiedMergedExtras = mergedExtras.map((e) => JSON.stringify(e));
      const newQuantity = existingOrder.quantity + quantity;
      const newSubtotal = effectiveItemPrice * newQuantity;
      let newExtrasTotal = 0;
      mergedExtras.forEach((e) => { const ex = allExtras.find((x) => x.$id === e.extraId); if (ex) newExtrasTotal += parsePrice(ex.price) * e.quantity; });
      const newTotalPrice = newSubtotal + newExtrasTotal;

      dispatch(addOrder({ ...existingOrder, quantity: newQuantity, totalPrice: newTotalPrice, selectedExtras: stringifiedMergedExtras, specialInstructions: specialInstructions || existingOrder.specialInstructions }));

      try {
        await dispatch(updateOrderAsync({ orderId: existingOrder.$id, orderData: { quantity: newQuantity, totalPrice: newTotalPrice, selectedExtras: stringifiedMergedExtras, specialInstructions: specialInstructions || existingOrder.specialInstructions } })).unwrap();
        toast.success(`${item.name} updated in cart!`, { position: "top-right" });
        setIsOpen(false);
      } catch {
        toast.error(`Failed to update ${item.name}`, { position: "top-right" });
      }
    } else {
      const tempId = `temp-${Date.now()}`;
      const newItem: ICartItemFetched = {
        $id: tempId, userId, itemId: item.itemId, image: item.image, name: item.name, category: item.category,
        price: item.price, quantity, totalPrice: Number(totalPrice), restaurantId: item.restaurantId,
        specialInstructions, status: "pending", source: item.source, selectedExtras: stringifiedNewSelectedExtras,
        minOrderValue: item.source === "discount" ? item.minOrderValue : null,
      } as any;

      dispatch(addOrder(newItem));
      toast.success(`${newItem.name} added to cart!`, { position: "top-right" });

      try {
        const { $id, ...orderData } = newItem;
        await dispatch(createOrderAsync({ ...orderData, $id: tempId, source: item.source } as ICartItemOrder)).unwrap();
        setIsOpen(false);
      } catch {
        toast.error(`Failed to add ${newItem.name} to cart`, { position: "top-right" });
        dispatch(deleteOrder(tempId));
      }
    }
  };

  const isVeg = item.category === "veg";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className={cn(
          "sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[92vh] bg-white dark:bg-[#141414] border-0 p-0 overflow-hidden rounded-3xl",
          "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
        )}
        style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Add {item.name} to Cart</DialogTitle>
          <DialogDescription>
            Customize your order for {item.name}
          </DialogDescription>
        </DialogHeader>

        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 z-50 w-9 h-9 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-md hover:bg-black/50 transition-all border border-white/20"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Hero Image */}
        <div className="relative w-full h-52 sm:h-64 overflow-hidden shrink-0">
          <Image
            src={fileUrl(
              item.source === "featured"
                ? validateEnv().featuredBucketId
                : item.source === "popular"
                  ? validateEnv().popularBucketId
                  : item.source === "discount"
                    ? validateEnv().discountBucketId
                    : item.source === "offer"
                      ? validateEnv().promoOfferBucketId
                      : validateEnv().menuBucketId,
              item.image,
            )}
            alt={item.name}
            fill
            className="object-cover scale-105"
            sizes="(max-width: 768px) 100vw, 672px"
            quality={90}
            priority
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-linear-to-t from-orange-900/20 to-transparent" />

          {/* Diet badge */}
          <div className="absolute top-4 left-4">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md border",
                isVeg
                  ? "bg-green-500/20 text-green-300 border-green-400/40"
                  : "bg-orange-500/20 text-orange-200 border-orange-400/40",
              )}
            >
              {isVeg ? (
                <Leaf className="w-3 h-3" />
              ) : (
                <Flame className="w-3 h-3" />
              )}
              {isVeg ? "Vegetarian" : "Non-Veg"}
            </span>
          </div>

          {/* Discount badge */}
          {item.category === "discount" && item.discountType && (
            <div className="absolute top-4 right-14">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-500/90 text-white border border-red-400/60 backdrop-blur-sm">
                {item.discountType === "percentage"
                  ? `${item.discountValue}%`
                  : `₦${item.discountValue}`}{" "}
                OFF
              </span>
            </div>
          )}

          {/* Item info overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-0.5 drop-shadow-lg">
              {item.name === "Jollof" ? "African Jollof" : item.name}
            </h2>
            {selectedSize && (
              <p className="text-sm text-orange-300 font-medium mb-1">
                — {selectedSize.name}
              </p>
            )}
            <div className="flex items-end justify-between">
              <p className="text-xs text-white/70 line-clamp-1 max-w-[65%]">
                {item.description || "Freshly prepared with care"}
              </p>
              <span className="text-2xl font-bold text-orange-400 tabular-nums">
                ₦{effectiveItemPrice.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div
          className="flex-1 overflow-y-auto px-5 py-5 space-y-6"
          style={{ scrollbarWidth: "none" }}
        >
          {/* ── Quantity ── */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">
                Quantity
              </p>
              {!isValidQuantity && (
                <p className="text-xs text-orange-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" /> Min. {minOrderValue}{" "}
                  required
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 bg-gray-100 dark:bg-white/5 rounded-2xl px-3 py-2 border border-gray-200 dark:border-white/10">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white dark:bg-white/10 shadow-sm border border-orange-200 dark:border-orange-500/30 text-orange-500 hover:bg-orange-50 disabled:opacity-30 transition-all"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-bold text-xl text-gray-900 dark:text-white tabular-nums">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-orange-500 hover:bg-orange-600 shadow-sm text-white transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Cup Size ── */}
          {sizeOptions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Cup Size
                </p>
                <span className="text-xs bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 px-2.5 py-1 rounded-full font-semibold border border-orange-200 dark:border-orange-500/25">
                  Required
                </span>
              </div>
              <div
                className="flex gap-2.5 overflow-x-auto pb-1 snap-x snap-mandatory"
                style={{ scrollbarWidth: "none" }}
              >
                {sizeOptions.map((size) => {
                  const isSelected = selectedSizeId === size.$id;
                  return (
                    <button
                      key={size.$id}
                      onClick={() => setSelectedSizeId(size.$id)}
                      className={cn(
                        "flex-shrink-0 snap-start flex flex-col items-center justify-center gap-1 px-5 py-3 rounded-2xl border-2 transition-all min-w-[90px]",
                        isSelected
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-500/10 shadow-md shadow-orange-100 dark:shadow-orange-900/20"
                          : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-orange-300",
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          isSelected
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-gray-500 dark:text-gray-400",
                        )}
                      >
                        {size.name}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-bold tabular-nums",
                          isSelected
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-gray-700 dark:text-gray-300",
                        )}
                      >
                        ₦{parsePrice(size.price).toLocaleString()}
                      </span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Packaging ── */}
          {packagingExtras.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Packaging
              </p>
              <div className="flex flex-wrap gap-2">
                {packagingExtras.map((e) => (
                  <div
                    key={e.$id}
                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-orange-50 dark:bg-orange-500/10 border-2 border-orange-400 dark:border-orange-500/50"
                  >
                    <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center shadow-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                        Pack × {quantity}
                      </p>
                      <p className="text-xs font-bold text-orange-600">
                        ₦{parsePrice(e.price).toLocaleString()} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Optional Extras ── */}
          {optionalExtras.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Add-ons
                </p>
                <span className="text-xs text-gray-400">Optional</span>
              </div>
              <div
                className="space-y-2.5 max-h-52 overflow-y-auto pr-0.5"
                style={{ scrollbarWidth: "none" }}
              >
                {optionalExtras.map((e) => {
                  const qty = extraQuantities[e.$id] || 0;
                  const extraPrice = parsePrice(e.price);
                  return (
                    <div
                      key={e.$id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-2xl border-2 transition-all",
                        qty > 0
                          ? "border-orange-400 bg-orange-50 dark:bg-orange-500/10"
                          : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] hover:border-orange-200",
                      )}
                    >
                      <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-gray-200 dark:bg-white/10 shrink-0">
                        {"image" in e && e.image ? (
                          <Image
                            src={fileUrl(validateEnv().extrasBucketId, e.image)}
                            fill
                            alt={e.name}
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">
                            +
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">
                          {e.name}
                        </p>
                        {"description" in e && e.description && (
                          <p className="text-xs text-gray-400 truncate">
                            {e.description}
                          </p>
                        )}
                        <p className="text-xs font-bold text-orange-500 mt-0.5">
                          +₦{extraPrice.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleExtraQuantityChange(e.$id, -1)}
                          disabled={qty <= 0}
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-all",
                            qty <= 0
                              ? "bg-gray-200 dark:bg-white/10 text-gray-400"
                              : "bg-orange-100 dark:bg-orange-500/20 text-orange-600",
                          )}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center font-bold text-sm text-gray-800 dark:text-gray-100 tabular-nums">
                          {qty}
                        </span>
                        <button
                          onClick={() => handleExtraQuantityChange(e.$id, 1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Special Instructions ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Special Instructions
              </p>
              <span className="text-xs text-gray-400">
                {specialInstructions.length}/{maxInstructionsLength}
              </span>
            </div>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="E.g., extra spicy, no onions, well done…"
              maxLength={maxInstructionsLength}
              rows={3}
              className="w-full bg-gray-50 dark:bg-white/[0.04] border-2 border-gray-200 dark:border-white/10 focus:border-orange-400 dark:focus:border-orange-500 rounded-2xl px-4 py-3 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none transition-colors resize-none"
            />
          </div>

          {/* ── Price Summary ── */}
          <div className="rounded-2xl overflow-hidden border border-orange-200 dark:border-orange-500/20">
            <div className="bg-orange-50 dark:bg-orange-500/5 px-4 py-3 space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Subtotal × {quantity}</span>
                <span className="tabular-nums">
                  ₦{subtotal.toLocaleString()}
                </span>
              </div>
              {extrasTotal > 0 && (
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Extras & Packaging</span>
                  <span className="tabular-nums">
                    ₦{extrasTotal.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            <div className="bg-orange-500 px-4 py-3 flex justify-between items-center">
              <span className="text-white/90 font-semibold text-sm">Total</span>
              <span className="text-white font-bold text-xl tabular-nums">
                ₦{totalPrice.toLocaleString()}
              </span>
            </div>
          </div>

          {/* ── CTA ── */}
          <Button
            onClick={handleAddToCart}
            disabled={
              !isValidQuantity ||
              extrasLoading === "pending" ||
              (sizeOptions.length > 0 && !selectedSizeId)
            }
            className="w-full h-14 text-base font-bold bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-2xl shadow-lg shadow-orange-200 dark:shadow-orange-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed gap-2.5"
          >
            <ShoppingCart className="w-5 h-5" />
            Add to Cart ·{" "}
            <span className="tabular-nums">₦{totalPrice.toLocaleString()}</span>
          </Button>

          <div className="h-1" />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddToCartModal;