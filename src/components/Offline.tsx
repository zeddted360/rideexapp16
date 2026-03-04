"use client";

import { useState, useEffect } from "react";
import { WifiOff, AlertTriangle, RefreshCw, X } from "lucide-react";

type ConnectionStatus = "online" | "offline" | "poor";

export default function Offline() {
  const [status, setStatus] = useState<ConnectionStatus>("online");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateStatus = async () => {
      if (!navigator.onLine) {
        setStatus("offline");
        setDismissed(false); // re-show if connection drops again
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

        const conn = (navigator as any).connection;
        const isPoor =
          conn && ["slow-2g", "2g", "3g"].includes(conn.effectiveType);

        const newStatus = isPoor ? "poor" : "online";
        setStatus(newStatus);

        // Reset dismissed state when status changes to a new warning
        if (newStatus !== "online") setDismissed(false);
      } catch {
        setStatus("offline");
        setDismissed(false);
      }
    };

    updateStatus();

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", () => {
      setStatus("offline");
      setDismissed(false);
    });

    interval = setInterval(updateStatus, 15000);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", () => setStatus("offline"));
      clearInterval(interval);
    };
  }, []);

  if (status === "online" || dismissed) return null;

  const isOffline = status === "offline";
  const Icon = isOffline ? WifiOff : AlertTriangle;
  const bgColor = isOffline ? "bg-red-600" : "bg-amber-600";
  const title = isOffline ? "You're offline" : "Slow or unstable connection";
  const message = isOffline
    ? "Check your internet connection. We'll automatically reconnect when you're back online."
    : "Some features may load slower than usual.";

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 ${bgColor} text-white shadow-lg`}
    >
      <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center gap-4 text-sm md:text-base">
        <div className="flex items-center gap-3 flex-1">
          <Icon className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-white/90 text-xs md:text-sm mt-0.5">{message}</p>
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
