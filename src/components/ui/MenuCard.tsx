import { fileUrl, validateEnv } from "@/utils/appwrite";
import Image from "next/image";
import { IMenuItemFetched } from "../../../types/types";

// Menu Card Component
const MenuCard = ({ menuItem }: { menuItem: IMenuItemFetched }) => {
  return (
    <div className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex-shrink-0 w-[200px] sm:w-auto hover:scale-105 focus-within:ring-2 focus-within:ring-orange-500">
      <div className="relative">
        <div className="w-full h-36 overflow-hidden rounded-t-xl">
          <Image
            src={fileUrl(validateEnv().menuBucketId, menuItem.image)}
            alt={menuItem.name}
            width={200}
            height={150}
            quality={100}
            priority
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </div>
        {/* Optional: Veg/Non-Veg indicator */}
        <div className="absolute top-2 left-2">
          <div
            className={`w-4 h-4 rounded-sm border-2 ${
              menuItem.category === "veg"
                ? "bg-green-500 border-green-600"
                : "bg-red-500 border-red-600"
            }`}
          />
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2 line-clamp-1">
          {menuItem.name}
        </h3>
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2 mb-4">
          <p className="line-clamp-2">{menuItem.description}</p>
          {menuItem.cookTime && (
            <p className="text-sm text-gray-500">{menuItem.cookTime}</p>
          )}
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xl font-bold text-orange-600">
              ₦{menuItem.price}
            </p>
            {menuItem.originalPrice &&
              menuItem.originalPrice !== menuItem.price && (
                <p className="text-sm text-gray-500 line-through">
                  ₦{menuItem.originalPrice}
                </p>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuCard;
