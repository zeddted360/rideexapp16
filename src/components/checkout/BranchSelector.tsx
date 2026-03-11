import React from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MapPin, Star, CheckCircle2, Navigation } from "lucide-react";

interface Branch {
  id: number;
  name: string;
  lat: number;
  lng: number;
  address: string;
}

interface BranchSelectorProps {
  selectedBranch: number;
  setSelectedBranch: (id: number) => void;
  branches: Branch[];
}

const BranchSelector: React.FC<BranchSelectorProps> = ({
  selectedBranch,
  setSelectedBranch,
  branches,
}) => (
  <div className="space-y-3">
    {/* Heading */}
    <div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
        Select Branch
      </h2>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
       For faster delivery, please select the branch nearest to your delivery address
      </p>
    </div>

    <RadioGroup
      value={String(selectedBranch)}
      onValueChange={(val) => setSelectedBranch(Number(val))}
      className="space-y-2.5"
      aria-label="Branch selection"
    >
      {branches.map((branch) => {
        const active = selectedBranch === branch.id;
        const isMain = branch.id === 1;

        return (
          <label
            key={branch.id}
            htmlFor={`branch-${branch.id}`}
            className={`relative flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-150 select-none group
              ${
                active
                  ? "border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-950/40 shadow-sm shadow-orange-200 dark:shadow-orange-900/30"
                  : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 hover:border-orange-200 dark:hover:border-orange-800 hover:bg-orange-50/40 dark:hover:bg-orange-950/20"
              }`}
          >
            <RadioGroupItem
              value={String(branch.id)}
              id={`branch-${branch.id}`}
              className="sr-only"
            />

            {/* Icon */}
            <span
              className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors
              ${
                active
                  ? "bg-orange-500"
                  : "bg-gray-100 dark:bg-gray-700 group-hover:bg-orange-100 dark:group-hover:bg-orange-950/40"
              }`}
            >
              <Navigation
                className={`w-5 h-5 transition-colors ${active ? "text-white" : "text-gray-400 dark:text-gray-500 group-hover:text-orange-500"}`}
              />
            </span>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-sm font-bold transition-colors
                  ${active ? "text-orange-600 dark:text-orange-400" : "text-gray-800 dark:text-gray-200"}`}
                >
                  {branch.name}
                </span>
                {isMain && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                    <Star className="w-2.5 h-2.5" />
                    Main
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                  {branch.address}
                </p>
              </div>
            </div>

            {/* Custom radio */}
            <span
              className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150
              ${
                active
                  ? "border-orange-500 bg-orange-500"
                  : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              }`}
            >
              {active && <span className="w-2 h-2 rounded-full bg-white" />}
            </span>
          </label>
        );
      })}
    </RadioGroup>
  </div>
);

export default BranchSelector;
