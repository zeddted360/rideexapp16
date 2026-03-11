"use client";
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Plus,
  Trash2,
  X,
  Loader2,
  CheckCircle,
  Navigation,
  Home,
  Search,
  Map,
  PenLine,
  AlertTriangle,
} from "lucide-react";
import { account, databases, validateEnv } from "@/utils/appwrite";
import { Loader } from "@googlemaps/js-api-loader";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useGlobalMapControl } from "@/hooks/useGlobalMapControl";

/* ─────────────────────────────────────────────
   Colour tokens (mirrors checkout orange palette)
───────────────────────────────────────────── */
const C = {
  orange: "#f97316",
  orangeLight: "#fff7ed",
  orangeMid: "#ffedd5",
  orangeDark: "#ea580c",
  text: "#111827",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  white: "#ffffff",
  red: "#ef4444",
  redLight: "#fef2f2",
  amber: "#f59e0b",
  amberLight: "#fffbeb",
};

const MyAddresses = () => {
  const [addresses, setAddresses] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [apartmentFlat, setApartmentFlat] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addressMode, setAddressMode] = useState<"search" | "map" | "manual">(
    "search",
  );
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [pickedLocation, setPickedLocation] =
    useState<google.maps.LatLng | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const autocompleteInput = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const currentMarkerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(
    null,
  );
  const dragendListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  const {
    isPaused: isMapPaused,
    loading: pauseLoading,
    message: pauseMessage,
  } = useGlobalMapControl();

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      (err) => console.error("Geolocation error:", err),
      { enableHighAccuracy: true, maximumAge: 0 },
    );
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const userData = await account.get();
        const { databaseId, userCollectionId } = validateEnv();
        const userDoc = await databases.getDocument(
          databaseId,
          userCollectionId,
          userData.$id,
        );
        setAddresses(Array.isArray(userDoc.address) ? userDoc.address : []);
      } catch {
        setAddresses([]);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const { googleMapsApiKey } = validateEnv();
    if (!googleMapsApiKey) return;
    new Loader({
      apiKey: googleMapsApiKey,
      version: "weekly",
      libraries: ["places", "geometry", "marker"],
    })
      .load()
      .then(() => setMapLoaded(true));
  }, []);

  useEffect(() => {
    if (
      !mapLoaded ||
      !showAddForm ||
      addressMode !== "search" ||
      !autocompleteInput.current ||
      isMapPaused
    )
      return;
    const imoBounds = new window.google.maps.LatLngBounds(
      new window.google.maps.LatLng(4.75, 6.83),
      new window.google.maps.LatLng(5.92, 7.42),
    );
    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      autocompleteInput.current,
      {
        types: [],
        componentRestrictions: { country: "ng" },
        bounds: imoBounds,
        strictBounds: false,
      },
    );
    const listener = autocompleteRef.current.addListener(
      "place_changed",
      () => {
        const place = autocompleteRef.current?.getPlace();
        if (place?.formatted_address) {
          setNewAddress(place.formatted_address);
          if (place.geometry?.location) {
            setPickedLocation(place.geometry.location);
            setAddressMode("map");
          }
        } else if (place?.name) setNewAddress(place.name);
      },
    );
    return () => {
      if (listener) google.maps.event.removeListener(listener);
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [mapLoaded, showAddForm, addressMode, isMapPaused]);

  useEffect(() => {
    if (
      !mapLoaded ||
      !showAddForm ||
      addressMode !== "map" ||
      isMapPaused ||
      !mapRef.current
    )
      return;
    geocoderRef.current = new window.google.maps.Geocoder();
    const center =
      pickedLocation ||
      (userLocation
        ? new window.google.maps.LatLng(userLocation.lat, userLocation.lng)
        : new window.google.maps.LatLng(5.4768, 7.0308));
    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: pickedLocation || userLocation ? 15 : 10,
      mapTypeId: "roadmap" as google.maps.MapTypeId,
    });
    placesServiceRef.current = new window.google.maps.places.PlacesService(
      mapInstance.current,
    );

    if (userLocation && !pickedLocation && !currentMarkerRef.current) {
      currentMarkerRef.current = new window.google.maps.Marker({
        position: new window.google.maps.LatLng(
          userLocation.lat,
          userLocation.lng,
        ),
        map: mapInstance.current,
        title: "Your Current Location",
        icon: { url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png" },
      });
    }
    if (pickedLocation && !markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        position: pickedLocation,
        map: mapInstance.current,
        draggable: true,
        title: "Drag to adjust location",
      });
    }

    const haversineMetres = (a: google.maps.LatLng, b: google.maps.LatLng) => {
      const R = 6371000,
        toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(b.lat() - a.lat()),
        dLng = toRad(b.lng() - a.lng());
      const sin2 =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat())) *
          Math.cos(toRad(b.lat())) *
          Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(sin2));
    };
    const pickBestGeocoderResult = (results: google.maps.GeocoderResult[]) => {
      const priority = [
        "street_address",
        "premise",
        "subpremise",
        "establishment",
        "route",
      ];
      const pool = results.filter((r) => !r.types.includes("plus_code"));
      for (const type of priority) {
        const m = pool.find((r) => r.types.includes(type));
        if (m) return m.formatted_address;
      }
      return (pool[0] || results[0]).formatted_address;
    };
    const resolveAddress = (latlng: google.maps.LatLng) => {
      if (!placesServiceRef.current || !geocoderRef.current) return;
      placesServiceRef.current.nearbySearch(
        { location: latlng, radius: 40 },
        (placeResults, status) => {
          const apply = (addr: string) => {
            setNewAddress(addr);
            setPickedLocation(latlng);
          };
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            placeResults?.length
          ) {
            const closest = placeResults.reduce((b, c) => {
              const cL = c.geometry?.location,
                bL = b.geometry?.location;
              if (!cL) return b;
              if (!bL) return c;
              return haversineMetres(latlng, cL) < haversineMetres(latlng, bL)
                ? c
                : b;
            });
            const d = closest.geometry?.location
              ? haversineMetres(latlng, closest.geometry.location)
              : Infinity;
            if (d <= 40 && closest.name) {
              apply(
                [
                  closest.name,
                  ...(closest.vicinity && closest.vicinity !== closest.name
                    ? [closest.vicinity]
                    : []),
                ].join(", "),
              );
              return;
            }
          }
          geocoderRef.current!.geocode({ location: latlng }, (results, s) => {
            if (s === window.google.maps.GeocoderStatus.OK && results?.length)
              apply(pickBestGeocoderResult(results));
            else
              apply(`${latlng.lat().toFixed(6)}, ${latlng.lng().toFixed(6)}`);
          });
        },
      );
    };

    if (markerRef.current && !dragendListenerRef.current) {
      dragendListenerRef.current = google.maps.event.addListener(
        markerRef.current,
        "dragend",
        (e: google.maps.MapMouseEvent) => {
          if (e.latLng) resolveAddress(e.latLng);
        },
      );
    }
    if (!clickListenerRef.current) {
      clickListenerRef.current = google.maps.event.addListener(
        mapInstance.current,
        "click",
        (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          if (markerRef.current) {
            markerRef.current.setPosition(e.latLng);
          } else {
            markerRef.current = new window.google.maps.Marker({
              position: e.latLng,
              map: mapInstance.current,
              draggable: true,
              title: "Drag to adjust location",
            });
            dragendListenerRef.current = google.maps.event.addListener(
              markerRef.current,
              "dragend",
              (de: google.maps.MapMouseEvent) => {
                if (de.latLng) resolveAddress(de.latLng);
              },
            );
          }
          resolveAddress(e.latLng);
        },
      );
    }

    return () => {
      [clickListenerRef, dragendListenerRef].forEach((r) => {
        if (r.current) {
          google.maps.event.removeListener(r.current);
          r.current = null;
        }
      });
      [markerRef, currentMarkerRef].forEach((r) => {
        if (r.current) {
          r.current.setMap(null);
          r.current = null;
        }
      });
      if (mapInstance.current) {
        google.maps.event.clearInstanceListeners(mapInstance.current);
        mapInstance.current = null;
      }
      placesServiceRef.current = null;
    };
  }, [
    mapLoaded,
    showAddForm,
    addressMode,
    isMapPaused,
    userLocation,
    pickedLocation,
  ]);

  const resetForm = () => {
    setShowAddForm(false);
    setAddressMode("search");
    setNewAddress("");
    setApartmentFlat("");
    setPickedLocation(null);
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.trim()) return;
    setLoading(true);
    try {
      const userData = await account.get();
      const { databaseId, userCollectionId } = validateEnv();
      const fullAddress = apartmentFlat.trim()
        ? `${apartmentFlat.trim()}, ${newAddress.trim()}`
        : newAddress.trim();
      const updated = [...addresses, fullAddress];
      await databases.updateDocument(
        databaseId,
        userCollectionId,
        userData.$id,
        { address: updated },
      );
      setAddresses(updated);
      resetForm();
      toast.success("Address saved!");
    } catch {
      toast.error("Failed to add address");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (idx: number) => {
    setLoading(true);
    try {
      const userData = await account.get();
      const { databaseId, userCollectionId } = validateEnv();
      const updated = addresses.filter((_, i) => i !== idx);
      await databases.updateDocument(
        databaseId,
        userCollectionId,
        userData.$id,
        { address: updated },
      );
      setAddresses(updated);
      toast.success("Address removed");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete address");
    } finally {
      setLoading(false);
    }
  };

  const modeConfig = [
    { key: "search" as const, label: "Search", Icon: Search },
    { key: "map" as const, label: "Map", Icon: Map },
    { key: "manual" as const, label: "Manual", Icon: PenLine },
  ];

  /* ── Loading screen ── */
  if (initialLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-7 h-7 text-orange-500" />
            </motion.div>
          </div>
          <p className="text-sm font-medium text-gray-500">
            Loading your addresses…
          </p>
        </motion.div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/40 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-10 sm:py-14">
        {/* ── Page header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-200">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              My Addresses
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 ml-[52px]">
            Saved delivery locations for faster checkout
          </p>
        </motion.div>

        {/* ── Error banner ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm"
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Add button + count row ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {addresses.length} saved{" "}
              {addresses.length === 1 ? "address" : "addresses"}
            </span>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-bold shadow-md shadow-orange-200 dark:shadow-orange-950 transition-all hover:-translate-y-px"
          >
            <Plus className="w-4 h-4" /> Add address
          </button>
        </motion.div>

        {/* ── Address cards grid ── */}
        {addresses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="flex flex-col items-center justify-center py-20 rounded-3xl border-2 border-dashed border-orange-200 dark:border-orange-900 bg-orange-50/40 dark:bg-orange-950/10"
          >
            <div className="w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center mb-4">
              <Navigation className="w-7 h-7 text-orange-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">
              No addresses yet
            </h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 text-center max-w-xs">
              Add a delivery address so you can order faster without retyping
              every time.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-bold shadow-md shadow-orange-200 transition-all hover:-translate-y-px"
            >
              <Plus className="w-4 h-4" /> Add your first address
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence>
              {addresses.map((addr, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: idx * 0.04 }}
                  layout
                  className="group relative flex items-start gap-4 p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-orange-200 dark:hover:border-orange-900 transition-all duration-200"
                >
                  {/* Number badge */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900 flex items-center justify-center">
                    <span className="text-sm font-bold text-orange-500">
                      {idx + 1}
                    </span>
                  </div>

                  {/* Address text */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Home className="w-3 h-3 text-orange-400 flex-shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">
                        Delivery address
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-relaxed break-words">
                      {addr}
                    </p>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => setDeleteConfirm(idx)}
                    disabled={loading}
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════
          ADD ADDRESS MODAL
      ════════════════════════════════════════ */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={resetForm}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: "min(92vh, 680px)" }}
            >
              {/* Top accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600" />

              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">
                      Add new address
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Search, pin on map, or type manually
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetForm}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>

              <div className="h-px bg-gray-100 dark:bg-gray-800 mx-6" />

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* Paused / loading states */}
                {pauseLoading && (
                  <div className="py-16 flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                    </div>
                    <p className="text-sm text-gray-500">
                      Loading map services…
                    </p>
                  </div>
                )}

                {!pauseLoading && isMapPaused && (
                  <div className="py-10 flex flex-col items-center text-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
                      <AlertTriangle className="w-7 h-7 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                        Location unavailable
                      </h3>
                      <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                        {pauseMessage ||
                          "Map & search are temporarily down. Please try again later."}
                      </p>
                    </div>
                    <button
                      onClick={resetForm}
                      className="h-10 px-6 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                )}

                {!pauseLoading && !isMapPaused && (
                  <form onSubmit={handleAddAddress} className="space-y-5">
                    {/* Mode tabs */}
                    <div className="flex gap-2 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
                      {modeConfig.map(({ key, label, Icon }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setAddressMode(key);
                            if (key !== "map") setPickedLocation(null);
                          }}
                          className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-semibold transition-all
                            ${
                              addressMode === key
                                ? "bg-white dark:bg-gray-900 text-orange-500 shadow-sm"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Search mode */}
                    {addressMode === "search" && (
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          ref={autocompleteInput}
                          type="text"
                          value={newAddress}
                          onChange={(e) => setNewAddress(e.target.value)}
                          placeholder="Search address or place name…"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
                        />
                      </div>
                    )}

                    {/* Manual mode */}
                    {addressMode === "manual" && (
                      <div className="relative">
                        <PenLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          value={newAddress}
                          onChange={(e) => setNewAddress(e.target.value)}
                          placeholder="Street, area, city, state…"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
                        />
                      </div>
                    )}

                    {/* Map mode */}
                    {addressMode === "map" && (
                      <div className="space-y-2">
                        <div className="relative w-full h-60 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                          <div ref={mapRef} className="w-full h-full" />
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none z-10">
                            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow border border-gray-100 dark:border-gray-700">
                              <p className="text-[11px] text-gray-500 font-medium whitespace-nowrap">
                                Tap map or drag pin
                              </p>
                            </div>
                          </div>
                        </div>
                        {newAddress && (
                          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900">
                            <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                              {newAddress}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Apartment field */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                        Apartment / Flat{" "}
                        <span className="normal-case font-normal">
                          (optional)
                        </span>
                      </label>
                      <Input
                        value={apartmentFlat}
                        onChange={(e) => setApartmentFlat(e.target.value)}
                        placeholder="e.g. Flat 2B, Block A"
                        className="rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 h-11 text-sm focus:ring-orange-400"
                      />
                    </div>

                    {/* Footer actions */}
                    <div className="flex gap-3 pt-1">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="flex-1 h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading || !newAddress.trim()}
                        className="flex-1 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-bold shadow-md shadow-orange-200 dark:shadow-orange-950 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" /> Save address
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════
          DELETE CONFIRM MODAL
      ════════════════════════════════════════ */}
      <AnimatePresence>
        {deleteConfirm !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="h-1 w-full bg-gradient-to-r from-red-400 to-red-500" />
              <div className="p-6 flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                    Remove this address?
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
                    "{addresses[deleteConfirm]}"
                  </p>
                </div>
                <div className="flex gap-3 w-full pt-1">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 h-11 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Keep it
                  </button>
                  <button
                    onClick={() => handleDeleteAddress(deleteConfirm)}
                    disabled={loading}
                    className="flex-1 h-11 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-bold shadow-md shadow-red-200 dark:shadow-red-950 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" /> Remove
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyAddresses;
