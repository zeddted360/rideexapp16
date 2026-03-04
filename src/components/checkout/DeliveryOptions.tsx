import React from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar, Clock, Sun, Sunrise } from "lucide-react";

interface TimeSlot {
  id: string;
  label: string;
  start: Date;
  end: Date | null;
}

interface DeliveryOptionsProps {
  deliveryDay: "today" | "tomorrow";
  setDeliveryDay: (day: "today" | "tomorrow") => void;
  timeSlots: TimeSlot[];
  selectedTimeSlot: string;
  setSelectedTimeSlot: (slot: string) => void;
}

const DAY_CONFIG = {
  today: {
    icon: Sun,
    sub: "Deliver as soon as possible",
  },
  tomorrow: {
    icon: Sunrise,
    sub: "Schedule for tomorrow",
  },
};

const DeliveryOptions: React.FC<DeliveryOptionsProps> = ({
  deliveryDay,
  setDeliveryDay,
  timeSlots,
  selectedTimeSlot,
  setSelectedTimeSlot,
}) => {
  return (
    <div className="space-y-5">
      {/* Heading */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          Delivery Options
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          Choose when you'd like your order delivered
        </p>
      </div>

      {/* ── Delivery Day ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Delivery Day
          </span>
        </div>

        <RadioGroup
          value={deliveryDay}
          onValueChange={(v) => setDeliveryDay(v as "today" | "tomorrow")}
          className="grid grid-cols-2 gap-3"
        >
          {(["today", "tomorrow"] as const).map((day) => {
            const cfg = DAY_CONFIG[day];
            const Icon = cfg.icon;
            const active = deliveryDay === day;

            return (
              <label
                key={day}
                className={`relative flex flex-col gap-1.5 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-150 select-none
                  ${
                    active
                      ? "border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-950/40 shadow-sm shadow-orange-200 dark:shadow-orange-900/30"
                      : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 hover:border-orange-200 dark:hover:border-orange-800 hover:bg-orange-50/40 dark:hover:bg-orange-950/20"
                  }`}
              >
                <RadioGroupItem value={day} className="sr-only" />

                {/* Active dot */}
                <span
                  className={`absolute top-3 right-3 w-2 h-2 rounded-full transition-all duration-150
                    ${active ? "bg-orange-500 scale-100" : "bg-gray-300 dark:bg-gray-600 scale-75"}`}
                />

                <Icon
                  className={`w-5 h-5 transition-colors ${active ? "text-orange-500" : "text-gray-400 dark:text-gray-500"}`}
                />
                <span
                  className={`text-sm font-bold capitalize transition-colors
                    ${active ? "text-orange-600 dark:text-orange-400" : "text-gray-700 dark:text-gray-300"}`}
                >
                  {day}
                </span>
                <span className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">
                  {cfg.sub}
                </span>
              </label>
            );
          })}
        </RadioGroup>
      </div>

      {/* ── Time Slots ── */}
      {timeSlots.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Delivery Time
            </span>
          </div>

          <RadioGroup
            value={selectedTimeSlot}
            onValueChange={setSelectedTimeSlot}
            className="grid grid-cols-2 gap-2.5"
          >
            {timeSlots.map((slot) => {
              const active = selectedTimeSlot === slot.id;
              return (
                <label
                  key={slot.id}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all duration-150 select-none
                    ${
                      active
                        ? "border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-950/40 shadow-sm shadow-orange-200 dark:shadow-orange-900/30"
                        : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 hover:border-orange-200 dark:hover:border-orange-800 hover:bg-orange-50/40 dark:hover:bg-orange-950/20"
                    }`}
                >
                  <RadioGroupItem value={slot.id} className="sr-only" />

                  {/* Custom radio circle */}
                  <span
                    className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-150
                      ${
                        active
                          ? "border-orange-500 bg-orange-500"
                          : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                      }`}
                  >
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </span>

                  <span
                    className={`text-sm font-semibold leading-tight transition-colors
                      ${active ? "text-orange-600 dark:text-orange-400" : "text-gray-700 dark:text-gray-300"}`}
                  >
                    {slot.label}
                  </span>
                </label>
              );
            })}
          </RadioGroup>
        </div>
      )}
    </div>
  );
};

export default DeliveryOptions;
