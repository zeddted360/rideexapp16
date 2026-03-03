"use client";

import { useState, useEffect } from "react";
import { WifiOff, AlertTriangle, RefreshCw } from "lucide-react";

type ConnectionStatus = "online" | "offline" | "poor";

export default function Offline() {
  const [status, setStatus] = useState<ConnectionStatus>("online");

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateStatus = async () => {
      // 1. Basic offline check
      if (!navigator.onLine) {
        setStatus("offline");
        return;
      }

      // 2. Smart poor-network detection (real latency + navigator.connection)
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);

        // Ping a tiny static asset (always cached by Next.js)
        await fetch("/_next/static/favicon.ico", {
          method: "HEAD",
          cache: "no-store",
          signal: controller.signal,
        });

        clearTimeout(timeout);

        // Optional: fallback to Network Information API
        const conn = (navigator as any).connection;
        const isPoor =
          conn && ["slow-2g", "2g", "3g"].includes(conn.effectiveType);

        setStatus(isPoor ? "poor" : "online");
      } catch {
        setStatus("offline");
      }
    };

    // Initial check
    updateStatus();

    // Listen for browser events
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", () => setStatus("offline"));

    // Periodic check (great for poor/unstable networks)
    interval = setInterval(updateStatus, 15000);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", () => setStatus("offline"));
      clearInterval(interval);
    };
  }, []);

  if (status === "online") return null;

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

        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 active:bg-white/40 px-5 py-2.5 rounded-2xl text-xs font-semibold transition-all active:scale-[0.97]"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    </div>
  );
}
