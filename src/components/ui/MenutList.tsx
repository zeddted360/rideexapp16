import { listAsyncMenusItem } from "@/state/menuSlice";
import { AppDispatch, RootState } from "@/state/store";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import RestaurantCardSkeleton from "./restaurantCardSkeleton";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Button } from "./button";
import MenuCard from "./MenuCard";

// Menu List component
const MenuList = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { error, loading, menuItems } = useSelector(
    (state: RootState) => state.menuItem
  );

  useEffect(() => {
    if (loading === "idle") {
      dispatch(listAsyncMenusItem());
    }
  }, [dispatch, loading]);

  if (loading === "pending") {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-4" />
        <span className="text-gray-600 dark:text-gray-400 mt-2">
          Loading menu items...
        </span>
        <div className="flex overflow-x-auto sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
          {[...Array(4)].map((_, index) => (
            <RestaurantCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (loading === "succeeded" && menuItems.length > 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        {menuItems.map((menu, index) => (
          <MenuCard key={`${menu.$id}-${index}`} menuItem={menu} />
        ))}
      </div>
    );
  }

  if (loading === "succeeded" && menuItems.length === 0) {
    return (
      <div className="col-span-full text-center py-12">
        <Alert variant="default">
          <AlertTitle>No Menu Items</AlertTitle>
          <AlertDescription>
            No menu items available at the moment.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading === "failed") {
    return (
      <div className="col-span-full text-center py-12">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "Failed to load menu items. Please try again."}
          </AlertDescription>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              dispatch(listAsyncMenusItem());
            }}
            aria-label="Retry loading menu items"
          >
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  return null;
};

export default MenuList;
