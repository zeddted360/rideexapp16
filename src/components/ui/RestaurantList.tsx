"use client";
import { AppDispatch, RootState } from "@/state/store";
import { Utensils, Grid, List, Leaf, Drumstick } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import MenuItemCardSkeleton from "./MenuItemCardSkeleton";
import RestaurantCarousel from "./RestaurantCarousel";
import { IMenuItemFetched, IRestaurantFetched } from "@/../types/types";
import MenuItemCard from "./MenuItemCard";
import StickyCartBar from "./StickyCartBar";
import FullPageSkeleton from "./FullPageSkeleton";
import { fetchMenuItemsByRestaurant } from "@/state/menuSlice";
import { listAsyncRestaurants } from "@/state/restaurantSlice";
import { OutOfStockOverlay } from "../OutOfStockOverlay";
import { OutOfStockModal } from "../OutOfStockModal";
import { useSearchParams, useRouter } from "next/navigation";

const RestaurantList = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    error,
    loading: restaurantLoading,
    restaurants,
  } = useSelector((state: RootState) => state.restaurant);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // NEW: deep-link state
  const [targetItemId, setTargetItemId] = useState<string | null>(null);
  const [highlightItemId, setHighlightItemId] = useState<string | null>(null);

  const [selectedRestaurant, setSelectedRestaurant] =
    useState<IRestaurantFetched | null>(null);
  const [selectedType, setSelectedType] = useState<"all" | "veg" | "non-veg">(
    "all",
  );
  const searchParams = useSearchParams();
  const router = useRouter();

  const [showOutOfStockModal, setShowOutOfStockModal] = useState(false);
  const [selectedOutOfStockItem, setSelectedOutOfStockItem] =
    useState<IMenuItemFetched | null>(null);
  const [restaurantMenuItems, setRestaurantMenuItems] = useState<
    IMenuItemFetched[]
  >([]);
  const [localMenuLoading, setLocalMenuLoading] = useState(false);

  // Fetch restaurants and auto-select first
  useEffect(() => {
    if (restaurantLoading === "idle") {
      dispatch(listAsyncRestaurants());
    }
    if (
      restaurantLoading === "succeeded" &&
      restaurants.length > 0 &&
      !selectedRestaurant
    ) {
      setSelectedRestaurant(restaurants[0]);
    }
  }, [dispatch, restaurantLoading, restaurants, selectedRestaurant]);

  // Fetch menu items for selected restaurant
  useEffect(() => {
    if (selectedRestaurant) {
      setLocalMenuLoading(true);
      dispatch(fetchMenuItemsByRestaurant(selectedRestaurant.$id))
        .unwrap()
        .then((items) => setRestaurantMenuItems(items))
        .catch(() => setRestaurantMenuItems([]))
        .finally(() => setLocalMenuLoading(false));
    } else {
      setRestaurantMenuItems([]);
    }
  }, [selectedRestaurant, dispatch]);

  // 1. Handle deep link from search
  useEffect(() => {
    const restaurantIdParam = searchParams.get("restaurantId");
    const itemIdParam = searchParams.get("itemId");
    

    if (restaurantLoading === "succeeded" && restaurants.length > 0) {
      if (restaurantIdParam) {
        const targetRest = restaurants.find((r) => r.$id === restaurantIdParam);
        if (targetRest) {
          setSelectedRestaurant(targetRest);
          if (itemIdParam) setTargetItemId(itemIdParam);
          return;
        }
      }
      // fallback
      if (!selectedRestaurant) {
        setSelectedRestaurant(restaurants[0]);
      }
    }
  }, [restaurantLoading, restaurants, searchParams, selectedRestaurant]);

  // 2. Scroll + highlight when item is ready
  useEffect(() => {
    if (!targetItemId || restaurantMenuItems.length === 0) return;

    const itemExists = restaurantMenuItems.some((i) => i.$id === targetItemId);
    if (!itemExists) {
      setTargetItemId(null);
      return;
    }

    const scrollTimer = setTimeout(() => {
      const element = document.getElementById(`menu-item-${targetItemId}`);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        setHighlightItemId(targetItemId);

        // Auto-remove highlight + clean URL
        const highlightTimer = setTimeout(() => {
          setHighlightItemId(null);
          setTargetItemId(null);

          // Clean URL (modern pattern)
          router.replace("/menu", { scroll: false });
        }, 5000);

        return () => clearTimeout(highlightTimer);
      }
    }, 180); // tiny delay for React to render the new items

    return () => clearTimeout(scrollTimer);
  }, [targetItemId, restaurantMenuItems, router]);

  // Local shimmer on type change
  useEffect(() => {
    setLocalMenuLoading(true);
    const timeout = setTimeout(() => setLocalMenuLoading(false), 300);
    return () => clearTimeout(timeout);
  }, [selectedType]);

  if (restaurantLoading === "pending") return <FullPageSkeleton />;

  if (restaurantLoading === "failed" && error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 text-center">
        <p className="text-red-600 dark:text-red-400">Error: {error}</p>
      </div>
    );
  }

  if (restaurantLoading === "succeeded" && restaurants.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 text-center">
        <Utensils className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-2xl font-bold">No Restaurants Available</h3>
        <p className="text-gray-500 mt-2">Check back later!</p>
      </div>
    );
  }

  const approvedMenuItems = restaurantMenuItems.filter(
    (item) => item.isApproved,
  );
  const filteredMenuItems = approvedMenuItems.filter(
    (item) => selectedType === "all" || item.category === selectedType,
  );

  
  const renderMenuItem = (item: IMenuItemFetched) => (
    <div
      key={item.$id}
      id={`menu-item-${item.$id}`} // ← important for scroll
      className={`relative group transition-all duration-500 rounded-3xl overflow-hidden
        ${
          highlightItemId === item.$id
            ? "ring-4 ring-orange-500 ring-offset-4 ring-offset-gray-50 dark:ring-offset-gray-900 scale-[1.02] shadow-2xl"
            : ""
        }`}
    >
      <MenuItemCard item={item} />
      {item.isPaused && (
        <OutOfStockOverlay
          itemName={item.name || "This item"}
          className="rounded-3xl"
        />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 sm:py-12">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RestaurantCarousel
          restaurants={restaurants}
          loading={restaurantLoading}
          error={error}
          onSelectRestaurant={setSelectedRestaurant}
        />

        {/* Filters */}
        <div className="flex items-center justify-between gap-4 mb-6 overflow-x-auto">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedType("all")}
              className={`px-4 py-2 rounded-full font-semibold ${
                selectedType === "all"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedType("veg")}
              className={`px-4 py-2 rounded-full font-semibold flex items-center gap-1 ${
                selectedType === "veg"
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              <Leaf className="w-4 h-4" /> Veg
            </button>
            <button
              onClick={() => setSelectedType("non-veg")}
              className={`px-4 py-2 rounded-full font-semibold flex items-center gap-1 ${
                selectedType === "non-veg"
                  ? "bg-red-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              <Drumstick className="w-4 h-4" /> Non-Veg
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("grid")}
              className={
                viewMode === "grid" ? "text-orange-500" : "text-gray-500"
              }
            >
              <Grid className="w-6 h-6" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={
                viewMode === "list" ? "text-orange-500" : "text-gray-500"
              }
            >
              <List className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <div className="mb-32">
          {localMenuLoading ? (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "space-y-4"
              }
            >
              {[...Array(6)].map((_, i) => (
                <MenuItemCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredMenuItems.length === 0 ? (
            <p className="text-center text-gray-500 py-12">
              {selectedRestaurant
                ? "No approved items in this category."
                : "Select a restaurant to view menu"}
            </p>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMenuItems.map(renderMenuItem)}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMenuItems.map(renderMenuItem)}
            </div>
          )}
        </div>

        <StickyCartBar />
        {showOutOfStockModal && selectedOutOfStockItem && (
          <OutOfStockModal
            itemName={selectedOutOfStockItem.name || "This item"}
            onClose={() => {
              setShowOutOfStockModal(false);
              setSelectedOutOfStockItem(null);
            }}
          />
        )}
      </div>
    </div>
  );
};;;;

export default RestaurantList;
