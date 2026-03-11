"use client";

import { useState, useEffect } from "react";
import { WifiOff, RefreshCw, X } from "lucide-react";

export default function Offline() {
  const [isOffline, setIsOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateStatus = async () => {
      if (!navigator.onLine) {
        setIsOffline(true);
        setDismissed(false);
        return;
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        await fetch("/_next/static/favicon.ico", {
          method: "HEAD",
          cache: "no-store",
          signal: controller.signal,
        });
        clearTimeout(timeout);
        setIsOffline(false);
      } catch {
        setIsOffline(true);
        setDismissed(false);
      }
    };

    updateStatus();

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", () => {
      setIsOffline(true);
      setDismissed(false);
    });

    interval = setInterval(updateStatus, 15000);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", () => setIsOffline(true));
      clearInterval(interval);
    };
  }, []);

  if (!isOffline || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white shadow-lg">
      <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center gap-4 text-sm md:text-base">
        <div className="flex items-center gap-3 flex-1">
          <WifiOff className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">You're offline</p>
            <p className="text-white/90 text-xs md:text-sm mt-0.5">
              Check your internet connection. We'll automatically reconnect when
              you're back online.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 active:bg-white/40 px-5 py-2.5 rounded-2xl text-xs font-semibold transition-all active:scale-[0.97]"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>

          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss notification"
            className="flex items-center justify-center bg-white/20 hover:bg-white/30 active:bg-white/40 p-2.5 rounded-2xl transition-all active:scale-[0.97]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
