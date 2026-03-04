import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  MapPin,
  Loader2,
  Navigation,
  Home,
  Briefcase,
  MoreHorizontal,
  ChevronRight,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
} from "lucide-react";
import { useGlobalMapControl } from "@/hooks/useGlobalMapControl";
import toast from "react-hot-toast";

interface AddressSectionProps {
  offLocationModal: boolean;
  address: string;
  phoneNumber: string;
  showAddressForm: boolean;
  setShowAddressForm: (open: boolean) => void;
  addressMode: "select" | "add";
  userAddresses: string[];
  setAddress: (address: string) => void;
  setAddressMode: (mode: "select" | "add") => void;
  tempAddress: string;
  setTempAddress: (address: string) => void;
  manualMode: boolean;
  setManualMode: (mode: boolean) => void;
  googlePlaceSelected: boolean;
  setGooglePlaceSelected: (val: boolean) => void;
  selectedPlace: any;
  setSelectedPlace: (place: any) => void;
  lastPickedAddress: string;
  setLastPickedAddress: (val: string) => void;
  apartmentFlat: string;
  setApartmentFlat: (val: string) => void;
  label: "Home" | "Work" | "Other";
  setLabel: (val: "Home" | "Work" | "Other") => void;
  error: string | null;
  setError: (err: string | null) => void;
  handleSaveNewAddress: (address: string) => Promise<void>;
  handleAddAddress: (e: React.FormEvent) => Promise<void>;
  selectedBranch: number;
  branches: {
    id: number;
    name: string;
    lat: number;
    lng: number;
    address: string;
  }[];
}

const LABEL_CONFIG = {
  Home: {
    icon: Home,
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    border: "border-orange-200 dark:border-orange-800",
  },
  Work: {
    icon: Briefcase,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800",
  },
  Other: {
    icon: MoreHorizontal,
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-purple-200 dark:border-purple-800",
  },
};

const AddressSection: React.FC<AddressSectionProps> = (props) => {
  const {
    address,
    phoneNumber,
    showAddressForm,
    setShowAddressForm,
    addressMode,
    userAddresses,
    setAddress,
    setAddressMode,
    tempAddress,
    setTempAddress,
    manualMode,
    setManualMode,
    googlePlaceSelected,
    setGooglePlaceSelected,
    selectedPlace,
    setSelectedPlace,
    lastPickedAddress,
    setLastPickedAddress,
    apartmentFlat,
    setApartmentFlat,
    label,
    setLabel,
    error,
    setError,
    handleSaveNewAddress,
    handleAddAddress,
    selectedBranch,
    branches,
    offLocationModal,
  } = props;

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerInstance = useRef<google.maps.Marker | null>(null);
  const autocompleteInput = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 5.4862,
    lng: 7.0256,
  });
  const [showNewLocationPrompt, setShowNewLocationPrompt] = useState(false);
  const [showPickConfirmation, setShowPickConfirmation] = useState(false);
  const [detectedAddress, setDetectedAddress] = useState("");
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [hasDismissedNewPrompt, setHasDismissedNewPrompt] = useState(false);
  const [locating, setLocating] = useState(false);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const {
    isPaused: isMapPaused,
    loading: mapLoading,
    message: pauseMessage,
  } = useGlobalMapControl();

  const handleQuickCurrentLocation = () => {
    if (!geocoderRef.current) {
      setError("Location services not ready yet.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        geocoderRef.current!.geocode(
          { location: newLoc },
          async (results, status) => {
            setLocating(false);
            if (status === "OK" && results?.[0]) {
              const currAddress = results[0].formatted_address;
              await handleSaveNewAddress(currAddress);
              setAddress(currAddress);
              setLabel("Home");
              toast.success("Current location saved as delivery address", {
                position: "top-center",
              });
            } else {
              setError("Could not determine exact address from your location.");
            }
          },
        );
      },
      (err) => {
        setLocating(false);
        setError(
          err.code === 1
            ? "Location access denied. Please enable it in your browser settings."
            : "Unable to get your current location.",
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  };

  useEffect(() => {
    if (window.google?.maps) {
      setMapLoaded(true);
      geocoderRef.current = new window.google.maps.Geocoder();
    } else {
      setMapError("Google Maps not loaded.");
    }
  }, []);

  useEffect(() => {
    if (mapLoaded) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          setMapCenter(loc);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
      );
    }
  }, [mapLoaded]);

  useEffect(() => {
    if (
      userLocation &&
      address &&
      geocoderRef.current &&
      !hasDismissedNewPrompt
    ) {
      geocoderRef.current.geocode(
        { address, componentRestrictions: { country: "ng" } },
        (results, status) => {
          if (status === "OK" && results?.[0]?.geometry?.location) {
            const savedLoc = results[0].geometry.location;
            const currentLoc = new window.google.maps.LatLng(
              userLocation.lat,
              userLocation.lng,
            );
            const dist =
              window.google.maps.geometry.spherical.computeDistanceBetween(
                savedLoc,
                currentLoc,
              );
            if (dist > 1000) {
              geocoderRef.current?.geocode(
                { location: currentLoc },
                (res, stat) => {
                  if (stat === "OK" && res?.[0]) {
                    setDetectedAddress(res[0].formatted_address);
                    setShowNewLocationPrompt(true);
                  }
                },
              );
            }
          }
        },
      );
    }
  }, [userLocation, address, hasDismissedNewPrompt]);

  useEffect(() => {
    if (
      !mapLoaded ||
      manualMode ||
      addressMode !== "add" ||
      !window.google?.maps
    )
      return;
    const imoBounds = new window.google.maps.LatLngBounds(
      new window.google.maps.LatLng(5.3, 6.9),
      new window.google.maps.LatLng(5.6, 7.2),
    );
    if (mapRef.current && !mapInstance.current) {
      const initialCenter = userLocation || mapCenter;
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: initialCenter,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
      });
      markerInstance.current = new window.google.maps.Marker({
        position: initialCenter,
        map: mapInstance.current,
        draggable: true,
      });
      setMapCenter(initialCenter);
      mapInstance.current.addListener(
        "click",
        (e: google.maps.MapMouseEvent) => {
          if (e.latLng && geocoderRef.current) {
            markerInstance.current?.setPosition(e.latLng);
            geocoderRef.current.geocode(
              { location: e.latLng },
              (results, status) => {
                if (status === "OK" && results?.[0]) {
                  const newAddress = results[0].formatted_address;
                  setTempAddress(newAddress);
                  setGooglePlaceSelected(true);
                  setSelectedPlace(results[0]);
                  setLastPickedAddress(newAddress);
                  mapInstance.current?.setCenter(e.latLng as any);
                  setShowPickConfirmation(true);
                }
              },
            );
          }
        },
      );
      markerInstance.current.addListener(
        "dragend",
        (e: google.maps.MapMouseEvent) => {
          if (e.latLng && geocoderRef.current) {
            geocoderRef.current.geocode(
              { location: e.latLng },
              (results, status) => {
                if (status === "OK" && results?.[0]) {
                  const newAddress = results[0].formatted_address;
                  setTempAddress(newAddress);
                  setGooglePlaceSelected(true);
                  setSelectedPlace(results[0]);
                  setLastPickedAddress(newAddress);
                  mapInstance.current?.setCenter(e.latLng as any);
                  setShowPickConfirmation(true);
                }
              },
            );
          }
        },
      );
    }
    if (autocompleteInput.current && !autocompleteRef.current) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        autocompleteInput.current,
        {
          types: ["establishment", "geocode"],
          componentRestrictions: { country: "ng" },
          bounds: imoBounds,
          strictBounds: true,
        },
      );
      autocompleteInput.current.addEventListener("input", () => {
        setTempAddress(autocompleteInput.current!.value);
        setGooglePlaceSelected(false);
      });
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        if (place?.geometry?.location) {
          const location = place.geometry.location;
          const newCenter = { lat: location.lat(), lng: location.lng() };
          setMapCenter(newCenter);
          mapInstance.current?.setCenter(newCenter);
          markerInstance.current?.setPosition(newCenter);
          const newAddress = place.formatted_address || place.name || "";
          setTempAddress(newAddress);
          setGooglePlaceSelected(true);
          setSelectedPlace(place);
          setLastPickedAddress(newAddress);
          setShowPickConfirmation(true);
        }
      });
    }
    return () => {
      if (autocompleteRef.current)
        window.google.maps.event.clearInstanceListeners(
          autocompleteRef.current,
        );
      if (mapInstance.current) {
        window.google.maps.event.clearInstanceListeners(mapInstance.current);
        mapInstance.current = null;
      }
      if (markerInstance.current) {
        markerInstance.current.setMap(null);
        markerInstance.current = null;
      }
    };
  }, [mapLoaded, manualMode, addressMode, userLocation]);

  const handleUseNewLocation = (useIt: boolean) => {
    setShowNewLocationPrompt(false);
    if (useIt) {
      setTempAddress(detectedAddress);
      handleSaveNewAddress(detectedAddress);
      setAddress(detectedAddress);
    } else {
      setHasDismissedNewPrompt(true);
    }
  };

  const handlePickConfirmation = async (useIt: boolean) => {
    setShowPickConfirmation(false);
    if (useIt && tempAddress.trim()) {
      let fullAddress = tempAddress;
      if (apartmentFlat.trim())
        fullAddress = `${apartmentFlat}, ${tempAddress}`;
      await handleSaveNewAddress(fullAddress);
      setAddress(fullAddress);
      setShowAddressForm(false);
    }
  };

  const handleSave = async () => {
    if (!tempAddress.trim()) {
      setError("Please enter your address.");
      return;
    }
    if (!label) {
      setError("Please select a label for your address.");
      return;
    }
    setError(null);
    let fullAddress = tempAddress;
    if (apartmentFlat.trim()) fullAddress = `${apartmentFlat}, ${tempAddress}`;
    await handleSaveNewAddress(fullAddress);
    setShowAddressForm(false);
    setManualMode(false);
    setGooglePlaceSelected(false);
    setLastPickedAddress("");
    setTempAddress("");
    setApartmentFlat("");
  };

  const LabelIcon = label ? LABEL_CONFIG[label].icon : MapPin;

  return (
    <>
      {/* ── Summary Card ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Delivery Address
          </h2>
          {address && (
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${LABEL_CONFIG[label]?.bg} ${LABEL_CONFIG[label]?.color} ${LABEL_CONFIG[label]?.border} border`}
            >
              {label}
            </span>
          )}
        </div>

        {/* Address card */}
        <button
          onClick={() => setShowAddressForm(true)}
          className={`w-full text-left group transition-all duration-200 rounded-2xl border-2 p-4
            ${
              address
                ? "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 hover:border-orange-400 dark:hover:border-orange-600"
                : "bg-gray-50 dark:bg-gray-800/50 border-dashed border-gray-300 dark:border-gray-600 hover:border-orange-400 dark:hover:border-orange-500 hover:bg-orange-50/50 dark:hover:bg-orange-950/20"
            }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors
              ${address ? "bg-orange-500" : "bg-gray-200 dark:bg-gray-700 group-hover:bg-orange-100 dark:group-hover:bg-orange-950"}`}
            >
              {address ? (
                <LabelIcon className="w-5 h-5 text-white" />
              ) : (
                <Plus className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-orange-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {address ? (
                <>
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate leading-tight">
                    {address}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {phoneNumber || "No phone number"}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-sm text-gray-600 dark:text-gray-300">
                    Add delivery address
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Tap to set your location
                  </p>
                </>
              )}
            </div>
            <ChevronRight
              className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5
              ${address ? "text-orange-400" : "text-gray-400 group-hover:text-orange-400"}`}
            />
          </div>
        </button>

        {/* Quick location CTA — only when no address */}
        {!address && (
          <button
            onClick={handleQuickCurrentLocation}
            disabled={isMapPaused || mapLoading || locating}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl
              bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700
              text-white text-sm font-semibold shadow-md shadow-orange-500/25
              transition-all duration-200 hover:shadow-orange-500/40 hover:-translate-y-px
              disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {locating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Detecting location…
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4" /> Use my current location
              </>
            )}
          </button>
        )}
      </div>

      {/* ── New Location Prompt ── */}
      {showNewLocationPrompt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center flex-shrink-0">
                <Navigation className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  New location detected
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  Looks like you're at a different location. Want to update your
                  delivery address?
                </p>
              </div>
            </div>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 border border-gray-100 dark:border-gray-700">
              📍 {detectedAddress}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => handleUseNewLocation(false)}
                className="flex-1 rounded-xl h-11 text-sm font-semibold border-gray-200 dark:border-gray-700"
              >
                Keep current
              </Button>
              <Button
                onClick={() => handleUseNewLocation(true)}
                className="flex-1 rounded-xl h-11 text-sm font-semibold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0"
              >
                Use new location
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Address Modal ── */}
      {showAddressForm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => {
            setShowAddressForm(false);
            setManualMode(false);
            setTempAddress("");
            setApartmentFlat("");
            setError(null);
          }}
        >
          <div
            className="bg-white dark:bg-gray-900 w-full sm:max-w-lg mx-0 sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {address ? "Edit address" : "Add address"}
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {addressMode === "select"
                    ? "Choose from saved or add new"
                    : "Search or pin on map"}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddressForm(false);
                  setManualMode(false);
                  setTempAddress("");
                  setApartmentFlat("");
                  setError(null);
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-100 dark:bg-gray-800 mx-6" />

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* ── SELECT MODE ── */}
              {addressMode === "select" && userAddresses.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    Saved addresses
                  </p>
                  <RadioGroup
                    value={address}
                    onValueChange={(val) => {
                      if (val === "__add_new__") {
                        setAddressMode("add");
                      } else {
                        setAddress(val);
                        setShowAddressForm(false);
                      }
                    }}
                    className="space-y-2"
                  >
                    {userAddresses.map((addr, idx) => (
                      <label
                        key={idx}
                        className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 cursor-pointer transition-all group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-4 h-4 text-orange-500" />
                        </div>
                        <RadioGroupItem value={addr} className="sr-only" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">
                          {addr}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-orange-400 transition-colors" />
                      </label>
                    ))}
                    <label className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-orange-400 dark:hover:border-orange-600 hover:bg-orange-50/30 dark:hover:bg-orange-950/10 cursor-pointer transition-all group">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-100 dark:group-hover:bg-orange-950/40 transition-colors">
                        <Plus className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                      </div>
                      <RadioGroupItem value="__add_new__" className="sr-only" />
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-orange-500 transition-colors">
                        Add new address
                      </span>
                    </label>
                  </RadioGroup>
                </div>
              )}

              {/* ── ADD MODE ── */}
              {addressMode === "add" && (
                <>
                  {/* Loading state */}
                  {mapLoading && (
                    <div className="py-16 flex flex-col items-center justify-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                      </div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Loading location services…
                      </p>
                    </div>
                  )}

                  {/* Paused state */}
                  {!mapLoading && isMapPaused && (
                    <div className="space-y-5">
                      <div className="flex flex-col items-center text-center py-6 space-y-3">
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                          <AlertCircle className="w-8 h-8 text-amber-500" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white">
                            Location temporarily unavailable
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed max-w-xs">
                            {pauseMessage ||
                              "Please enter your delivery address manually. Our team will confirm the delivery fee."}
                          </p>
                        </div>
                      </div>
                      <ManualForm
                        tempAddress={tempAddress}
                        setTempAddress={setTempAddress}
                        apartmentFlat={apartmentFlat}
                        setApartmentFlat={setApartmentFlat}
                        label={label}
                        setLabel={setLabel}
                        error={error}
                        onSave={handleSave}
                      />
                    </div>
                  )}

                  {/* Normal map mode */}
                  {!mapLoading && !isMapPaused && !manualMode && (
                    <div className="space-y-4">
                      {/* Search input */}
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          ref={autocompleteInput}
                          placeholder="Search for your address…"
                          className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
                        />
                        {googlePlaceSelected &&
                          tempAddress === lastPickedAddress && (
                            <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                          )}
                      </div>

                      {/* Map */}
                      <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                        {mapLoaded ? (
                          <div
                            ref={mapRef}
                            style={{ width: "100%", height: "100%" }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full bg-gray-100 dark:bg-gray-800 gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
                            <p className="text-xs text-gray-400">
                              Loading map…
                            </p>
                          </div>
                        )}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg border border-gray-100 dark:border-gray-700">
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                            Tap or drag pin to set location
                          </p>
                        </div>
                      </div>

                      {/* Pick confirmation banner */}
                      {showPickConfirmation && (
                        <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-950/30 rounded-2xl border border-orange-200 dark:border-orange-800">
                          <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-0.5">
                              Confirm this address?
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              {tempAddress}
                            </p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => handlePickConfirmation(false)}
                              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors font-medium"
                            >
                              No
                            </button>
                            <button
                              onClick={() => handlePickConfirmation(true)}
                              className="text-xs text-white bg-orange-500 hover:bg-orange-600 px-3 py-1 rounded-lg transition-colors font-semibold"
                            >
                              Yes
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Apartment input (always shown below map) */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                          Apartment / Flat{" "}
                          <span className="normal-case font-normal">
                            (optional)
                          </span>
                        </Label>
                        <Input
                          value={apartmentFlat}
                          onChange={(e) => setApartmentFlat(e.target.value)}
                          placeholder="e.g. Flat 2B, Block A"
                          className="rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm h-11"
                        />
                      </div>

                      {/* Label picker */}
                      <LabelPicker label={label} setLabel={setLabel} />

                      {error && (
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-950/30 rounded-xl px-3 py-2.5 border border-red-100 dark:border-red-900">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>{error}</span>
                        </div>
                      )}

                      {/* Manual entry link */}
                      <button
                        type="button"
                        onClick={() => {
                          setManualMode(true);
                          setGooglePlaceSelected(false);
                          setLastPickedAddress("");
                        }}
                        className="w-full text-center text-sm text-orange-500 dark:text-orange-400 font-semibold hover:text-orange-600 dark:hover:text-orange-300 transition-colors py-1"
                      >
                        Can't find your address? Enter manually →
                      </button>
                    </div>
                  )}

                  {/* Manual mode */}
                  {!mapLoading && !isMapPaused && manualMode && (
                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={() => setManualMode(false)}
                        className="flex items-center gap-1.5 text-sm text-orange-500 font-medium hover:text-orange-600 transition-colors"
                      >
                        ← Back to map
                      </button>
                      <ManualForm
                        tempAddress={tempAddress}
                        setTempAddress={setTempAddress}
                        apartmentFlat={apartmentFlat}
                        setApartmentFlat={setApartmentFlat}
                        label={label}
                        setLabel={setLabel}
                        error={error}
                        onSave={handleSave}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sticky footer CTA */}
            {addressMode === "add" && !mapLoading && (
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
                <Button
                  onClick={handleSave}
                  disabled={!tempAddress.trim()}
                  className="w-full h-12 rounded-xl text-sm font-bold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25 disabled:opacity-40 border-0 transition-all"
                >
                  Save address
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

/* ── Sub-components ── */

const LabelPicker = ({
  label,
  setLabel,
}: {
  label: string;
  setLabel: (l: "Home" | "Work" | "Other") => void;
}) => (
  <div className="space-y-2">
    <Label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
      Label
    </Label>
    <div className="grid grid-cols-3 gap-2">
      {(["Home", "Work", "Other"] as const).map((l) => {
        const cfg = LABEL_CONFIG[l];
        const Icon = cfg.icon;
        const active = label === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLabel(l)}
            className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-all duration-150
              ${
                active
                  ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                  : "border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
          >
            <Icon className={`w-4 h-4 ${active ? cfg.color : ""}`} />
            {l}
          </button>
        );
      })}
    </div>
  </div>
);

const ManualForm = ({
  tempAddress,
  setTempAddress,
  apartmentFlat,
  setApartmentFlat,
  label,
  setLabel,
  error,
  onSave,
}: {
  tempAddress: string;
  setTempAddress: (v: string) => void;
  apartmentFlat: string;
  setApartmentFlat: (v: string) => void;
  label: string;
  setLabel: (l: "Home" | "Work" | "Other") => void;
  error: string | null;
  onSave: () => void;
}) => (
  <div className="space-y-4">
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
        Full address
      </Label>
      <Input
        value={tempAddress}
        onChange={(e) => setTempAddress(e.target.value)}
        placeholder="Street, area, city, state"
        className="rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm h-11 focus:ring-orange-400"
      />
    </div>
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
        Apartment / Flat{" "}
        <span className="normal-case font-normal">(optional)</span>
      </Label>
      <Input
        value={apartmentFlat}
        onChange={(e) => setApartmentFlat(e.target.value)}
        placeholder="e.g. Flat 2B, Block A"
        className="rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm h-11 focus:ring-orange-400"
      />
    </div>
    <LabelPicker label={label} setLabel={setLabel} />
    {error && (
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-950/30 rounded-xl px-3 py-2.5 border border-red-100 dark:border-red-900">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>{error}</span>
      </div>
    )}
  </div>
);

export default AddressSection;
