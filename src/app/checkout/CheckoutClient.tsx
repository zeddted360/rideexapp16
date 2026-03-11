"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/state/store";
import { createNotification } from "@/state/notificationSlice";
import { account, databases, validateEnv } from "@/utils/appwrite";
import { ID } from "appwrite";
import {
  OrderStatus,
  INotification,
  ICartItemFetched,
  ISelectedExtra,
  IBookedOrderFetched,
  IRestaurantFetched,
} from "../../../types/types";

import { calculateDeliveryFeeSimple } from "@/utils/deliveryFeeCalculator";
import { Loader } from "@googlemaps/js-api-loader";
import { useRouter, useSearchParams } from "next/navigation";
import { deleteOrderAsync, resetOrders } from "@/state/orderSlice";
import BranchSelector from "@/components/checkout/BranchSelector";
import UserLocationMap from "@/components/checkout/UserLocationMap";
import DeliveryOptions from "@/components/checkout/DeliveryOptions";
import OrderSummary from "@/components/checkout/OrderSummary";
import AddressSection from "@/components/checkout/AddressSection";
import PaymentMethodSelector, {
  PaymentMethod,
} from "@/components/checkout/PaymentMethodSelector";
import PlaceOrderButton from "@/components/checkout/PlaceOrderButton";
import {
  generateTimeSlots,
  formatDeliveryTime,
  getDeliveryTimeLabel,
} from "@/utils/checkoutUtils";
import { branches } from "../../../data/branches";
import { useAuth } from "@/context/authContext";
import ShowCashModal from "./ShowCashModal";
import LoadingClient from "./LoadingClient";
import OffLocationModal from "./OffLocationModal";
import { Button } from "@/components/ui/button";
import ExceededModal from "./ExceededModal";
import {
  formatNigerianPhone,
  sendOrderFeedback,
} from "@/utils/sendSmsToNumber";
import toast from "react-hot-toast";
import { useGlobalMapControl } from "@/hooks/useGlobalMapControl";
import {
  MapPin,
  AlertTriangle,
  Loader2,
  ShoppingBag,
  CheckCircle,
  Clock,
  X,
  CheckCircle2,
  ChevronRight,
  Store,
} from "lucide-react";
import Image from "next/image";
import { fileUrl } from "@/utils/appwrite";

export default function CheckoutClient() {
  const SERVICE_CHARGE = 200;
  const [selectedBranch, setSelectedBranch] = useState(1);
  const [deliveryDay, setDeliveryDay] = useState<"today" | "tomorrow">("today");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [isOrderLoading, setIsOrderLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [address, setAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(333);
  const [deliveryDistance, setDeliveryDistance] = useState("");
  const [deliveryDuration, setDeliveryDuration] = useState("");
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);
  const [tempAddress, setTempAddress] = useState("");
  const [apartmentFlat, setApartmentFlat] = useState("");
  const [label, setLabel] = useState<"Home" | "Work" | "Other">("Home");
  const [manualMode, setManualMode] = useState(false);
  const [userAddresses, setUserAddresses] = useState<string[]>([]);
  const [addressMode, setAddressMode] = useState<"select" | "add">("select");
  const [googlePlaceSelected, setGooglePlaceSelected] = useState(false);
  const [offLocationModal, setOffLocationModal] = useState<boolean>(false);
  const [selectedPlace, setSelectedPlace] =
    useState<google.maps.places.PlaceResult | null>(null);
  const [lastPickedAddress, setLastPickedAddress] = useState("");

 
  const [restaurant, setRestaurant] = useState<IRestaurantFetched | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [showMapPickConfirmation, setShowMapPickConfirmation] = useState(false);
  const [pickedMapAddress, setPickedMapAddress] = useState("");
  const [showDistanceExceededModal, setShowDistanceExceededModal] =
    useState(false);
  const [debouncedAddress, setDebouncedAddress] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const dialogAutocompleteInput = useRef<HTMLInputElement | null>(null);
  const dialogAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(
    null,
  );
  const autocompleteListenerRef = useRef<google.maps.MapsEventListener | null>(
    null,
  );
  const prevPaymentMethodRef = useRef<PaymentMethod>("card");
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get("restaurant");

  const orders = useSelector((state: RootState) => state.orders.orders) || [];

  const filteredOrders = useMemo(() => {
    if (!restaurantId) return [];
    return orders.filter((order) => order.restaurantId === restaurantId);
  }, [orders, restaurantId]);

  const hasItems = filteredOrders.length > 0;

  const subtotal = useMemo(
    () => filteredOrders.reduce((sum, item) => sum + (item.totalPrice || 0), 0),
    [filteredOrders],
  );

  const estDeliveryDisplay = useMemo(() => {
    if (isCalculatingFee) return null; // handled inline
    if (!deliveryDuration || !address.trim()) return null;
    return deliveryDuration;
  }, [isCalculatingFee, deliveryDuration, address]);

  const timeSlots = useMemo(
    () => (deliveryDay === "today" ? generateTimeSlots() : []),
    [deliveryDay],
  );
  const { googleMapsApiKey } = validateEnv();
  const effectiveDeliveryFee = paymentMethod === "cash" ? 0 : deliveryFee;
  const totalAmount = subtotal + effectiveDeliveryFee + SERVICE_CHARGE;

  const {
    isPaused: isMapPaused,
    loading: mapLoading,
    message: mapPauseMessage,
  } = useGlobalMapControl();

  const selectedBranchData = useMemo(
    () => branches.find((b) => b.id === selectedBranch),
    [selectedBranch],
  );
 
  const restaurantOriginAddress = useMemo(() => {
    if (!restaurant) return "";

    let addr = "";
    if (
      Array.isArray(restaurant.addresses) &&
      restaurant.addresses.length > 0
    ) {
      addr = restaurant.addresses[0] || "";
    }
    else if (typeof (restaurant as any).address === "string") {
      addr = (restaurant as any).address;
    }

    addr = addr.trim().replace(/,\s*$/, ""); // remove trailing comma

    if (addr && !/owerri/i.test(addr)) addr += ", Owerri, Imo";
    if (!/nigeria/i.test(addr)) addr += ", Nigeria";
    
    return addr;
  }, [restaurant]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedAddress(address), 500);
    return () => clearTimeout(timer);
  }, [address]);

  const handleError = useCallback((message: string, isConfirmError = false) => {
    if (isConfirmError) {
      setConfirmError(message);
      setTimeout(() => setConfirmError(null), 5000);
    } else {
      setError(message);
      setTimeout(() => setError(null), 5000);
    }
  }, []);

  useEffect(() => {
    if (window.google?.maps) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (pos.coords.accuracy > 1000) setOffLocationModal(true);
          setUserLocation(loc);
        },
        (err) => console.error("Geolocation error:", err),
        { enableHighAccuracy: true, maximumAge: 0 },
      );
    }
  }, []);

  const initMap = useCallback(() => {
    if (!dialogAutocompleteInput.current || !window.google?.maps) return;
    dialogAutocompleteRef.current = new window.google.maps.places.Autocomplete(
      dialogAutocompleteInput.current,
      { types: ["geocode"], componentRestrictions: { country: "ng" } },
    );
    autocompleteListenerRef.current = dialogAutocompleteRef.current.addListener(
      "place_changed",
      () => {
        const place = dialogAutocompleteRef.current?.getPlace();
        if (!place?.geometry?.location) return;
        const addr = place.formatted_address || place.name || "";
        setTempAddress(addr);
        setGooglePlaceSelected(true);
        setSelectedPlace(place);
        setLastPickedAddress(addr);
      },
    );
  }, []);

  useEffect(() => {
    if (!googleMapsApiKey) {
      handleError(
        "Google Maps API key is missing. Please enter address manually.",
      );
      setManualMode(true);
      return;
    }
    const loader = new Loader({
      apiKey: googleMapsApiKey,
      version: "weekly",
      libraries: ["places", "geometry", "marker"],
    });
    loader
      .load()
      .then(() => {
        setIsClient(true);
        if (dialogAutocompleteInput.current) initMap();
      })
      .catch(() => {
        handleError(
          "Failed to load Google Maps. Please enter address manually.",
        );
        setManualMode(true);
      });
    return () => {
      if (autocompleteListenerRef.current) {
        autocompleteListenerRef.current.remove();
        autocompleteListenerRef.current = null;
      }
      dialogAutocompleteRef.current = null;
    };
  }, [googleMapsApiKey, initMap, handleError]);

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!restaurantId) return;
      const { databaseId, restaurantsCollectionId } = validateEnv();
      try {
        const doc = (await databases.getDocument(
          databaseId,
          restaurantsCollectionId,
          restaurantId,
        )) as IRestaurantFetched;
        setRestaurant(doc);
        // setRestaurantAddresses({ [restaurantId]: doc.addresses || [] });
      } catch (err) {
        console.error(`Failed to fetch restaurant ${restaurantId}:`, err);
      }
    };
    fetchRestaurant();
  }, [restaurantId]);

  useEffect(() => {
    const calculateFee = async () => {
      if (mapLoading) {
        setIsCalculatingFee(true);
        return;
      }
      if (isMapPaused) {
        setDeliveryFee(1500);
        setDeliveryDistance("≈ 8–15 km (estimated)");
        setDeliveryDuration("30–60 min (estimated)");
        setIsCalculatingFee(false);
        return;
      }
      if (!debouncedAddress.trim() || !restaurantOriginAddress) {
        setDeliveryFee(800);
        setDeliveryDistance("");
        setDeliveryDuration("");
        return;
      }
      setIsCalculatingFee(true);
      try {
        const originStr = restaurantOriginAddress;
        if (!originStr) throw new Error("Restaurant address missing");

        const params = new URLSearchParams({
          origins: originStr,
          destinations: debouncedAddress,
          units: "metric",
         
        });
        const res = await fetch(`/api/distance-matrix?${params}`);
        const data = await res.json();

        console.log("Distance Matrix Response:", data);

        const element = data.rows?.[0]?.elements?.[0];

        if (!element || element.status !== "OK" || !element.distance) {
          throw new Error(`Geocoding failed: ${element?.status || "NO_DATA"}`);
        }

        const distanceText = element.distance.text;
        let durationText =
          element.duration_in_traffic?.text || element.duration.text;
        
        const feeResult = calculateDeliveryFeeSimple(
          element.distance.value,
          true,
        );

        if (!feeResult.isDeliverable) {
          setShowDistanceExceededModal(true);
          setDeliveryFee(0);
        } else setDeliveryFee(feeResult.deliveryFee);

        setDeliveryDistance(distanceText);
        setDeliveryDuration(durationText);
      } catch (error) {
        console.error("Fee error:", error);
        console.log("Restaurant address that failed:", restaurantOriginAddress);
        handleError("Could not calculate exact fee. Using estimate.");
        setDeliveryFee(1800);
        setDeliveryDistance("≈ 3–6 km");
        setDeliveryDuration("10–15 mins");
      } finally {
        setIsCalculatingFee(false);
      }
    };
    calculateFee();
  }, [
    debouncedAddress,
    restaurantOriginAddress,
    handleError,
    isMapPaused,
    mapLoading,
  ]);

  useEffect(() => {
    if (paymentMethod === "cash" && prevPaymentMethodRef.current !== "cash")
      setShowCashModal(true);
    prevPaymentMethodRef.current = paymentMethod;
  }, [paymentMethod]);

  const { user } = useAuth();
  const userId = user?.userId;

  useEffect(() => {
    if (user?.phoneNumber) setPhoneNumber(user.phoneNumber);
  }, [user?.phoneNumber]);

  useEffect(() => {
    if (showAddressForm) {
      (async () => {
        try {
          const userData = await account.get();
          const { databaseId, userCollectionId } = validateEnv();
          const userDoc = await databases.getDocument(
            databaseId,
            userCollectionId,
            userData.$id,
          );
          if (Array.isArray(userDoc.address)) {
            setUserAddresses(userDoc.address);
            setAddressMode(userDoc.address.length > 0 ? "select" : "add");
          } else {
            setUserAddresses([]);
            setAddressMode("add");
          }
        } catch {
          setUserAddresses([]);
          setAddressMode("add");
        }
      })();
    }
  }, [showAddressForm]);

  useEffect(() => {
    if (address === "__add_new__") setAddressMode("add");
  }, [address]);

  const handleSaveNewAddress = async (newAddress: string) => {
    try {
      if (user?.email.startsWith("guest")) {
        setAddress(newAddress);
        return;
      }
      const userData = await account.get();
      const { databaseId, userCollectionId } = validateEnv();
      const updatedAddresses = [...userAddresses, newAddress];
      await databases.updateDocument(
        databaseId,
        userCollectionId,
        userData.$id,
        { address: updatedAddresses },
      );
      setUserAddresses(updatedAddresses);
      setAddress(newAddress);
      setAddressMode("select");
      setShowAddressForm(false);
      setManualMode(false);
      setGooglePlaceSelected(false);
      setSelectedPlace(null);
    } catch (err: any) {
      handleError("Failed to save address.");
    }
  };

  const handleMapPickConfirmation = async (useIt: boolean) => {
    setShowMapPickConfirmation(false);
    if (useIt && pickedMapAddress.trim())
      await handleSaveNewAddress(pickedMapAddress);
  };

  const handleNewAddressPicked = useCallback((newAddress: string) => {
    setPickedMapAddress(newAddress);
    setShowMapPickConfirmation(true);
  }, []);

  const calculateDeliveryTime = useCallback(() => {
    const now = new Date();
    if (deliveryDay === "tomorrow") {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(12, 0, 0, 0);
      return tomorrow;
    }
    if (selectedTimeSlot === "now") return new Date(now.getTime() + 30 * 60000);
    const selectedSlot = timeSlots.find((slot) => slot.id === selectedTimeSlot);
    return selectedSlot?.end || new Date(now.getTime() + 45 * 60000);
  }, [deliveryDay, selectedTimeSlot, timeSlots]);

  const sendNotification = useCallback(
    async (orderData: any, recipient: string) => {
      try {
        const notification: INotification = {
          type:
            recipient === "admin"
              ? "admin_new_order"
              : "user_order_confirmation",
          recipient,
          userId: orderData.customerId,
          orderId: orderData.orderId,
          address: orderData.address,
          phone: orderData.phone,
          deliveryTime: orderData.deliveryTime,
          totalAmount: orderData.total,
          items: orderData.itemIds,
          deliveryDistance: orderData.deliveryDistance,
          deliveryDuration: orderData.deliveryDuration,
          deliveryFee: orderData.deliveryFee,
          selectedBranchId: orderData.selectedBranchId,
          label: orderData.label,
          status: "unread",
          createdAt: new Date().toISOString(),
        };
        await dispatch(createNotification(notification)).unwrap();
      } catch {
        handleError("Failed to send notification.");
      }
    },
    [dispatch, handleError],
  );

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      handleError("Please provide a delivery address.");
      return;
    }
    if (!phoneNumber.trim()) {
      handleError("Please provide a phone number.");
      return;
    }
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      handleError(
        "Please enter a valid phone number in E.164 format (e.g., +234XXXXXXXXX).",
      );
      return;
    }
    setShowAddressForm(false);
  };

  const handlePlaceOrder = useCallback(() => {
    if (!hasItems) {
      toast("No items in cart for this restaurant", { duration: 4000 });
      router.push("/");
    } else setShowConfirmation(true);
  }, [hasItems, router]);

  const parseDistanceKm = useCallback((distanceStr: string): number => {
    if (!distanceStr) return 0;
    const match = distanceStr.match(/(\d+(?:\.\d+)?)\s*km/);
    return parseFloat(match?.[1] || "0");
  }, []);

  const handleConfirmOrder = useCallback(async () => {
    setConfirmError(null);
    if (!address || !phoneNumber || !hasItems) {
      handleError(
        "Please add a delivery address, phone number, and items to your cart.",
        true,
      );
      return;
    }
    if (!userId) {
      handleError("Please log in to place an order.", true);
      return;
    }
    if (!isMapPaused && !mapLoading) {
      const distanceKm = parseDistanceKm(deliveryDistance);
      if (distanceKm > 18) {
        setShowConfirmation(false);
        setShowDistanceExceededModal(true);
        return;
      }
    } else if (isMapPaused) {
      toast("Note: Exact delivery fee & time will be confirmed by rider", {
        icon: "⚠️",
        duration: 6000,
      });
    }
    if (paymentMethod === "cash" && subtotal < deliveryFee) {
      handleError(
        "Order value must be at least equal to delivery fee amount.",
        true,
      );
      return;
    }
    setIsOrderLoading(true);
    setIsPlacingOrder(true);
    try {
      const orderId = ID.unique();
      const riderCode = orderId.slice(-4).toUpperCase();
      const structuredItems = filteredOrders.map((cartItem: ICartItemFetched) =>
        JSON.stringify({
          itemId: cartItem.itemId,
          quantity: cartItem.quantity || 1,
          extrasIds:
            cartItem.selectedExtras
              ?.map((extra: ISelectedExtra | string) => {
                try {
                  const parsedExtra: ISelectedExtra = JSON.parse(
                    extra as string,
                  );
                  return `${parsedExtra.extraId}_${parsedExtra.quantity}`;
                } catch (e) {
                  return null;
                }
              })
              .filter((id): id is string => id !== null) || [],
          priceAtOrder: cartItem.price,
          specialInstructions: cartItem.specialInstructions || "",
        }),
      );
      const order = {
        orderId,
        riderCode,
        itemIds: filteredOrders.map((item: ICartItemFetched) => item.itemId),
        items: structuredItems,
        paymentMethod,
        address,
        label,
        deliveryTime: getDeliveryTimeLabel(
          deliveryDay,
          selectedTimeSlot,
          timeSlots,
        ),
        createdAt: new Date().toISOString(),
        total: subtotal + deliveryFee + SERVICE_CHARGE,
        amountPaidOnline:
          paymentMethod === "cash"
            ? subtotal + SERVICE_CHARGE
            : subtotal + deliveryFee + SERVICE_CHARGE,
        amountDueOnDelivery: paymentMethod === "cash" ? deliveryFee : 0,
        status: "pending" as OrderStatus,
        phone: phoneNumber,
        customerId: userId,
        deliveryFee,
        deliveryDistance,
        deliveryDuration,
        selectedBranchId: selectedBranch,
        apartmentFlat,
      };
      const { databaseId, bookedOrdersCollectionId } = validateEnv();
      const placedOrder: IBookedOrderFetched = await databases.createDocument(
        databaseId,
        bookedOrdersCollectionId,
        orderId,
        order,
      );
      await Promise.all([
        sendNotification(order, "admin"),
        sendNotification(order, userId),
      ]);
      await Promise.all(
        filteredOrders.map((item: ICartItemFetched) =>
          dispatch(deleteOrderAsync(item.$id)),
        ),
      );
      dispatch(resetOrders());
      const customerMessage = `Yum! Order received. \nWe're confirming availability with the restaurant now.`;
      const adminMessage = `Admin Alert: Order #${riderCode} for ${user.fullName || "Customer"} (${formatNigerianPhone(phoneNumber)}) is now ${placedOrder.status.replace(/_/g, " ").toLowerCase()}.`;
      const smsResult = await sendOrderFeedback({
        number: formatNigerianPhone(phoneNumber),
        message: customerMessage,
        adminNumber: formatNigerianPhone(
          process.env.NEXT_PUBLIC_ADMIN_PHONE_NUMBER || "08023353418",
        ),
        adminMessage,
      });
      if (!smsResult.success)
        console.warn("SMS failed, but order is confirmed");
      try {
        const emailItems = filteredOrders.map((item: ICartItemFetched) => ({
          name: item.name || "Menu Item",
          quantity: item.quantity || 1,
          price: Number(item.price),
        }));
        await fetch("/api/send-admin-order-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            riderCode,
            customerName: user?.fullName || "Customer",
            customerPhone: phoneNumber,
            address,
            subtotal,
            deliveryFee: order.deliveryFee,
            serviceCharge: SERVICE_CHARGE,
            total: order.total,
            paymentMethod,
            deliveryTime: getDeliveryTimeLabel(
              deliveryDay,
              selectedTimeSlot,
              timeSlots,
            ),
            deliveryDistance: order.deliveryDistance,
            deliveryDuration: order.deliveryDuration,
            items: emailItems,
            restaurantName: restaurant?.name,
          }),
        });
      } catch (emailErr) {
        console.warn("Admin email failed but order succeeded:", emailErr);
      }
      setShowConfirmation(false);
      router.push("/order-confirmation");
    } catch (err) {
      handleError(
        `Failed to place order: ${err instanceof Error ? err.message : "Unknown error"}`,
        true,
      );
    } finally {
      setIsOrderLoading(false);
      setIsPlacingOrder(false);
    }
  }, [
    address,
    phoneNumber,
    paymentMethod,
    selectedTimeSlot,
    filteredOrders,
    hasItems,
    subtotal,
    deliveryDay,
    deliveryFee,
    deliveryDistance,
    deliveryDuration,
    selectedBranch,
    userId,
    apartmentFlat,
    label,
    dispatch,
    router,
    calculateDeliveryTime,
    formatDeliveryTime,
    parseDistanceKm,
    sendNotification,
    handleError,
    isMapPaused,
    mapLoading,
  ]);

  if (!isClient) return <LoadingClient />;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 py-8 px-3 sm:px-6 lg:px-8">
        {/* ── Paused warning banner ── */}
        <AnimatePresence>
          {isMapPaused && !mapLoading && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="max-w-6xl mx-auto mb-5"
            >
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </span>
                <p className="text-sm text-amber-800 dark:text-amber-300 font-medium flex-1">
                  Location services temporarily unavailable — please enter your
                  address manually. Delivery fee &amp; time will be confirmed by
                  our team.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-6xl mx-auto space-y-6">
          {/* ── Restaurant header card ── */}
          {restaurant && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="flex items-center gap-4 bg-white dark:bg-gray-900 rounded-2xl border border-orange-100 dark:border-gray-800 shadow-sm px-5 py-4"
            >
              {/* Logo */}
              {restaurant.logo ? (
                <div className="relative w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden ring-2 ring-orange-100 dark:ring-orange-900/40">
                  <Image
                    src={fileUrl(
                      validateEnv().restaurantBucketId,
                      restaurant.logo as string,
                    )}
                    alt={restaurant.name}
                    fill
                    className="object-cover"
                    quality={90}
                  />
                </div>
              ) : (
                <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center">
                  <Store className="w-5 h-5 text-orange-500" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                    {restaurant.name}
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                    Checkout
                  </span>
                </div>

                {/* Delivery estimate pill */}
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="w-3 h-3 text-orange-400 flex-shrink-0" />
                  {isCalculatingFee ? (
                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Calculating estimate…
                    </span>
                  ) : estDeliveryDisplay ? (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Est. delivery:{" "}
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {estDeliveryDisplay}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      Enter address to see estimate
                    </span>
                  )}
                </div>
              </div>

              {/* Item count badge */}
              {hasItems && (
                <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900">
                  <ShoppingBag className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                    {filteredOrders.length} item
                    {filteredOrders.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Empty / error states ── */}
          {!restaurantId ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-orange-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Invalid checkout link
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
                No restaurant specified. Please select items from the menu to
                proceed.
              </p>
              <Button
                onClick={() => router.push("/")}
                className="h-11 px-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-semibold text-sm border-0"
              >
                Return to home
              </Button>
            </div>
          ) : !hasItems ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Cart is empty
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
                No items in your cart for{" "}
                <span className="font-semibold">
                  {restaurant?.name || "this restaurant"}
                </span>
                . If you just placed an order, it's been submitted!
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => router.push("/order-confirmation")}
                  className="h-11 px-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold text-sm border-0 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> View confirmation
                </Button>
                <Button
                  onClick={() => router.push("/")}
                  variant="outline"
                  className="h-11 px-6 rounded-xl text-sm font-semibold"
                >
                  Continue shopping
                </Button>
              </div>
            </div>
          ) : (
            // ── Main checkout grid ──
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Left column */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-4"
              >
                <Section>
                  <BranchSelector
                    selectedBranch={selectedBranch}
                    setSelectedBranch={setSelectedBranch}
                    branches={branches}
                  />
                </Section>

                <Section>
                  {mapLoading ? (
                    <div className="h-52 flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Loading map services…
                      </p>
                    </div>
                  ) : isMapPaused ? (
                    <div className="h-52 flex flex-col items-center justify-center text-center px-6 gap-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                          Map temporarily unavailable
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 max-w-xs">
                          {mapPauseMessage ||
                            "Please enter your address manually below."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <UserLocationMap
                      userLocation={userLocation}
                      address={address}
                      onNewAddressPicked={handleNewAddressPicked}
                    />
                  )}
                </Section>

                <Section>
                  <AddressSection
                    offLocationModal={offLocationModal}
                    address={address}
                    phoneNumber={phoneNumber}
                    showAddressForm={showAddressForm}
                    setShowAddressForm={setShowAddressForm}
                    addressMode={addressMode}
                    userAddresses={userAddresses}
                    setAddress={setAddress}
                    setAddressMode={setAddressMode}
                    tempAddress={tempAddress}
                    setTempAddress={setTempAddress}
                    manualMode={manualMode}
                    setManualMode={setManualMode}
                    googlePlaceSelected={googlePlaceSelected}
                    setGooglePlaceSelected={setGooglePlaceSelected}
                    selectedPlace={selectedPlace}
                    setSelectedPlace={setSelectedPlace}
                    lastPickedAddress={lastPickedAddress}
                    setLastPickedAddress={setLastPickedAddress}
                    apartmentFlat={apartmentFlat}
                    setApartmentFlat={setApartmentFlat}
                    label={label}
                    setLabel={setLabel}
                    error={error}
                    setError={setError}
                    handleSaveNewAddress={handleSaveNewAddress}
                    handleAddAddress={handleAddAddress}
                    selectedBranch={selectedBranch}
                    branches={branches}
                  />
                </Section>

                <Section>
                  <DeliveryOptions
                    deliveryDay={deliveryDay}
                    setDeliveryDay={setDeliveryDay}
                    timeSlots={timeSlots}
                    selectedTimeSlot={selectedTimeSlot}
                    setSelectedTimeSlot={setSelectedTimeSlot}
                  />
                </Section>
              </motion.div>

              {/* Right column — sticky */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="space-y-4 lg:sticky lg:top-6 lg:self-start"
              >
                <Section elevated>
                  <OrderSummary
                    orders={filteredOrders.map((item) => ({
                      ...item,
                      price: Number(item.price),
                      totalPrice: Number(item.totalPrice),
                    }))}
                    subtotal={subtotal}
                    deliveryFee={effectiveDeliveryFee}
                    isCalculatingFee={isCalculatingFee}
                    deliveryDistance={deliveryDistance}
                    deliveryDuration={deliveryDuration}
                    paymentMethod={paymentMethod}
                    originalDeliveryFee={deliveryFee}
                  />
                </Section>

                <Section>
                  <PaymentMethodSelector
                    paymentMethod={paymentMethod}
                    setPaymentMethod={setPaymentMethod}
                  />
                </Section>

                <Section>
                  <PlaceOrderButton
                    SERVICE_CHARGE={SERVICE_CHARGE}
                    subtotal={subtotal}
                    deliveryFee={deliveryFee}
                    address={address}
                    phoneNumber={phoneNumber}
                    orders={filteredOrders}
                    isOrderLoading={isOrderLoading}
                    handlePlaceOrder={handlePlaceOrder}
                    showConfirmation={showConfirmation}
                    setShowConfirmation={setShowConfirmation}
                    handleConfirmOrder={handleConfirmOrder}
                    error={error}
                    totalAmount={totalAmount}
                    confirmError={confirmError}
                  />
                </Section>
              </motion.div>
            </div>
          )}
        </div>
      </div>

      {/* ── Map pick confirmation modal — always centered ── */}
      <AnimatePresence>
        {showMapPickConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{
              backgroundColor: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(6px)",
            }}
            onClick={() => !isOrderLoading && handleMapPickConfirmation(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-1 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600" />
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        Use this location?
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Confirm your delivery address
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleMapPickConfirmation(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>

                <div className="flex items-start gap-2 px-3 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                  <MapPin className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    {pickedMapAddress}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleMapPickConfirmation(false)}
                    className="flex-1 h-12 rounded-xl text-sm font-semibold border-gray-200 dark:border-gray-700"
                  >
                    Choose another
                  </Button>
                  <button
                    onClick={() => handleMapPickConfirmation(true)}
                    className="flex-1 h-12 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Use address
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showCashModal && <ShowCashModal setShowCashModal={setShowCashModal} />}
      {offLocationModal && (
        <OffLocationModal setOffLocationModal={setOffLocationModal} />
      )}
      {showDistanceExceededModal && (
        <ExceededModal
          deliveryDistance={deliveryDistance}
          setShowDistanceExceededModal={setShowDistanceExceededModal}
        />
      )}
    </>
  );
}

/* ── Shared section wrapper ── */
function Section({
  children,
  elevated = false,
}: {
  children: React.ReactNode;
  elevated?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white dark:bg-gray-900 p-5
      ${
        elevated
          ? "border-orange-200 dark:border-orange-900/60 shadow-md shadow-orange-100/50 dark:shadow-orange-950/30"
          : "border-gray-100 dark:border-gray-800 shadow-sm"
      }`}
    >
      {children}
    </div>
  );
}
