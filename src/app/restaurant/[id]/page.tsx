"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Query } from "appwrite";
import { databases, fileUrl, validateEnv } from "@/utils/appwrite";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Star,
  Clock,
  ShoppingCart,
  Loader2,
  ArrowLeft,
  Badge,
  Users,
  Clock1,
  Timer,
  TimerOff,
  Pause,
} from "lucide-react";
import { IMenuItemFetched, IRestaurantFetched } from "../../../../types/types";
import { RestaurantMenuItem } from "./RestaurantMenu";
import { getRestaurantTimesWithCountdown } from "@/utils/getRestaurantTimesWithCountdown";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/state/store";
import { getAsyncRestaurantById } from "@/state/restaurantSlice";
import { useShowCart } from "@/context/showCart";

export default function RestaurantPage() {
  const { id } = useParams();
  const decodedId = decodeURIComponent(id as string);
  const [restaurant, setRestaurant] = useState<IRestaurantFetched | null>(null);
  const [menuItems, setMenuItems] = useState<IMenuItemFetched[]>([]);
  const [activeCategory, setActiveCategory] = useState<
    "all" | "veg" | "non-veg"
  >("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);
  const dispatch = useDispatch<AppDispatch>();
   const { activeCart, setActiveCart } = useShowCart();

  useEffect(() => {
    if (!decodedId) {
      setError("Invalid restaurant ID");
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await dispatch(
          getAsyncRestaurantById(decodedId),
        ).unwrap();
        setRestaurant(result);
        const menuResponse = await databases.listDocuments(
          validateEnv().databaseId,
          validateEnv().menuItemsCollectionId,
          [
            Query.equal("restaurantId", result.$id),
            Query.equal("isApproved", true),
            Query.limit(100),
            Query.orderAsc("$createdAt"),
          ],
        );
        setMenuItems(menuResponse.documents as unknown as IMenuItemFetched[]);
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("Failed to load restaurant data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [decodedId, dispatch]);

  useEffect(() => {
    if (!restaurant) return;
    const updateCountdown = () => {
      const { isOpen, countdownToOpen } =
        getRestaurantTimesWithCountdown(restaurant);
      setCountdown(!isOpen && countdownToOpen ? countdownToOpen : null);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [restaurant]);

  const filteredMenuItems =
    activeCategory === "all"
      ? menuItems
      : menuItems.filter((item) => item.category === activeCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0e0d] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-2 border-orange-500/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-orange-400/40 animate-ping [animation-delay:200ms]" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-[0_0_60px_rgba(249,115,22,0.4)]">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          </div>
          <p className="text-orange-200/60 text-sm font-light tracking-[0.2em] uppercase">
            Fetching restaurant
          </p>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-[#0f0e0d] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <span className="text-red-400 font-bold text-2xl">!</span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-3">
            Something went wrong
          </h3>
          <p className="text-gray-400 mb-8 text-sm leading-relaxed">
            {error || "Restaurant not found"}
          </p>
          <Link href="/">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-8 font-medium">
              <ArrowLeft className="w-4 h-4 mr-2" /> Go Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const {
    isOpen: restaurantIsOpen,
    openTime,
    closeTime,
  } = getRestaurantTimesWithCountdown(restaurant);
  const isPaused = restaurant.isPaused || false;

  return (
    <div className="min-h-screen bg-[#faf9f7] dark:bg-[#0f0e0d] font-sans">
      {/* ─── HERO HEADER ─── */}
      <div className="relative overflow-hidden bg-[#1a0a00]">
        {/* Mesh background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-950 via-[#1a0a00] to-black" />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `radial-gradient(ellipse 80% 50% at 20% 110%, rgba(249,115,22,0.4) 0%, transparent 60%),
                                radial-gradient(ellipse 50% 80% at 80% -10%, rgba(234,88,12,0.3) 0%, transparent 60%)`,
            }}
          />
          {/* Noise grain overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: "256px 256px",
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 pt-8 pb-16">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-orange-300/60 hover:text-orange-200 transition-colors mb-12 text-sm tracking-wide group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            All restaurants
          </Link>

          <div className="flex flex-col lg:flex-row items-start lg:items-end gap-10">
            {/* Logo */}
            <div className="relative flex-shrink-0">
              <div
                className={`w-28 h-28 md:w-36 md:h-36 rounded-3xl overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.6)] ring-1 ring-white/10 ${isPaused ? "opacity-50 grayscale" : ""}`}
              >
                <Image
                  src={fileUrl(
                    validateEnv().restaurantBucketId,
                    restaurant.logo as string,
                  )}
                  alt={restaurant.name}
                  fill
                  className="object-cover"
                />
              </div>
              {/* Status dot */}
              <div
                className={`absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full border-2 border-[#1a0a00] ${isPaused ? "bg-yellow-400" : restaurantIsOpen ? "bg-emerald-400" : "bg-red-400"}`}
              >
                {restaurantIsOpen && !isPaused && (
                  <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                )}
              </div>
            </div>

            {/* Name & meta */}
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-orange-400/80 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full">
                  {restaurant.category}
                </span>
                {isPaused && (
                  <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-yellow-400/80 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <Pause className="w-2.5 h-2.5" /> Paused
                  </span>
                )}
              </div>

              <h1
                className="text-5xl md:text-7xl font-black text-white leading-none tracking-tight mb-6"
                style={{ textShadow: "0 4px 40px rgba(249,115,22,0.2)" }}
              >
                {restaurant.name}
              </h1>

              {/* Stat pills */}
              <div className="flex flex-wrap gap-3">
                {/* Rating */}
                <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/8 rounded-full px-4 py-2">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-white text-sm font-semibold">
                    {restaurant.rating}
                  </span>
                  <span className="text-white/30 text-xs">rating</span>
                </div>

                {/* Delivery */}
                <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/8 rounded-full px-4 py-2">
                  <Clock className="w-3.5 h-3.5 text-orange-300" />
                  <span className="text-white text-sm font-semibold">
                    {restaurant.deliveryTime}
                  </span>
                  <span className="text-white/30 text-xs">delivery</span>
                </div>

                {/* Open status */}
                <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/8 rounded-full px-4 py-2">
                  {isPaused ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-yellow-300 text-sm font-semibold">
                        Temporarily paused
                      </span>
                    </>
                  ) : restaurantIsOpen ? (
                    <>
                      <Timer className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300 text-sm font-semibold">
                        Open now
                      </span>
                      <span className="text-white/30 text-xs">
                        until {closeTime}
                      </span>
                    </>
                  ) : countdown ? (
                    <>
                      <Timer className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-amber-300 text-sm font-semibold">
                        Opens in {countdown}
                      </span>
                    </>
                  ) : (
                    <>
                      <TimerOff className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-red-300 text-sm font-semibold">
                        Closed
                      </span>
                      {openTime && (
                        <span className="text-white/30 text-xs">
                          until {openTime}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Item count */}
                <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/8 rounded-full px-4 py-2">
                  <Users className="w-3.5 h-3.5 text-orange-300/60" />
                  <span className="text-white/60 text-sm">
                    {menuItems.length} items
                  </span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="lg:pb-1">
              <Button
                asChild
                onClick={()=>{
                  setActiveCart(true);
                }}
                size="lg"
                disabled={isPaused}
                className={`rounded-2xl px-8 py-6 text-base font-bold shadow-2xl transition-all duration-300 ${
                  isPaused
                    ? "bg-gray-600/50 text-gray-400 cursor-not-allowed border border-gray-500/20"
                    : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white shadow-[0_8px_32px_rgba(249,115,22,0.35)] hover:shadow-[0_12px_40px_rgba(249,115,22,0.5)] hover:-translate-y-0.5"
                }`}
              >
                <span
                
                  className={isPaused ? "pointer-events-none" : "cursor-pointer"}
                >
                  <ShoppingCart className="w-5 h-5 mr-2.5" />
                  {isPaused ? "Unavailable" : "View Cart"}
                </span>
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
      </div>

      {/* ─── PAUSED MODAL ─── */}
      {isPaused && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/8 rounded-3xl p-10 max-w-md w-full text-center shadow-[0_32px_80px_rgba(0,0,0,0.8)]">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Pause className="w-9 h-9 text-yellow-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              Temporarily Paused
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-8">
              <span className="text-white font-medium">{restaurant.name}</span>{" "}
              is currently paused and not accepting orders. Please check back
              later.
            </p>
            <Link href="/">
              <Button className="w-full rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-5 transition-all">
                Browse Other Restaurants
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ─── MENU SECTION ─── */}
      {!isPaused && (
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-16">
          {/* Section header */}
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-orange-500 mb-2">
                What we offer
              </p>
              <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                Our Menu
              </h2>
            </div>
            {menuItems.length > 0 && (
              <span className="text-sm text-gray-400 dark:text-gray-500 hidden sm:block">
                {filteredMenuItems.length} / {menuItems.length} items
              </span>
            )}
          </div>

          {menuItems.length === 0 ? (
            <div className="text-center py-24 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
              <div className="text-5xl mb-6">🍽️</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                No items yet
              </h3>
              <p className="text-gray-500 text-sm mb-8 max-w-xs mx-auto">
                This restaurant hasn't added any menu items. Please check back
                later.
              </p>
              <Link href="/">
                <Button
                  variant="outline"
                  className="rounded-full border-orange-200 dark:border-orange-900 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                >
                  Browse Other Restaurants
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Filter tabs */}
              <div className="flex justify-center mb-12">
                <div className="inline-flex items-center bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/8 rounded-2xl p-1.5 shadow-sm gap-1">
                  {(["all", "veg", "non-veg"] as const).map((cat) => {
                    const labels: Record<string, string> = {
                      all: "All",
                      veg: "🌿 Veg",
                      "non-veg": "🍖 Non-Veg",
                    };
                    const active = activeCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 min-w-[100px] ${
                          active
                            ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-[0_4px_16px_rgba(249,115,22,0.3)]"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                        }`}
                      >
                        {labels[cat]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {filteredMenuItems.length === 0 ? (
                <div className="text-center py-24 rounded-3xl bg-white dark:bg-[#141414] border border-gray-100 dark:border-white/5">
                  <div className="text-6xl mb-6">
                    {activeCategory === "veg" ? "🌱" : "🥩"}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    No{" "}
                    {activeCategory === "veg" ? "vegetarian" : "non-vegetarian"}{" "}
                    items
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Try switching to another filter.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredMenuItems.map((item) => (
                    <RestaurantMenuItem
                      key={item.$id}
                      item={item}
                      restaurantId={restaurant.$id}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
