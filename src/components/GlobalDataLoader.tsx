// components/GlobalDataLoader.tsx
"use client";
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/state/store';
import { listAsyncRestaurants } from '@/state/restaurantSlice';
import { listAsyncMenusItem } from "@/state/menuSlice";
// import your popular / featured fetch actions if they aren't already auto-loaded

const GlobalDataLoader = () => {
  const dispatch = useDispatch<AppDispatch>();

  const restaurantState = useSelector((state: RootState) => state.restaurant);
  const{menuItems,loading} = useSelector((state: RootState) => state.menuItem);

  useEffect(() => {
    // Restaurants
    if (restaurantState.loading === 'idle') {
      dispatch(listAsyncRestaurants());
    }

    // All menu items (for global search)
    if (menuItems.length === 0 && loading === 'idle') {
        dispatch(listAsyncMenusItem())
            .unwrap()
            .then((menu) => {
                // console.log("The menu is :", menu);
            })
            .catch((error) => {
                console.error("Failed to load menu:", error);
            });
    }

    // Add popularItems / featuredItems here too if they ever become empty
  }, [dispatch, restaurantState.loading, menuItems.length, loading]);

  return null; // completely invisible
};

export default GlobalDataLoader;