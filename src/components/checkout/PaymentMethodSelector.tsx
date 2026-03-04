import React from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard, Truck, Landmark, ShieldCheck } from "lucide-react";

export type PaymentMethod = "card" | "cash" | "bank";

interface PaymentMethodSelectorProps {
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
}

const METHODS = [
  {
    value: "card" as PaymentMethod,
    icon: CreditCard,
    label: "Credit / Debit Card",
    sub: "Visa, Mastercard & more",
    badge: null,
    accentColor: "text-orange-500",
    activeBg: "bg-orange-50 dark:bg-orange-950/40",
    activeBorder: "border-orange-400 dark:border-orange-500",
    activeShadow: "shadow-orange-200 dark:shadow-orange-900/30",
    iconBg: "bg-orange-100 dark:bg-orange-950/60",
  },
  {
    value: "cash" as PaymentMethod,
    icon: Truck,
    label: "Cash on Delivery",
    sub: "Items paid now, delivery fee on arrival",
    badge: "Popular",
    accentColor: "text-emerald-500",
    activeBg: "bg-emerald-50 dark:bg-emerald-950/40",
    activeBorder: "border-emerald-400 dark:border-emerald-500",
    activeShadow: "shadow-emerald-200 dark:shadow-emerald-900/30",
    iconBg: "bg-emerald-100 dark:bg-emerald-950/60",
  },
  {
    value: "bank" as PaymentMethod,
    icon: Landmark,
    label: "Bank Transfer",
    sub: "Transfer directly from your bank",
    badge: null,
    accentColor: "text-blue-500",
    activeBg: "bg-blue-50 dark:bg-blue-950/40",
    activeBorder: "border-blue-400 dark:border-blue-500",
    activeShadow: "shadow-blue-200 dark:shadow-blue-900/30",
    iconBg: "bg-blue-100 dark:bg-blue-950/60",
  },
];

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  paymentMethod,
  setPaymentMethod,
}) => {
  return (
    <div className="space-y-5">
      {/* Heading */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          Payment Method
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          Choose how you'd like to pay
        </p>
      </div>

      {/* Options */}
      <RadioGroup
        value={paymentMethod}
        onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
        className="space-y-2.5"
      >
        {METHODS.map((m) => {
          const active = paymentMethod === m.value;
          const Icon = m.icon;

          return (
            <label
              key={m.value}
              className={`relative flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-150 select-none
                ${
                  active
                    ? `${m.activeBorder} ${m.activeBg} shadow-sm ${m.activeShadow}`
                    : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-white dark:hover:bg-gray-800"
                }`}
            >
              <RadioGroupItem value={m.value} className="sr-only" />

              {/* Icon badge */}
              <span
                className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${active ? m.iconBg : "bg-gray-100 dark:bg-gray-700"}`}
              >
                <Icon
                  className={`w-5 h-5 transition-colors ${active ? m.accentColor : "text-gray-400 dark:text-gray-500"}`}
                />
              </span>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-bold transition-colors ${active ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}
                  >
                    {m.label}
                  </span>
                  {m.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                      {m.badge}
                    </span>
                  )}
                </div>
                <p
                  className={`text-xs mt-0.5 transition-colors ${active ? "text-gray-500 dark:text-gray-400" : "text-gray-400 dark:text-gray-500"}`}
                >
                  {m.sub}
                </p>
              </div>

              {/* Custom radio */}
              <span
                className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150
                ${
                  active
                    ? `${m.activeBorder.replace("border-", "border-").split(" ")[0]} bg-current`
                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                }`}
                style={active ? { borderColor: "currentColor" } : {}}
              >
                {active && (
                  <span
                    className={`w-2 h-2 rounded-full ${m.accentColor.replace("text-", "bg-")}`}
                  />
                )}
              </span>
            </label>
          );
        })}
      </RadioGroup>

      {/* Trust badge */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
        <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          All transactions are{" "}
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            secure & encrypted
          </span>
        </p>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
