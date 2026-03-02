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
import { Minus, Plus, ShoppingCart, X, AlertCircle } from "lucide-react";
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
  const [extraQuantities, setExtraQuantities] = useState<
    Record<string, number>
  >({});
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [allExtras, setAllExtras] = useState<(IFetchedExtras | IPackFetched)[]>(
    [],
  );
  const [extrasLoading, setExtrasLoading] = useState<
    "idle" | "pending" | "succeeded" | "failed"
  >("idle");
  const [extrasError, setExtrasError] = useState<string | null>(null);

  const maxInstructionsLength = 200;
  const { user } = useAuth();
  const userId = user?.userId;

  const isDiscountItem = item.category === "discount";
  const minOrderValue = item.minOrderValue || 0;
  const isValidQuantity = !isDiscountItem || quantity >= minOrderValue;
  const packagingRegex = /(container|pack)/i;

  // Fetch extras and packs
  useEffect(() => {
    if (isOpen && Array.isArray(item.extras) && item.extras.length > 0) {
      const fetchAllExtrasAndPacks = async () => {
        setExtrasLoading("pending");
        setExtrasError(null);
        try {
          const { databaseId, extrasCollectionId, packsCollectionId } =
            validateEnv();

          const extrasResponse = await databases.listDocuments(
            databaseId,
            extrasCollectionId,
            [Query.equal("$id", item.extras as string[])],
          );

          const packsResponse = await databases.listDocuments(
            databaseId,
            packsCollectionId,
            [Query.equal("$id", item.extras as string[])],
          );

          const combined = [
            ...(extrasResponse.documents as unknown as IFetchedExtras[]),
            ...(packsResponse.documents as unknown as IPackFetched[]),
          ];

          setAllExtras(combined);
          setExtrasLoading("succeeded");
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : "Failed to fetch extras";
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

  // Split into sizes, packaging, optional extras
  const sizeOptions = useMemo(
    () =>
      allExtras.filter(
        (e): e is IFetchedExtras =>
          "isSizeOption" in e && e.isSizeOption === true,
      ),
    [allExtras],
  );

  const packagingExtras = useMemo(
    () => allExtras.filter((e) => packagingRegex.test(e.name)),
    [allExtras],
  );

  const optionalExtras = useMemo(
    () =>
      allExtras.filter(
        (e) =>
          !packagingRegex.test(e.name) &&
          !("isSizeOption" in e && e.isSizeOption === true),
      ),
    [allExtras],
  );

  // Auto-select first size when sizes exist
  useEffect(() => {
    if (sizeOptions.length > 0 && !selectedSizeId) {
      setSelectedSizeId(sizeOptions[0].$id);
    }
  }, [sizeOptions, selectedSizeId]);

  // Price parsing & effective price (size replaces base price)
  const parsePrice = (p: string | number) =>
    typeof p === "string" ? Number(p.replace(/[₦,]/g, "")) : p;

  const itemPrice = parsePrice(item.price);
  const selectedSize = sizeOptions.find((s) => s.$id === selectedSizeId);
  const effectiveItemPrice = selectedSize
    ? parsePrice(selectedSize.price)
    : itemPrice;

  const subtotal = effectiveItemPrice * quantity;

  const extrasTotal = useMemo(() => {
    let total = 0;
    allExtras.forEach((e) => {
      const qty = extraQuantities[e.$id] || 0;
      total += parsePrice(e.price) * qty;
    });
    return total;
  }, [extraQuantities, allExtras]);

  const totalPrice = subtotal + extrasTotal;

  // Handle extra quantity change
  const handleExtraQuantityChange = (extraId: string, delta: number) => {
    setExtraQuantities((prev) => ({
      ...prev,
      [extraId]: Math.max(0, (prev[extraId] || 0) + delta),
    }));
  };

  // Auto-set packaging quantity when main quantity changes
  useEffect(() => {
    setExtraQuantities((prev) => {
      const updated = { ...prev };
      allExtras.forEach((e) => {
        if (packagingRegex.test(e.name)) {
          updated[e.$id] = quantity;
        }
      });
      return updated;
    });
  }, [quantity, allExtras]);

  // Reset everything when modal closes
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
      toast.error(
        `Minimum order quantity for this discount: ${minOrderValue}`,
        {
          duration: 4000,
          position: "top-right",
        },
      );
      return;
    }
    if (sizeOptions.length > 0 && !selectedSizeId) {
      toast.error("Please select a cup size", { position: "top-right" });
      return;
    }

    const newSelectedExtras: ISelectedExtra[] = [];

    // Normal extras
    allExtras.forEach((e) => {
      const qty = extraQuantities[e.$id] || 0;
      if (qty > 0 && !("isSizeOption" in e && e.isSizeOption)) {
        newSelectedExtras.push({ extraId: e.$id, quantity: qty });
      }
    });

    // Selected size
    if (selectedSizeId) {
      newSelectedExtras.push({ extraId: selectedSizeId, quantity: 1 });
    }

    const stringifiedNewSelectedExtras = newSelectedExtras.map((e) =>
      JSON.stringify(e),
    );

    const existingOrder = orders?.find(
      (o) => o.itemId === item.itemId && o.userId === userId,
    );

    if (existingOrder) {
      // Merge logic with size replacement
      const existingExtrasMap = new Map<string, number>();
      (existingOrder.selectedExtras || []).forEach((extraStr: any) => {
        try {
          const e: ISelectedExtra = JSON.parse(extraStr);
          existingExtrasMap.set(e.extraId, e.quantity);
        } catch {}
      });

      const isSize = (id: string) =>
        allExtras.some(
          (e) => e.$id === id && "isSizeOption" in e && e.isSizeOption,
        );

      newSelectedExtras.forEach((newE) => {
        if (isSize(newE.extraId)) {
          Array.from(existingExtrasMap.keys()).forEach((key) => {
            if (isSize(key)) existingExtrasMap.delete(key);
          });
          existingExtrasMap.set(newE.extraId, 1);
        } else {
          const curr = existingExtrasMap.get(newE.extraId) || 0;
          existingExtrasMap.set(newE.extraId, curr + newE.quantity);
        }
      });

      const mergedExtras = Array.from(existingExtrasMap.entries()).map(
        ([extraId, quantity]) => ({
          extraId,
          quantity,
        }),
      );
      const stringifiedMergedExtras = mergedExtras.map((e) =>
        JSON.stringify(e),
      );

      const newQuantity = existingOrder.quantity + quantity;
      const newSubtotal = effectiveItemPrice * newQuantity;
      let newExtrasTotal = 0;
      mergedExtras.forEach((e) => {
        const ex = allExtras.find((x) => x.$id === e.extraId);
        if (ex) newExtrasTotal += parsePrice(ex.price) * e.quantity;
      });
      const newTotalPrice = newSubtotal + newExtrasTotal;

      dispatch(
        addOrder({
          ...existingOrder,
          quantity: newQuantity,
          totalPrice: newTotalPrice,
          selectedExtras: stringifiedMergedExtras,
          specialInstructions:
            specialInstructions || existingOrder.specialInstructions,
        }),
      );

      try {
        await dispatch(
          updateOrderAsync({
            orderId: existingOrder.$id,
            orderData: {
              quantity: newQuantity,
              totalPrice: newTotalPrice,
              selectedExtras: stringifiedMergedExtras,
              specialInstructions:
                specialInstructions || existingOrder.specialInstructions,
            },
          }),
        ).unwrap();
        toast.success(`${item.name} quantity & size updated in cart!`, {
          position: "top-right",
        });
        setIsOpen(false);
      } catch {
        toast.error(`Failed to update ${item.name} in cart`, {
          position: "top-right",
        });
      }
    } else {
      // New item
      const tempId = `temp-${Date.now()}`;
      const newItem: ICartItemFetched = {
        $id: tempId,
        userId,
        itemId: item.itemId,
        image: item.image,
        name: item.name,
        category: item.category,
        price: item.price,
        quantity,
        totalPrice: Number(totalPrice),
        restaurantId: item.restaurantId,
        specialInstructions,
        status: "pending",
        source: item.source,
        selectedExtras: stringifiedNewSelectedExtras,
        minOrderValue: item.source === "discount" ? item.minOrderValue : null,
      } as any;

      dispatch(addOrder(newItem));
      toast.success(`${newItem.name} added to cart!`, {
        position: "top-right",
      });

      try {
        const { $id, ...orderData } = newItem;
        await dispatch(
          createOrderAsync({
            ...orderData,
            $id: tempId,
            source: item.source,
          } as ICartItemOrder),
        ).unwrap();
        setIsOpen(false);
      } catch {
        toast.error(`Failed to add ${newItem.name} to cart`, {
          position: "top-right",
        });
        dispatch(deleteOrder(tempId));
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className={cn(
          "sm:max-w-md md:max-w-lg lg:max-w-2xl max-h-[95vh] bg-white dark:bg-gray-900 border-0 p-0 overflow-y-auto rounded-3xl shadow-2xl",
          "animate-in fade-in-0 zoom-in-95 duration-300",
          "scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
        )}
        aria-describedby="dialog-description"
      >
        {/* Close button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 group"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
        </button>

        <DialogHeader className="sr-only">
          <DialogTitle>Add {item.name} to Cart</DialogTitle>
          <DialogDescription id="dialog-description">
            Customize your order for {item.name}. Adjust quantity and add
            special instructions.
          </DialogDescription>
        </DialogHeader>

        {/* Header Image */}
        <div className="relative w-full h-48 sm:h-64 bg-gradient-to-br from-orange-100 via-orange-50 to-red-50 dark:from-gray-800 dark:via-gray-850 dark:to-gray-900 overflow-hidden flex-shrink-0">
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
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 672px"
            quality={90}
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          <div className="absolute top-3 left-3 z-10">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm border",
                item.category === "veg"
                  ? "bg-green-500/90 text-white border-green-400"
                  : "bg-orange-500/90 text-white border-orange-400",
              )}
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              {item.category === "veg" ? "Vegetarian" : "Non-Vegetarian"}
            </span>
          </div>

          {item.category === "discount" &&
            item.discountType &&
            item.discountValue !== undefined && (
              <div className="absolute top-3 right-3 z-10">
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/90 text-white border border-red-400 shadow-lg backdrop-blur-sm">
                  {item.discountType === "percentage"
                    ? `${item.discountValue}%`
                    : `₦${item.discountValue}`}{" "}
                  Off
                </span>
              </div>
            )}

          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <h2 className="text-xl sm:text-2xl font-bold mb-1 drop-shadow-lg line-clamp-1">
              {item.name === "Jollof" ? "African Jollof" : item.name}
            </h2>
            <p className="text-xs sm:text-sm text-white/90 line-clamp-2 mb-2 drop-shadow">
              {item.description || "Delicious and freshly prepared item."}
            </p>
            <div className="flex items-center gap-4">
              <span className="text-2xl sm:text-3xl font-bold">
                ₦{itemPrice.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
          {/* ==================== QUANTITY ==================== */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                Quantity
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Select amount
              </span>
            </div>
            <div className="flex items-center justify-center gap-4 bg-gray-50 dark:bg-gray-800 rounded-2xl p-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className={cn(
                  "w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200",
                  quantity <= 1
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 active:scale-95",
                )}
              >
                <Minus className="w-5 h-5" />
              </button>
              <div className="flex flex-col items-center min-w-[60px]">
                <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {quantity}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {quantity === 1 ? "item" : "items"}
                </span>
              </div>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 active:scale-95"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            {!isValidQuantity && (
              <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-orange-800 dark:text-orange-300">
                  <AlertCircle className="w-4 h-4" />
                  Minimum order quantity for this discount: {minOrderValue}
                </div>
              </div>
            )}
          </div>

          {/* ==================== CUP SIZE (Best Practice) ==================== */}
          {sizeOptions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                  Choose Cup Size
                </h3>
                <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-medium">
                  Required
                </span>
              </div>
              <div className="space-y-3">
                {sizeOptions.map((size) => {
                  const isSelected = selectedSizeId === size.$id;
                  const sizePrice = parsePrice(size.price);
                  return (
                    <label
                      key={size.$id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all",
                        isSelected
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-900/10"
                          : "border-gray-200 dark:border-gray-700 hover:border-orange-300",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="cupSize"
                          checked={isSelected}
                          onChange={() => setSelectedSizeId(size.$id)}
                          className="w-5 h-5 accent-orange-500"
                        />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {size.name}
                          </p>
                          {size.description && (
                            <p className="text-xs text-gray-500">
                              {size.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="font-bold text-xl text-orange-600">
                        ₦{sizePrice.toLocaleString()}
                      </p>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== PACKAGING ==================== */}
          {packagingExtras.length > 0 && (
            <div>
              <div className="mb-3">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                  Takeout Container
                </h3>
              </div>
              <div className="space-y-3">
                {packagingExtras.map((extraOrPack) => {
                  const extraPrice = parsePrice(extraOrPack.price);
                  return (
                    <div
                      key={extraOrPack.$id}
                      className="inline-flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-orange-500 dark:border-orange-600 bg-white dark:bg-gray-800 shadow-sm"
                    >
                      <div className="w-5 h-5 rounded-full border-2 border-orange-500 dark:border-orange-600 bg-orange-500 dark:bg-orange-600 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                      <div className="flex flex-col">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Pack
                        </p>
                        <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                          ₦{extraPrice.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== OPTIONAL EXTRAS ==================== */}
          {optionalExtras.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                  Optional Extras
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Customize your order
                </span>
              </div>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {optionalExtras.map((extraOrPack) => {
                  const qty = extraQuantities[extraOrPack.$id] || 0;
                  const extraPrice = parsePrice(extraOrPack.price);
                  return (
                    <div
                      key={extraOrPack.$id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200",
                        qty > 0
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-900/10"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
                      )}
                    >
                      <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                        {"image" in extraOrPack && extraOrPack.image ? (
                          <Image
                            src={fileUrl(
                              validateEnv().extrasBucketId,
                              extraOrPack.image,
                            )}
                            fill
                            alt={extraOrPack.name}
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                            <span className="text-xs text-gray-500">?</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {extraOrPack.name}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {"description" in extraOrPack &&
                          extraOrPack.description
                            ? extraOrPack.description
                            : "Popular add-on"}
                        </p>
                        <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                          ₦{extraPrice.toLocaleString()} each
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleExtraQuantityChange(extraOrPack.$id, -1)
                          }
                          disabled={qty <= 0}
                          className={cn(
                            "w-8 h-8 flex items-center justify-center rounded-md transition-all",
                            qty <= 0
                              ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                              : "bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700",
                          )}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">
                          {qty}
                        </span>
                        <button
                          onClick={() =>
                            handleExtraQuantityChange(extraOrPack.$id, 1)
                          }
                          className="w-8 h-8 flex items-center justify-center rounded-md bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== SPECIAL INSTRUCTIONS ==================== */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                Special Instructions
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                Optional
              </span>
            </div>
            <div className="relative">
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="E.g., extra spicy, no onions, well done..."
                maxLength={maxInstructionsLength}
                className="w-full min-h-[80px] resize-none bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 focus:border-orange-500 dark:focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-xl p-3 text-gray-900 dark:text-gray-100 text-sm transition-all duration-200"
              />
              <div className="absolute bottom-2 right-2">
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-1 rounded-full transition-colors",
                    specialInstructions.length > maxInstructionsLength * 0.8
                      ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400",
                  )}
                >
                  {specialInstructions.length}/{maxInstructionsLength}
                </span>
              </div>
            </div>
          </div>

          {/* ==================== PRICE SUMMARY ==================== */}
          <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-3 border-2 border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Subtotal ({quantity})
              </span>
              <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                ₦{subtotal.toLocaleString()}
              </span>
            </div>
            {extrasTotal > 0 && (
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Extras & Packaging
                </span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                  ₦{extrasTotal.toLocaleString()}
                </span>
              </div>
            )}
            <div className="border-t border-orange-200 dark:border-orange-800 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Total
                </span>
                <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                  ₦{totalPrice.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* ==================== ADD TO CART BUTTON ==================== */}
          <Button
            onClick={handleAddToCart}
            disabled={
              !isValidQuantity ||
              extrasLoading === "pending" ||
              (sizeOptions.length > 0 && !selectedSizeId)
            }
            className={cn(
              "w-full py-4 text-base font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl active:scale-95 touch-manipulation group disabled:opacity-50 disabled:cursor-not-allowed",
              item.category === "veg"
                ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                : "bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 hover:from-orange-600 hover:via-orange-700 hover:to-red-600 text-white",
            )}
          >
            <span className="flex items-center justify-center gap-2">
              <ShoppingCart className="w-5 h-5 group-hover:animate-bounce" />
              <span>Add to Cart</span>
              <span className="opacity-75">•</span>
              <span className="font-extrabold">
                ₦{totalPrice.toLocaleString()}
              </span>
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddToCartModal;
