// hooks/useUserMap.ts
import { useEffect, useRef } from "react";
import { useGlobalMapControl } from "./useGlobalMapControl";

export function useUserMap(
  userLocation: { lat: number; lng: number } | null,
  address: string,
  googleMapsApiKey: string,
  onNewAddressPicked: (newAddress: string) => void
) {
  const { isPaused: isMapPaused, loading: pauseLoading } =
    useGlobalMapControl();

  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  useEffect(() => {
    if (pauseLoading || isMapPaused === null) return;

    const mapDiv = document.getElementById("user-location-map");
    if (!mapDiv) return;

    if (isMapPaused) {
      mapDiv.innerHTML = `
        <div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#111;color:white;text-align:center;padding:20px;">
          <h3 style="font-size:1.5rem;margin-bottom:1rem;">Map Temporarily Unavailable</h3>
          <p style="max-width:400px;">We're performing maintenance. Map features will be back soon. Thank you for your patience!</p>
        </div>
      `;
      return;
    }

    if (!googleMapsApiKey || !window.google?.maps) return;

    const center = userLocation || { lat: 5.47631, lng: 7.025853 };

    mapRef.current = new window.google.maps.Map(mapDiv, {
      center,
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      mapId: "DEMO_MAP_ID",
    });

    geocoderRef.current = new window.google.maps.Geocoder();

    // PlacesService needs a live map instance
    placesServiceRef.current = new window.google.maps.places.PlacesService(
      mapRef.current
    );

    markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
      position: center,
      map: mapRef.current,
      title: address || "Your Location",
      gmpDraggable: true,
    });

    // Haversine distance in metres between two LatLng points
    const haversineMetres = (
      a: google.maps.LatLng,
      b: google.maps.LatLng
    ): number => {
      const R = 6371000;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(b.lat() - a.lat());
      const dLng = toRad(b.lng() - a.lng());
      const sin2 =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat())) *
          Math.cos(toRad(b.lat())) *
          Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(sin2));
    };

    // Build a readable address from a Places result.
   
    const placeToAddress = (place: google.maps.places.PlaceResult): string => {
      const parts: string[] = [];
      if (place.name) parts.push(place.name);
      if (place.vicinity && place.vicinity !== place.name)
        parts.push(place.vicinity);
      return parts.join(", ");
    };

    // Pick the most precise result from geocoder results
    const pickBestGeocoderResult = (
      results: google.maps.GeocoderResult[]
    ): string => {
      const priority = [
        "street_address",
        "premise",
        "subpremise",
        "establishment",
        "route",
      ];
      const filtered = results.filter((r) => !r.types.includes("plus_code"));
      const pool = filtered.length > 0 ? filtered : results;
      for (const type of priority) {
        const match = pool.find((r) => r.types.includes(type));
        if (match) return match.formatted_address;
      }
      return pool[0].formatted_address;
    };

    // Main resolver: Places nearbySearch → geocoder fallback
   
    const resolveAddress = (latLng: google.maps.LatLng) => {
      if (!placesServiceRef.current || !geocoderRef.current) return;

      placesServiceRef.current.nearbySearch(
        { location: latLng, radius: 40 },
        (results, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            results &&
            results.length > 0
          ) {
            // Pick the closest result to the exact click point
            const closest = results.reduce((best, candidate) => {
              const cLoc = candidate.geometry?.location;
              const bLoc = best.geometry?.location;
              if (!cLoc) return best;
              if (!bLoc) return candidate;
              return haversineMetres(latLng, cLoc) <
                haversineMetres(latLng, bLoc)
                ? candidate
                : best;
            });

            const closestLoc = closest.geometry?.location;
            const distM = closestLoc
              ? haversineMetres(latLng, closestLoc)
              : Infinity;

            if (distM <= 40 && closest.name) {
              onNewAddressPicked(placeToAddress(closest));
              return;
            }
          }

          // No POI found nearby — fall back to street-level reverse geocoding
          geocoderRef.current!.geocode(
            { location: latLng },
            (gResults, gStatus) => {
              if (gStatus === "OK" && gResults && gResults.length > 0) {
                onNewAddressPicked(pickBestGeocoderResult(gResults));
              }
            }
          );
        }
      );
    };

    // Normalise AdvancedMarkerElement.position to LatLng
    const toLatLng = (
      raw: google.maps.LatLng | google.maps.LatLngLiteral | null | undefined
    ): google.maps.LatLng | null => {
      if (!raw) return null;
      if (raw instanceof google.maps.LatLng) return raw;
      return new google.maps.LatLng(
        (raw as google.maps.LatLngLiteral).lat,
        (raw as google.maps.LatLngLiteral).lng
      );
    };

    // Map click
    mapRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng && markerRef.current) {
        markerRef.current.position = e.latLng;
        resolveAddress(e.latLng);
      }
    });

    // Marker drag end
    markerRef.current.addListener("dragend", () => {
      const latLng = toLatLng(
        markerRef.current?.position as
          | google.maps.LatLng
          | google.maps.LatLngLiteral
      );
      if (latLng) resolveAddress(latLng);
    });

    // Pan map to a pre-existing saved address
    if (address && geocoderRef.current) {
      geocoderRef.current.geocode(
        { address, componentRestrictions: { country: "ng" } },
        (results, status) => {
          if (status === "OK" && results?.[0]?.geometry?.location) {
            const loc = results[0].geometry.location;
            mapRef.current?.setCenter({ lat: loc.lat(), lng: loc.lng() });
            if (markerRef.current) {
              markerRef.current.position = new google.maps.LatLng(
                loc.lat(),
                loc.lng()
              );
            }
          }
        }
      );
    }

    return () => {
      if (markerRef.current) markerRef.current.map = null;
      if (mapRef.current)
        google.maps.event.clearInstanceListeners(mapRef.current);
      mapRef.current = null;
      markerRef.current = null;
      geocoderRef.current = null;
      placesServiceRef.current = null;
    };
  }, [
    userLocation,
    address,
    googleMapsApiKey,
    onNewAddressPicked,
    isMapPaused,
    pauseLoading,
  ]);

  return {
    mapRef,
    markerRef,
    isMapReady: !pauseLoading && isMapPaused === false,
  };
}
