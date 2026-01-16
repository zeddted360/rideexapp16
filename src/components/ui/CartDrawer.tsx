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
  ArrowRight,
  Package,
  CheckCircle,
  ChevronDown,
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
    (state: RootState) => state.orders
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
  // Broader regex to match AddToCartModal
  const packagingRegex = /(container|pack|takeout|takeaway|plastic|box|bag)/i;

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
            } catch (e) {
              console.error("Failed to parse extra:", extraStr, e);
            }
          });
        }
      });

      const extraIdsToFetch = Array.from(allExtraIds).filter(
        (id) => !extrasCache[id]
      );

      if (extraIdsToFetch.length === 0) return;

      try {
        const { databaseId, extrasCollectionId, packsCollectionId } =
          validateEnv();

        // Fetch from extras collection
        const extrasResponse = await databases.listDocuments(
          databaseId,
          extrasCollectionId,
          [Query.equal("$id", extraIdsToFetch)]
        );
        const fetchedExtras: IFetchedExtras[] =
          extrasResponse.documents as unknown as IFetchedExtras[];

        // Fetch from packs collection
        const packsResponse = await databases.listDocuments(
          databaseId,
          packsCollectionId,
          [Query.equal("$id", extraIdsToFetch)]
        );
        const fetchedPacks: IPackFetched[] =
          packsResponse.documents as unknown as IPackFetched[];

        // Combine them
        const newExtrasAndPacks: Record<string, IFetchedExtras | IPackFetched> =
          {};
        [...fetchedExtras, ...fetchedPacks].forEach((doc) => {
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
          [Query.equal("$id", idsToFetch)]
        );
        const fetchedRestaurants = (
          response.documents as unknown as IRestaurantFetched[]
        ).reduce((acc, doc) => {
          acc[doc.$id] = doc;
          return acc;
        }, {} as Record<string, IRestaurantFetched>);

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
      const parsePrice = (priceString: string | number): number => {
        return typeof priceString === "string"
          ? Number(priceString.replace(/[₦,]/g, ""))
          : priceString;
      };

      const itemPrice = parsePrice(order.price);
      const itemName = order.name || "";
      const requiresPlastic =
        spoonRegex.test(itemName) || soupRegex.test(itemName);

      const newSubtotal = itemPrice * newQuantity;

      let extrasTotal = 0;

      if (order.selectedExtras && Array.isArray(order.selectedExtras)) {
        order.selectedExtras.forEach((extraStr: ISelectedExtra | string) => {
          try {
            const extraObj = JSON.parse(extraStr as string);
            const extra = extrasCache[extraObj.extraId];
            if (extra) {
              const isPackaging =
                packagingRegex.test(extra.name) ||
                (requiresPlastic &&
                  extra.name.toLowerCase().includes("plastic container"));
              const effectiveQty = isPackaging
                ? newQuantity
                : extraObj.quantity;
              extrasTotal += parseFloat(extra.price as string) * effectiveQty;
            }
          } catch (e) {
            console.error(
              "Failed to parse extra for total calculation:",
              extraStr,
              e
            );
          }
        });
      }

      return newSubtotal + extrasTotal;
    },
    [extrasCache, spoonRegex, soupRegex, packagingRegex]
  );

  const handleUpdateQuantity = useCallback(
    debounce(async (order: ICartItemFetched, change: number) => {
      const isDiscountItem = order.source === "discount";
      const minOrderValue = order.minOrderValue || 0;
      const newQuantity = Math.max(0, order.quantity + change);

      if (isDiscountItem && newQuantity > 0 && newQuantity < minOrderValue) {
        toast.error(
          `Quantity cannot be less than minimum order value of ${minOrderValue} for this discounted item`,
          {
            duration: 4000,
            position: "top-right",
          }
        );
        return;
      }

      // Optimistic update
      dispatch(updateQuantity({ orderId: order.$id, change }));

      const newTotalPrice = calculateNewTotalPrice(order, newQuantity);

      // Update selectedExtras quantities for packaging items
      let updatedSelectedExtras: ISelectedExtra[] = [];
      if (order.selectedExtras && Array.isArray(order.selectedExtras)) {
        updatedSelectedExtras = order.selectedExtras
          .map((extraStr: ISelectedExtra | string) => {
            try {
              return JSON.parse(extraStr as string);
            } catch (e) {
              console.error("Failed to parse extra:", extraStr, e);
              return null;
            }
          })
          .filter((e): e is ISelectedExtra => e !== null);
      }

      if (newQuantity > 0) {
        updatedSelectedExtras = updatedSelectedExtras.map((extraObj) => {
          const extra = extrasCache[extraObj.extraId];
          if (extra) {
            const isPackaging =
              packagingRegex.test(extra.name) ||
              spoonRegex.test(order.name) ||
              soupRegex.test(order.name);
            return {
              ...extraObj,
              quantity: isPackaging ? newQuantity : extraObj.quantity,
            };
          }
          return extraObj;
        });
      }

      const stringifiedSelectedExtras = updatedSelectedExtras.map((e) =>
        JSON.stringify(e)
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
            })
          ).unwrap();
        } catch (err) {
          toast.error("Failed to update quantity");
          dispatch(updateQuantity({ orderId: order.$id, change: -change }));
        }
      }
    }, 300),
    [
      dispatch,
      calculateNewTotalPrice,
      extrasCache,
      spoonRegex,
      soupRegex,
      packagingRegex,
    ]
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
    [dispatch]
  );

  const handleClearSelection = useCallback(
    async (restaurantId: string) => {
      const group = groups[restaurantId] || [];
      for (const order of group) {
        await handleDeleteOrder(order);
      }
      toast.success("Selection cleared for restaurant");
    },
    [groups, handleDeleteOrder]
  );

  const subtotal = useMemo(
    () => orders?.reduce((sum, item) => sum + (item.totalPrice || 0), 0) || 0,
    [orders]
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
          console.error("Failed to parse extra for display:", extraStr, e);
          return null;
        }
      })
      .filter(Boolean) as (IFetchedExtras & { quantity: number })[];
  };

  const getPackagingExtras = useCallback(
    (itemExtras: (IFetchedExtras & { quantity: number })[]) => {
      return itemExtras.filter(
        (extra) =>
          packagingRegex.test(extra.name) ||
          ((spoonRegex.test(extra.name) || soupRegex.test(extra.name)) &&
            extra.name.toLowerCase().includes("plastic container"))
      );
    },
    [packagingRegex, spoonRegex, soupRegex]
  );

  const getOptionalExtras = useCallback(
    (itemExtras: (IFetchedExtras & { quantity: number })[]) => {
      return itemExtras.filter(
        (extra) =>
          !packagingRegex.test(extra.name) &&
          !(
            (spoonRegex.test(extra.name) || soupRegex.test(extra.name)) &&
            extra.name.toLowerCase().includes("plastic container")
          )
      );
    },
    [packagingRegex, spoonRegex, soupRegex]
  );

  const restrictedPaths = ["/checkout"];

  const handleCheckout = (restaurantId: string) => {
    const group = groups[restaurantId] || [];
    const groupSubtotal = group.reduce(
      (sum, item) => sum + (item.totalPrice || 0),
      0
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

  return (
    <>
      {hasActiveOrder &&
        !restrictedPaths.some((path) => pathname.includes(path)) && (
          <button
            onClick={() => setActiveCart(true)}
            className={`fixed bottom-6 right-6 z-50 group hidden md:block`}
            aria-label="View cart"
          >
            <div className="relative bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white rounded-full p-4 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110">
              <ShoppingCart className="w-6 h-6" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white animate-pulse">
                  {itemCount}
                </span>
              )}
            </div>
            <span className="absolute bottom-full right-0 mb-2 bg-gray-900 text-white text-xs px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              View Cart ({itemCount})
            </span>
          </button>
        )}

      <Drawer open={activeCart} onOpenChange={setActiveCart}>
        <DrawerContent className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-t-3xl max-w-md w-full mx-auto h-[95vh] flex flex-col border-t-4 border-orange-500">
          <DrawerHeader className="relative border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="bg-gradient-to-r from-orange-500 to-pink-500 p-2 rounded-xl">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <DrawerTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                My Cart
              </DrawerTitle>
            </div>
            <DrawerDescription className="text-sm text-gray-600 dark:text-gray-400">
              {itemCount} {itemCount === 1 ? "item" : "items"} ready for
              checkout
            </DrawerDescription>
            <DrawerClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                aria-label="Close cart"
              >
                <X className="w-5 h-5" />
              </Button>
            </DrawerClose>
          </DrawerHeader>

          <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-200 dark:border-gray-700">
            <div className="inline-flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-sm">
              <span className="w-1 h-1 bg-white rounded-full animate-pulse"></span>
              Delivery Available
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {loading && !orders?.length ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="animate-spin h-10 w-10 text-orange-500 mb-4" />
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  Loading your cart...
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-full mb-4">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <p
                  className="text-red-500 text-center font-medium"
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
                  0
                );
                const isExpanded = expanded[restaurantId] ?? true; // Default to expanded for better fit

                return (
                  <div
                    key={restaurantId}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700 overflow-hidden"
                  >
                    <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {restaurant?.logo && (
                          <div className="w-8 h-8 sm:w-10 sm:h-10 relative">
                            <Image
                              src={fileUrl(
                                validateEnv().restaurantBucketId,
                                restaurant.logo as string
                              )}
                              alt={restaurant.name}
                              className="w-full h-full object-cover rounded-full"
                              width={40}
                              height={40}
                              quality={90}
                              loading="lazy"
                            />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                            {restaurant?.name || "Unknown Restaurant"}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {groupItemCount}{" "}
                            {groupItemCount === 1 ? "item" : "items"} • ₦
                            {groupSubtotal.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => toggleExpand(restaurantId)}
                        className="flex items-center gap-1 text-sm"
                      >
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="p-3 sm:p-4 space-y-3">
                        {group.map((order) => {
                          const isDeleting = deletingItems.has(order.$id);
                          const itemExtras = getItemExtras(order);
                          const packagingExtras =
                            getPackagingExtras(itemExtras);
                          const optionalExtras = getOptionalExtras(itemExtras);
                          const isDiscountItem = order.source === "discount";
                          const minOrderValue = order.minOrderValue || 0;

                          return (
                            <div
                              key={order.$id}
                              className={cn(
                                "rounded-xl p-3 border border-gray-200 dark:border-gray-700",
                                isDeleting && "opacity-50 scale-95"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div className="relative w-16 h-16 bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-900/30 dark:to-pink-900/30 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
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
                                      order.image
                                    )}
                                    alt={order.name || "Item"}
                                    className="w-full h-full object-cover"
                                    width={64}
                                    height={64}
                                    quality={90}
                                    loading="lazy"
                                  />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1 text-sm truncate">
                                    {order.name || "Unknown Item"}
                                  </h4>
                                  <div className="space-y-0.5 text-xs">
                                    <p className="text-gray-600 dark:text-gray-400">
                                      <span className="font-medium">
                                        Unit Price:
                                      </span>{" "}
                                      ₦
                                      {(typeof order.price === "string"
                                        ? Number(
                                            order.price.replace(/[₦,]/g, "")
                                          )
                                        : order.price
                                      ).toLocaleString()}
                                    </p>

                                    {packagingExtras.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {packagingExtras.map((extra) => (
                                          <span
                                            key={extra.$id}
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xxs font-medium border border-green-200 dark:border-green-800"
                                          >
                                            <CheckCircle className="w-2 h-2" />
                                            {extra.name} x{extra.quantity}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    {optionalExtras.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {optionalExtras.map((extra) => (
                                          <span
                                            key={extra.$id}
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xxs font-medium"
                                          >
                                            <Plus className="w-2 h-2" />
                                            {extra.name} x{extra.quantity}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    <p className="font-bold text-orange-600 dark:text-orange-400">
                                      ₦{order.totalPrice.toLocaleString()}
                                    </p>
                                  </div>
                                  {order.specialInstructions && (
                                    <p className="text-xxs text-gray-500 dark:text-gray-400 mt-1 italic line-clamp-1">
                                      "{order.specialInstructions}"
                                    </p>
                                  )}
                                  {isDiscountItem &&
                                    order.quantity < minOrderValue && (
                                      <div className="mt-1 p-1 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-md text-xxs text-orange-800 dark:text-orange-300 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                        Min quantity: {minOrderValue}
                                      </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1 items-end">
                                  <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full p-0.5">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        handleUpdateQuantity(order, -1)
                                      }
                                      className="w-6 h-6 rounded-full hover:bg-white dark:hover:bg-gray-600"
                                      disabled={loading || isDeleting}
                                      aria-label={`Decrease quantity of ${order.name}`}
                                    >
                                      <Minus className="w-3 h-3" />
                                    </Button>
                                    <span className="w-6 text-center font-bold text-gray-900 dark:text-gray-100 text-xs">
                                      {order.quantity}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        handleUpdateQuantity(order, 1)
                                      }
                                      className="w-6 h-6 rounded-full hover:bg-white dark:hover:bg-gray-600"
                                      disabled={loading || isDeleting}
                                      aria-label={`Increase quantity of ${order.name}`}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteOrder(order)}
                                    className="w-6 h-6 bg-red-50 dark:bg-red-900/20 rounded-full text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800"
                                    disabled={loading || isDeleting}
                                    aria-label={`Delete ${order.name} from cart`}
                                  >
                                    {isDeleting ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3 h-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleCheckout(restaurantId)}
                          className="flex-1 h-10 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-xl text-sm"
                          disabled={
                            loading || groupItemCount === 0 || isCheckingOut
                          }
                        >
                          Checkout
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleClearSelection(restaurantId)}
                          className="flex-1 h-10 rounded-xl text-sm"
                          disabled={loading || groupItemCount === 0}
                        >
                          Clear Selection
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : null}
          </div>

          <DrawerFooter className="p-4 sm:p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 space-y-4">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-3 sm:p-4">
              <div className="flex justify-between items-center pt-3 border-t border-gray-300 dark:border-gray-500">
                <span className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Grand Total
                </span>
                <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                  ₦{subtotal.toLocaleString()}
                </span>
              </div>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Dialog open={showEmptyCartDialog} onOpenChange={setShowEmptyCartDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-900/30 dark:to-pink-900/30 rounded-full flex items-center justify-center">
              <Package className="w-8 h-8 text-orange-500" />
            </div>
            <DialogTitle className="text-2xl font-bold">
              Your Cart is Empty
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Looks like you haven't added anything yet. Start exploring our
              delicious menu!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowEmptyCartDialog(false);
                setActiveCart(false);
              }}
              className="h-12 px-6 rounded-xl"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowEmptyCartDialog(false);
                setActiveCart(false);
                router.push("/menu");
              }}
              className="h-12 px-6 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Browse Menu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMinAmountDialog} onOpenChange={setShowMinAmountDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-900/30 dark:to-pink-900/30 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
            <DialogTitle className="text-2xl font-bold">
              Minimum Order Amount Required
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Your current order total is below the minimum of ₦
              {MIN_ORDER_AMOUNT.toLocaleString()}. Please add more items to
              proceed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowMinAmountDialog(false);
              }}
              className="h-12 px-6 rounded-xl"
            >
              Continue Shopping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CartDrawer;
