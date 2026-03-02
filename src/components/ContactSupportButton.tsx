"use client"

import { MessageCircle } from "lucide-react";

const ContactSupportButton = () => {
  return (
    <div>
      <button
        onClick={() => {
          if (typeof window !== "undefined" && (window as any).Tawk_API) {
            (window as any).Tawk_API.toggle(); // Opens if closed, closes if open
          }
        }}
        className="flex flex-col items-center py-2 px-2 text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
      >
        <MessageCircle className="w-5 h-5 mb-1" color="#f97316" />
        <span className="text-xs">Chat Support</span>
      </button>
    </div>
  );
};

export default ContactSupportButton;
