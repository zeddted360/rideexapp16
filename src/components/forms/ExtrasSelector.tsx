"use client";
import { Label } from "@/components/ui/label";
import { IFetchedExtras } from "../../../types/types";

interface Props {
  availableExtras: IFetchedExtras[];
  selectedExtras: IFetchedExtras[];
  onChange: (extras: IFetchedExtras[]) => void;
  title?: string;
}

export default function ExtrasSelector({
  availableExtras,
  selectedExtras,
  onChange,
  title = "Attached Extras",
}: Props) {
  
  const toggle = (extra: IFetchedExtras) => {
    if (selectedExtras.some((e) => e.$id === extra.$id)) {
      onChange(selectedExtras.filter((e) => e.$id !== extra.$id));
    } else {
      onChange([...selectedExtras, extra]);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold text-orange-600">{title}</Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded-2xl">
        {availableExtras.length > 0 ? (
          availableExtras.map((extra) => {
            const isSelected = selectedExtras.some((e) => e.$id === extra.$id);
            return (
              <label
                key={extra.$id}
                className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all hover:border-orange-400 ${
                  isSelected
                    ? "border-orange-500 bg-orange-50 dark:bg-orange-950"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(extra)}
                  className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                />
                <div className="flex-1">
                  <p className="font-medium truncate">{extra.name}</p>
                  <p className="text-sm text-orange-600">₦{extra.price}</p>
                  {extra.description && (
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {extra.description}
                    </p>
                  )}
                </div>
              </label>
            );
          })
        ) : (
          <p className="text-gray-500 col-span-2 py-8 text-center">
            No extras available
          </p>
        )}
      </div>
    </div>
  );
}
