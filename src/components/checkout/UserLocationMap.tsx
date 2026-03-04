// @/components/checkout/UserLocationMap.tsx
import React, { useState, useEffect } from "react";
import { validateEnv } from "@/utils/appwrite";
import { useUserMap } from "@/hooks/useUserMap";
import { MapPin, Loader2, Navigation } from "lucide-react";

interface UserLocationMapProps {
  userLocation: { lat: number; lng: number } | null;
  address: string;
  onNewAddressPicked: (newAddress: string) => void;
}

const UserLocationMap: React.FC<UserLocationMapProps> = ({
  userLocation,
  address,
  onNewAddressPicked,
}) => {
  const { googleMapsApiKey } = validateEnv();
  const [mapReady, setMapReady] = useState(false);

  useUserMap(userLocation, address, googleMapsApiKey, onNewAddressPicked);

  // Delay skeleton until map div likely has tiles
  useEffect(() => {
    const t = setTimeout(() => setMapReady(true), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Your location
          </span>
        </div>
        {address && (
          <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate max-w-[55%] text-right leading-tight">
            {address}
          </span>
        )}
      </div>

      {/* Map container */}
      <div className="relative w-full h-52 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
        {/* Skeleton shimmer — shown until mapReady */}
        {!mapReady && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3
            bg-gray-100 dark:bg-gray-800 animate-pulse"
          >
            {/* Fake map grid lines */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(#9ca3af 1px, transparent 1px), linear-gradient(90deg, #9ca3af 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-white/60 dark:bg-gray-700/60 flex items-center justify-center shadow">
                <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
              </div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Loading map…
              </p>
            </div>
          </div>
        )}

        {/* Actual Google Map */}
        <div id="user-location-map" className="w-full h-full" />

        {/* Pin drop hint overlay — shown after map ready */}
        {mapReady && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-lg border border-gray-100 dark:border-gray-700">
              <MapPin className="w-3 h-3 text-orange-500" />
              <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                Drag pin to adjust location
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserLocationMap;
