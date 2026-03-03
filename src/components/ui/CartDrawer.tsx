"use client";
import React, { useEffect, useCallback, useMemo, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  X,
  Plus,
  Minus,
  Loader2,
  Trash2,
  ShoppingCart,
  AlertCircle,
  ShoppingBag,
  Package,
  CheckCircle,
  ChevronDown,
  Bike,
  UtensilsCrossed,
} from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { debounce } from "lodash";
import { cn } from "@/lib/utils";
import { useShowCart } from "@/context/showCart";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/state/store";
import {
  fetchOrdersByUserIdAsync,
  updateOrderAsync,
  deleteOrderAsync,
  updateQuantity,
  deleteOrder,
  addOrder,
} from "@/state/orderSlice";
import {
  ICartItemFetched,
  IFetchedExtras,
  IPackFetched,
  ISelectedExtra,
  IRestaurantFetched,
} from "../../../types/types";
import { fileUrl, validateEnv } from "@/utils/appwrite";
import { databases } from "@/utils/appwrite";
import { Query } from "appwrite";
import { useAuth } from "@/context/authContext";

const CartDrawer = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { error, loading, orders } = useSelector(
    (state: RootState) => state.orders,
  );
  const { activeCart, setActiveCart } = useShowCart();
  const { user } = useAuth();
  const [showEmptyCartDialog, setShowEmptyCartDialog] = useState(false);
  const [showMinAmountDialog, setShowMinAmountDialog] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());
  const [extrasCache, setExtrasCache] = useState<
    Record<string, IFetchedExtras | IPackFetched>
  >({});
  const [restaurants, setRestaurants] = useState<
    Record<string, IRestaurantFetched>
  >({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const pathname = usePathname();

  const MIN_ORDER_AMOUNT = 1000;

  const spoonRegex =
    /(rice|egg sauce|beans|porridge|pasta|spaghetti|macaroni|stew|pizza|jollof|fried rice|white rice|yam pottage|asaro)/i;
  const soupRegex =
    /(soup|egusi|ogbono|okra|efo|ewedu|gbegiri|banga|afang|pepper soup)/i;
  const packagingRegex = /(container|pack|takeout|takeaway|plastic|box|bag)/i;

  const isSizeOption = (extra: IFetchedExtras | IPackFetched): boolean => {
    return !!(extra as IFetchedExtras).isSizeOption === true;
  };

  useEffect(() => {
    if (user?.userId && !orders && !loading) {
      dispatch(fetchOrdersByUserIdAsync(user.userId))
        .unwrap()
        .catch((err) => {
          toast.error(err || "Failed to fetch orders", {
            duration: 4000,
            position: "top-right",
          });
        });
    }
  }, [dispatch, user, orders, loading]);

  useEffect(() => {
    const fetchExtrasAndPacks = async () => {
      if (!orders || orders.length === 0) return;
      const allExtraIds = new Set<string>();
      orders.forEach((order) => {
        if (order.selectedExtras && Array.isArray(order.selectedExtras)) {
          order.selectedExtras.forEach((extraStr: ISelectedExtra | string) => {
            try {
              const extraObj = JSON.parse(extraStr as string);
              allExtraIds.add(extraObj.extraId);
            } catch (e) {}
          });
        }
      });
      const extraIdsToFetch = Array.from(allExtraIds).filter(
        (id) => !extrasCache[id],
      );
      if (extraIdsToFetch.length === 0) return;
      try {
        const { databaseId, extrasCollectionId, packsCollectionId } =
          validateEnv();
        const extrasResponse = await databases.listDocuments(
          databaseId,
          extrasCollectionId,
          [Query.equal("$id", extraIdsToFetch)],
        );
        const packsResponse = await databases.listDocuments(
          databaseId,
          packsCollectionId,
          [Query.equal("$id", extraIdsToFetch)],
        );
        const newExtrasAndPacks: Record<string, IFetchedExtras | IPackFetched> =
          {};
        [
          ...(extrasResponse.documents as unknown as IFetchedExtras[]),
          ...(packsResponse.documents as unknown as IPackFetched[]),
        ].forEach((doc) => {
          newExtrasAndPacks[doc.$id] = doc;
        });
        setExtrasCache((prev) => ({ ...prev, ...newExtrasAndPacks }));
      } catch (error) {
        console.error("Failed to fetch extras and packs:", error);
      }
    };
    fetchExtrasAndPacks();
  }, [orders, extrasCache]);

  useEffect(() => {
    const fetchRestaurants = async () => {
      if (!orders || orders.length === 0) return;
      const uniqueRestaurantIds = [
        ...new Set(orders.map((o) => o.restaurantId)),
      ];
      const idsToFetch = uniqueRestaurantIds.filter((id) => !restaurants[id]);
      if (idsToFetch.length === 0) return;
      try {
        const { databaseId, restaurantsCollectionId } = validateEnv();
        const response = await databases.listDocuments(
          databaseId,
          restaurantsCollectionId,
          [Query.equal("$id", idsToFetch)],
        );
        const fetchedRestaurants = (
          response.documents as unknown as IRestaurantFetched[]
        ).reduce(
          (acc, doc) => {
            acc[doc.$id] = doc;
            return acc;
          },
          {} as Record<string, IRestaurantFetched>,
        );
        setRestaurants((prev) => ({ ...prev, ...fetchedRestaurants }));
      } catch (error) {
        console.error("Failed to fetch restaurants:", error);
        toast.error("Failed to load restaurant details");
      }
    };
    fetchRestaurants();
  }, [orders, restaurants]);

  useEffect(() => {
    if (!loading && (!orders || orders.length === 0) && activeCart) {
      setShowEmptyCartDialog(true);
    } else {
      setShowEmptyCartDialog(false);
    }
  }, [orders, loading, activeCart]);

  const groups = useMemo(() => {
    if (!orders) return {};
    return orders.reduce((acc: Record<string, ICartItemFetched[]>, order) => {
      const rid = order.restaurantId;
      if (!acc[rid]) acc[rid] = [];
      acc[rid].push(order);
      return acc;
    }, {});
  }, [orders]);

  const calculateNewTotalPrice = useCallback(
    (order: ICartItemFetched, newQuantity: number): number => {
      const parsePrice = (p: string | number): number =>
        typeof p === "string" ? Number(p.replace(/[₦,]/g, "")) : p;

      let unitPrice = parsePrice(order.price);
      if (order.selectedExtras && Array.isArray(order.selectedExtras)) {
        for (const extraStr of order.selectedExtras) {
          try {
            const extraObj: ISelectedExtra =
              typeof extraStr === "string" ? JSON.parse(extraStr) : extraStr;
            const extra = extrasCache[extraObj.extraId];
            if (extra && isSizeOption(extra)) {
              unitPrice = parsePrice(extra.price);
              break;
            }
          } catch (e) {}
        }
      }

      const newSubtotal = unitPrice * newQuantity;
      let extrasTotal = 0;

      if (order.selectedExtras && Array.isArray(order.selectedExtras)) {
        order.selectedExtras.forEach((extraStr) => {
          try {
            const extraObj: ISelectedExtra =
              typeof extraStr === "string" ? JSON.parse(extraStr) : extraStr;
            const extra = extrasCache[extraObj.extraId];
            if (!extra) return;
            if (isSizeOption(extra)) return;
            const isPackaging =
              packagingRegex.test(extra.name) ||
              (spoonRegex.test(order.name || "") &&
                extra.name.toLowerCase().includes("plastic container"));
            const effectiveQty = isPackaging ? newQuantity : extraObj.quantity;
            extrasTotal += parsePrice(extra.price) * effectiveQty;
          } catch (e) {}
        });
      }

      return Math.round(newSubtotal + extrasTotal);
    },
    [extrasCache, packagingRegex, spoonRegex],
  );

  const handleUpdateQuantity = useCallback(
    debounce(async (order: ICartItemFetched, change: number) => {
      const isDiscountItem = order.source === "discount";
      const minOrderValue = order.minOrderValue || 0;
      const newQuantity = Math.max(0, order.quantity + change);

      if (isDiscountItem && newQuantity > 0 && newQuantity < minOrderValue) {
        toast.error(
          `Quantity cannot be less than minimum order value of ${minOrderValue} for this discounted item`,
          { duration: 4000, position: "top-right" },
        );
        return;
      }

      dispatch(updateQuantity({ orderId: order.$id, change }));
      const newTotalPrice = calculateNewTotalPrice(order, newQuantity);

      let updatedSelectedExtras: ISelectedExtra[] = [];
      if (order.selectedExtras && Array.isArray(order.selectedExtras)) {
        updatedSelectedExtras = order.selectedExtras
          .map((extraStr: ISelectedExtra | string) => {
            try {
              return typeof extraStr === "string"
                ? JSON.parse(extraStr)
                : extraStr;
            } catch (e) {
              return null;
            }
          })
          .filter((e): e is ISelectedExtra => e !== null);
      }

      if (newQuantity > 0) {
        updatedSelectedExtras = updatedSelectedExtras.map((extraObj) => {
          const extra = extrasCache[extraObj.extraId];
          if (!extra) return extraObj;
          if (isSizeOption(extra)) return { ...extraObj, quantity: 1 };
          const isPackaging =
            packagingRegex.test(extra.name) ||
            (spoonRegex.test(order.name || "") &&
              extra.name.toLowerCase().includes("plastic container"));
          return {
            ...extraObj,
            quantity: isPackaging ? newQuantity : extraObj.quantity,
          };
        });
      }

      const stringifiedSelectedExtras = updatedSelectedExtras.map((e) =>
        JSON.stringify(e),
      );

      if (newQuantity === 0) {
        setDeletingItems((prev) => new Set(prev).add(order.$id));
        try {
          await dispatch(deleteOrderAsync(order.$id)).unwrap();
          toast.success("Item removed from cart");
        } catch (err) {
          toast.error("Failed to remove item");
          dispatch(updateQuantity({ orderId: order.$id, change: -change }));
        } finally {
          setDeletingItems((prev) => {
            const next = new Set(prev);
            next.delete(order.$id);
            return next;
          });
        }
      } else {
        try {
          await dispatch(
            updateOrderAsync({
              orderId: order.$id,
              orderData: {
                quantity: newQuantity,
                totalPrice: newTotalPrice,
                selectedExtras: stringifiedSelectedExtras,
              },
            }),
          ).unwrap();
        } catch (err) {
          toast.error("Failed to update quantity");
          dispatch(updateQuantity({ orderId: order.$id, change: -change }));
        }
      }
    }, 300),
    [dispatch, calculateNewTotalPrice, extrasCache, packagingRegex, spoonRegex],
  );

  const handleDeleteOrder = useCallback(
    async (order: ICartItemFetched) => {
      setDeletingItems((prev) => new Set(prev).add(order.$id));
      dispatch(deleteOrder(order.$id));
      try {
        await dispatch(deleteOrderAsync(order.$id)).unwrap();
        toast.success("Item removed from cart");
      } catch (err) {
        toast.error("Failed to delete item");
        dispatch(addOrder(order));
      } finally {
        setDeletingItems((prev) => {
          const next = new Set(prev);
          next.delete(order.$id);
          return next;
        });
      }
    },
    [dispatch],
  );

  const handleClearSelection = useCallback(
    async (restaurantId: string) => {
      const group = groups[restaurantId] || [];
      for (const order of group) {
        await handleDeleteOrder(order);
      }
      toast.success("Selection cleared for restaurant");
    },
    [groups, handleDeleteOrder],
  );

  const subtotal = useMemo(
    () => orders?.reduce((sum, item) => sum + (item.totalPrice || 0), 0) || 0,
    [orders],
  );

  const hasActiveOrder =
    Array.isArray(orders) &&
    orders.some((order) => ["pending", "processing"].includes(order.status));

  const itemCount = orders?.length || 0;

  const getItemExtras = (order: ICartItemFetched) => {
    if (!order.selectedExtras || !Array.isArray(order.selectedExtras))
      return [];
    return order.selectedExtras
      .map((extraStr: ISelectedExtra | string) => {
        try {
          const extraObj = JSON.parse(extraStr as string);
          const extra = extrasCache[extraObj.extraId];
          return extra ? { ...extra, quantity: extraObj.quantity } : null;
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean) as (IFetchedExtras & { quantity: number })[];
  };

  const getPackagingExtras = useCallback(
    (itemExtras: (IFetchedExtras & { quantity: number })[]) => {
      return itemExtras.filter(
        (extra) =>
          !isSizeOption(extra) &&
          (packagingRegex.test(extra.name) ||
            ((spoonRegex.test(extra.name) || soupRegex.test(extra.name)) &&
              extra.name.toLowerCase().includes("plastic container"))),
      );
    },
    [packagingRegex, spoonRegex, soupRegex],
  );

  const getOptionalExtras = useCallback(
    (itemExtras: (IFetchedExtras & { quantity: number })[]) => {
      return itemExtras.filter(
        (extra) =>
          !packagingRegex.test(extra.name) &&
          !(
            (spoonRegex.test(extra.name) || soupRegex.test(extra.name)) &&
            extra.name.toLowerCase().includes("plastic container")
          ),
      );
    },
    [packagingRegex, spoonRegex, soupRegex],
  );

  const restrictedPaths = ["/checkout"];

  const handleCheckout = (restaurantId: string) => {
    const group = groups[restaurantId] || [];
    const groupSubtotal = group.reduce(
      (sum, item) => sum + (item.totalPrice || 0),
      0,
    );
    if (groupSubtotal < MIN_ORDER_AMOUNT) {
      setShowMinAmountDialog(true);
      return;
    }
    setActiveCart(false);
    router.push(`/checkout?restaurant=${restaurantId}`);
  };

  const toggleExpand = (restaurantId: string) => {
    setExpanded((prev) => ({ ...prev, [restaurantId]: !prev[restaurantId] }));
  };

  const parsePrice = (p: string | number) =>
    typeof p === "string" ? Number(p.replace(/[₦,]/g, "")) : p;

  return (
    <>
      {/* Floating cart button */}
      {hasActiveOrder &&
        !restrictedPaths.some((path) => pathname.includes(path)) && (
          <button
            onClick={() => setActiveCart(true)}
            className="fixed bottom-6 right-6 z-50 group hidden md:flex items-center gap-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full px-5 py-3.5 shadow-xl shadow-orange-200 dark:shadow-orange-900/40 transition-all hover:scale-105 active:scale-95"
            aria-label="View cart"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="text-sm font-bold">Cart</span>
            {itemCount > 0 && (
              <span className="w-5 h-5 bg-white text-orange-600 text-xs font-bold rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
        )}

      <Drawer open={activeCart} onOpenChange={setActiveCart}>
        <DrawerContent className="bg-white dark:bg-[#141414] rounded-t-3xl max-w-md w-full mx-auto h-[95vh] flex flex-col border-0 outline-none [&::-webkit-scrollbar]:hidden">
          {/* ── Header ── */}
          <DrawerHeader className="relative px-5 pt-5 pb-4 border-b border-gray-100 dark:border-white/[0.07] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow-md shadow-orange-200 dark:shadow-orange-900/30">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <DrawerTitle className="text-xl font-bold text-gray-900 dark:text-white">
                  My Cart
                </DrawerTitle>
                <DrawerDescription className="text-xs text-gray-400 dark:text-gray-500">
                  {itemCount} {itemCount === 1 ? "item" : "items"} · ₦
                  {subtotal.toLocaleString()}
                </DrawerDescription>
              </div>
            </div>
            <DrawerClose asChild>
              <button className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors">
                <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            </DrawerClose>
          </DrawerHeader>

          {/* ── Delivery banner ── */}
          <div className="px-5 py-3 shrink-0">
            <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/25 rounded-2xl px-4 py-2.5">
              <Bike className="w-4 h-4 text-orange-500 shrink-0" />
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">
                Delivery available for your location
              </p>
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shrink-0" />
            </div>
          </div>

          {/* ── Scrollable items ── */}
          <div
            className="flex-1 overflow-y-auto px-5 pb-4 space-y-4"
            style={{ scrollbarWidth: "none" }}
          >
            {loading && !orders?.length ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Loader2 className="animate-spin h-9 w-9 text-orange-500" />
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  Loading your cart…
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-red-500" />
                </div>
                <p
                  className="text-sm text-red-500 text-center font-medium"
                  role="alert"
                >
                  {error}
                </p>
              </div>
            ) : orders && orders.length > 0 ? (
              Object.keys(groups).map((restaurantId) => {
                const group = groups[restaurantId];
                const restaurant = restaurants[restaurantId];
                const groupItemCount = group.length;
                const groupSubtotal = group.reduce(
                  (sum, item) => sum + (item.totalPrice || 0),
                  0,
                );
                const isExpanded = expanded[restaurantId] ?? true;

                return (
                  <div
                    key={restaurantId}
                    className="rounded-2xl overflow-hidden border border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.03]"
                  >
                    {/* Restaurant header */}
                    <button
                      onClick={() => toggleExpand(restaurantId)}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-white/[0.04] border-b border-gray-100 dark:border-white/[0.06] hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors"
                    >
                      {restaurant?.logo ? (
                        <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-gray-200 dark:border-white/10">
                          <Image
                            src={fileUrl(
                              validateEnv().restaurantBucketId,
                              restaurant.logo as string,
                            )}
                            alt={restaurant.name}
                            width={36}
                            height={36}
                            className="w-full h-full object-cover"
                            quality={90}
                          />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center shrink-0">
                          <UtensilsCrossed className="w-4 h-4 text-orange-500" />
                        </div>
                      )}
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                          {restaurant?.name || "Unknown Restaurant"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {groupItemCount}{" "}
                          {groupItemCount === 1 ? "item" : "items"} · ₦
                          {groupSubtotal.toLocaleString()}
                        </p>
                      </div>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-gray-400 transition-transform shrink-0",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </button>

                    {/* Order items */}
                    {isExpanded && (
                      <div className="p-3 space-y-2.5">
                        {group.map((order) => {
                          const isDeleting = deletingItems.has(order.$id);
                          const itemExtras = getItemExtras(order);
                          const packagingExtras =
                            getPackagingExtras(itemExtras);
                          const optionalExtras = getOptionalExtras(itemExtras);
                          const isDiscountItem = order.source === "discount";
                          const minOrderValue = order.minOrderValue || 0;

                          // Find size label for display
                          const sizeExtra = itemExtras.find((e) =>
                            isSizeOption(e),
                          );

                          return (
                            <div
                              key={order.$id}
                              className={cn(
                                "bg-white dark:bg-white/[0.05] rounded-xl p-3 border-2 border-transparent transition-all",
                                isDeleting
                                  ? "opacity-40 scale-[0.98]"
                                  : "border-gray-100 dark:border-white/[0.06]",
                              )}
                            >
                              <div className="flex items-start gap-3">
                                {/* Item image */}
                                <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-orange-50 dark:bg-orange-900/20">
                                  <Image
                                    src={fileUrl(
                                      order.source === "featured"
                                        ? validateEnv().featuredBucketId
                                        : order.source === "popular"
                                          ? validateEnv().popularBucketId
                                          : order.source === "discount"
                                            ? validateEnv().discountBucketId
                                            : order.source === "offer"
                                              ? validateEnv().promoOfferBucketId
                                              : validateEnv().menuBucketId,
                                      order.image,
                                    )}
                                    alt={order.name || "Item"}
                                    fill
                                    className="object-cover"
                                    sizes="56px"
                                    quality={85}
                                  />
                                </div>

                                {/* Item info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate leading-tight">
                                      {order.name || "Unknown Item"}
                                    </h4>
                                  </div>

                                  {/* Size badge */}
                                  {sizeExtra && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 mb-1.5">
                                      {sizeExtra.name}
                                    </span>
                                  )}

                                  {/* Unit price */}
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">
                                    ₦
                                    {(sizeExtra
                                      ? parsePrice(sizeExtra.price)
                                      : parsePrice(order.price)
                                    ).toLocaleString()}{" "}
                                    / unit
                                  </p>

                                  {/* Packaging extras */}
                                  {packagingExtras.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-1">
                                      {packagingExtras.map((extra) => (
                                        <span
                                          key={extra.$id}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs font-medium border border-green-200 dark:border-green-800/50"
                                        >
                                          <CheckCircle className="w-2.5 h-2.5" />
                                          {extra.name} ×{extra.quantity}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {/* Optional extras (non-size) */}
                                  {optionalExtras.filter(
                                    (e) => !isSizeOption(e),
                                  ).length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-1">
                                      {optionalExtras
                                        .filter((e) => !isSizeOption(e))
                                        .map((extra) => (
                                          <span
                                            key={extra.$id}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full text-xs font-medium"
                                          >
                                            <Plus className="w-2.5 h-2.5" />
                                            {extra.name} ×{extra.quantity}
                                          </span>
                                        ))}
                                    </div>
                                  )}

                                  {/* Special instructions */}
                                  {order.specialInstructions && (
                                    <p className="text-xs text-gray-400 italic mt-1 line-clamp-1">
                                      "{order.specialInstructions}"
                                    </p>
                                  )}

                                  {/* Discount min warning */}
                                  {isDiscountItem &&
                                    order.quantity < minOrderValue && (
                                      <div className="mt-1.5 flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg border border-orange-200 dark:border-orange-800/50">
                                        <AlertCircle className="w-3 h-3 shrink-0" />
                                        Min qty: {minOrderValue}
                                      </div>
                                    )}
                                </div>

                                {/* Controls */}
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                  <p className="font-bold text-sm text-orange-500 tabular-nums">
                                    ₦{order.totalPrice.toLocaleString()}
                                  </p>

                                  {/* Qty stepper */}
                                  <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/10 rounded-xl px-1.5 py-1">
                                    <button
                                      onClick={() =>
                                        handleUpdateQuantity(order, -1)
                                      }
                                      disabled={loading || isDeleting}
                                      className={cn(
                                        "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                                        order.quantity <= 1
                                          ? "bg-gray-200 dark:bg-white/10 text-gray-400"
                                          : "bg-orange-100 dark:bg-orange-500/20 text-orange-600",
                                      )}
                                      aria-label={`Decrease quantity of ${order.name}`}
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="w-5 text-center font-bold text-xs text-gray-900 dark:text-white tabular-nums">
                                      {order.quantity}
                                    </span>
                                    <button
                                      onClick={() =>
                                        handleUpdateQuantity(order, 1)
                                      }
                                      disabled={loading || isDeleting}
                                      className="w-6 h-6 rounded-lg flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white transition-all"
                                      aria-label={`Increase quantity of ${order.name}`}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>

                                  {/* Delete */}
                                  <button
                                    onClick={() => handleDeleteOrder(order)}
                                    disabled={loading || isDeleting}
                                    className="w-6 h-6 rounded-lg flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800/50 transition-all"
                                    aria-label={`Delete ${order.name} from cart`}
                                  >
                                    {isDeleting ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Per-restaurant checkout */}
                    <div className="px-3 pb-3">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleCheckout(restaurantId)}
                          disabled={
                            loading || groupItemCount === 0 || isCheckingOut
                          }
                          className="flex-1 h-10 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-sm shadow-sm shadow-orange-200 dark:shadow-orange-900/20 transition-all"
                        >
                          Checkout · ₦{groupSubtotal.toLocaleString()}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleClearSelection(restaurantId)}
                          disabled={loading || groupItemCount === 0}
                          className="h-10 px-3 rounded-xl text-sm border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : null}
          </div>

          {/* ── Footer: Grand Total ── */}
          <DrawerFooter className="px-5 pt-0 pb-5 shrink-0">
            <div className="rounded-2xl overflow-hidden border border-orange-200 dark:border-orange-500/20">
              <div className="bg-orange-50 dark:bg-orange-500/5 px-4 py-2.5 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                <span>
                  {itemCount} {itemCount === 1 ? "item" : "items"} in cart
                </span>
                <span className="tabular-nums">subtotal</span>
              </div>
              <div className="bg-orange-500 px-4 py-3.5 flex justify-between items-center">
                <span className="text-white/90 font-semibold text-sm">
                  Grand Total
                </span>
                <span className="text-white font-bold text-xl tabular-nums">
                  ₦{subtotal.toLocaleString()}
                </span>
              </div>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* ── Empty cart dialog ── */}
      <Dialog open={showEmptyCartDialog} onOpenChange={setShowEmptyCartDialog}>
        <DialogContent className="sm:max-w-sm rounded-3xl border-0 bg-white dark:bg-[#141414] p-0 overflow-hidden">
          <div className="px-6 pt-8 pb-6 text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-orange-50 dark:bg-orange-500/10 rounded-full flex items-center justify-center">
              <Package className="w-8 h-8 text-orange-500" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Your Cart is Empty
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
                You haven't added anything yet. Explore our menu and find
                something delicious!
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-6 pb-6 flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowEmptyCartDialog(false);
                setActiveCart(false);
              }}
              className="flex-1 h-11 rounded-2xl border-gray-200 dark:border-white/10"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowEmptyCartDialog(false);
                setActiveCart(false);
                router.push("/menu");
              }}
              className="flex-1 h-11 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-sm shadow-orange-200 dark:shadow-orange-900/20"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Browse Menu
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Min amount dialog ── */}
      <Dialog open={showMinAmountDialog} onOpenChange={setShowMinAmountDialog}>
        <DialogContent className="sm:max-w-sm rounded-3xl border-0 bg-white dark:bg-[#141414] p-0 overflow-hidden">
          <div className="px-6 pt-8 pb-6 text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-orange-50 dark:bg-orange-500/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Minimum Order Required
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
                Your order is below the minimum of ₦
                {MIN_ORDER_AMOUNT.toLocaleString()}. Add a few more items to
                proceed.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-6 pb-6">
            <Button
              onClick={() => setShowMinAmountDialog(false)}
              className="w-full h-11 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-sm shadow-orange-200 dark:shadow-orange-900/20"
            >
              Continue Shopping
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CartDrawer;
