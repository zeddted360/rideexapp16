import React from "react";
import { Ban } from "lucide-react";

interface OutOfStockOverlayProps {
  itemName?: string;
  className?: string;
}

export const OutOfStockOverlay: React.FC<OutOfStockOverlayProps> = ({
  itemName,
  className = "",
}) => (
  <div className={`absolute inset-0 bg-gray-900/30 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg ${className}`}>
    <div className="flex items-center gap-3 mb-2">
      <div className="w-12 h-12 rounded-full flex items-center justify-center">
        <Ban className="w-8 h-8 text-red-500" strokeWidth={3} />
      </div>
      <span className="text-white font-bold text-lg">Out of Stock</span>
    </div>
    {itemName && (
      <p className="text-white text-sm text-center px-4">
        {itemName}
      </p>
    )}
  </div>
);
