// "use client";
// import React, { useState, useEffect, useCallback } from "react";
// import {
//   IMenuItemFetched,
//   IPopularItemFetched,
//   IFeaturedItemFetched,
//   IDiscountFetched,
//   IRestaurantFetched,
// } from "../../types/types";
// import { fileUrl, validateEnv } from "@/utils/appwrite";
// import toast from "react-hot-toast";
// import {
//   Search,
//   Filter,
//   ChevronDown,
//   CheckCircle,
//   XCircle,
//   Star,
//   Clock,
//   Image as ImageIcon,
//   Package,
//   TrendingUp,
//   Award,
//   Edit2,
//   Trash2,
//   Loader2,
//   Utensils,
// } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import { AppDispatch, RootState } from "@/state/store";
// import {
//   listAsyncFeaturedItems,
//   updateAsyncFeaturedItem,
//   deleteAsyncFeaturedItem,
//   updateApprovalAsyncFeaturedItem,
// } from "@/state/featuredSlice";
// import {
//   listAsyncPopularItems,
//   updateAsyncPopularItem,
//   deleteAsyncPopularItem,
//   updateApprovalAsyncPopularItem,
// } from "@/state/popularSlice";
// import {
//   listAsyncMenusItem,
//   updateAsyncMenuItem,
//   deleteAsyncMenuItem,
//   updateApprovalAsyncMenuItem,
// } from "@/state/menuSlice";
// import {
//   listAsyncDiscounts,
//   updateAsyncDiscount,
//   deleteAsyncDiscount,
// } from "@/state/discountSlice";
// import { getAsyncRestaurantById } from "@/state/restaurantSlice";
// import { useRestaurantById } from "@/hooks/useRestaurant";
// import Image from "next/image";
// import { motion } from "framer-motion";
// import { Button } from "./ui/button";
// import { Input } from "./ui/input";
// import { Label } from "./ui/label";
// import { listAsyncExtras } from "@/state/extraSlice";
// import { IFetchedExtras } from "../../types/types";
// import { IPackFetched } from "../../types/types";
// import { listAsyncPacks } from "@/state/extraSlice";
// import VendorExtrasModal from "./admin/VendorExtrasModal";
// import DeleteConfirmModal from "./admin/DeleteConfirmModal";
// import EditContentModal from "./admin/EditContentModal";
// import { listAsyncRestaurants } from "@/state/restaurantSlice";

// type ContentType = "menu" | "popular" | "featured" | "discount";
// type ContentItem =
//   | IMenuItemFetched
//   | IPopularItemFetched
//   | IFeaturedItemFetched
//   | IDiscountFetched;
// // ItemRow component for desktop view (renders <tr>)
// const ItemRow = ({
//   item,
//   activeContentTab,
//   handleApproval,
//   handleEdit,
//   handleDeleteClick,
// }: {
//   item: ContentItem;
//   activeContentTab: ContentType;
//   handleApproval: (itemId: string, isApproved: boolean) => Promise<void>;
//   handleEdit: (item: ContentItem) => void;
//   handleDeleteClick: (item: ContentItem) => void;
// }) => {
//   const isDiscount = activeContentTab === "discount";
//   const restaurantId = isDiscount
//     ? (item as IDiscountFetched).restaurantId
//     : "restaurantId" in item
//     ? item.restaurantId
//     : (item as any).restaurant || "";
//   const { restaurant, loading, error } = useRestaurantById(
//     restaurantId || null
//   );
//   const getTimeLeft = (endDate: string) => {
//     const now = new Date();
//     const end = new Date(endDate);
//     const diff = end.getTime() - now.getTime();
//     if (diff < 0) return "Expired";
//     const days = Math.floor(diff / (1000 * 60 * 60 * 24));
//     const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
//     return `${days}d ${hours}h left`;
//   };
//   const getApprovalBadge = (isApproved: boolean | undefined) => {
//     if (isApproved) {
//       return (
//         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
//           <CheckCircle className="w-3 h-3 mr-1" />
//           Approved
//         </span>
//       );
//     }
//     return (
//       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
//         <Clock className="w-3 h-3 mr-1" />
//         Pending
//       </span>
//     );
//   };

//      const getPausedBadge = (isPaused?: boolean) => {
//        if (!isPaused) return null;
//        return (
//          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
//            <XCircle className="w-3 h-3 mr-1" />
//            PAUSED
//          </span>
//        );
//      };

//   // Common content for both desktop and mobile views
//   const renderContent = () => (
//     <div className="flex items-center gap-3">
//       <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 relative">
//         {item.image ? (
//           <Image
//             src={fileUrl(getBucketId(activeContentTab), item.image as string)}
//             alt={"title" in item ? item.title : item.name}
//             className="w-full h-full object-cover"
//             onError={(e) => {
//               const target = e.target as HTMLImageElement;
//               target.style.display = "none";
//               target.nextElementSibling?.classList.remove("hidden");
//             }}
//             width={50}
//             height={50}
//             quality={100}
//           />
//         ) : null}
//         <div
//           className={`w-full h-full flex items-center justify-center text-gray-400 absolute top-0 left-0 ${
//             item.image ? "hidden" : ""
//           }`}
//         >
//           <ImageIcon className="w-6 h-6" />
//         </div>
//       </div>
//       <div>
//         <p className="font-medium text-gray-900 dark:text-gray-100">
//           {"title" in item ? item.title : item.name}
//         </p>
//         <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
//         {restaurantId && (
//           <div className="flex items-center gap-2 mt-1.5 text-xs text-orange-700 dark:text-orange-300">
//             <Utensils className="w-3 h-3" />
//             {loading === "pending" ? (
//               <Loader2 className="w-3 h-3 animate-spin" />
//             ) : error ? (
//               <span className="text-xs text-red-500">Error</span>
//             ) : (
//               <span>{restaurant?.name || "Restaurant not found"}</span>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
//   const renderDetails = () => (
//     <div className="text-sm text-gray-500">
//       {!isDiscount ? (
//         <>
//           <p className="flex items-center gap-1 mb-1">
//             <span className="font-medium">Category:</span>
//             <span
//               className={`px-2 py-1 rounded-full text-xs ${
//                 (
//                   item as
//                     | IMenuItemFetched
//                     | IPopularItemFetched
//                     | IFeaturedItemFetched
//                 ).category === "veg" ||
//                 (
//                   item as
//                     | IMenuItemFetched
//                     | IPopularItemFetched
//                     | IFeaturedItemFetched
//                 ).category === "Vegetarian"
//                   ? "bg-green-100 text-green-800"
//                   : "bg-red-100 text-red-800"
//               }`}
//             >
//               {
//                 (
//                   item as
//                     | IMenuItemFetched
//                     | IPopularItemFetched
//                     | IFeaturedItemFetched
//                 ).category
//               }
//             </span>
//           </p>
//           {"cookTime" in item && (
//             <p className="flex items-center gap-1">
//               <Clock className="w-3 h-3" />
//               {item.cookTime}
//             </p>
//           )}
//           {"cookingTime" in item && (
//             <p className="flex items-center gap-1">
//               <Clock className="w-3 h-3" />
//               {item.cookingTime}
//             </p>
//           )}
//         </>
//       ) : (
//         <>
//           <p className="flex items-center gap-1 mb-1">
//             <span className="font-medium">Applies To:</span>
//             <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
//               {(item as IDiscountFetched).appliesTo}
//             </span>
//           </p>
//           <p className="flex items-center gap-1">
//             <Clock className="w-3 h-3" />
//             {getTimeLeft((item as IDiscountFetched).validTo)}
//           </p>
//         </>
//       )}
//     </div>
//   );
//   const renderPrice = () => (
//     <div>
//       {!isDiscount ? (
//         <>
//           <p className="font-bold text-orange-600">
//             ₦
//             {
//               (
//                 item as
//                   | IMenuItemFetched
//                   | IPopularItemFetched
//                   | IFeaturedItemFetched
//               ).price
//             }
//           </p>
//           {"originalPrice" in item &&
//             item.originalPrice &&
//             item.originalPrice !==
//               (item as IMenuItemFetched | IPopularItemFetched).price && (
//               <p className="text-sm text-gray-500 line-through">
//                 ₦{item.originalPrice}
//               </p>
//             )}
//         </>
//       ) : (
//         <p className="font-bold text-orange-600">
//           {(item as IDiscountFetched).discountType === "percentage"
//             ? `${(item as IDiscountFetched).discountValue}%`
//             : `₦${(item as IDiscountFetched).discountValue}`}
//         </p>
//       )}
//     </div>
//   );
//   const renderRating = () => (
//     <>
//       {!isDiscount && "rating" in item ? (
//         <div className="flex items-center gap-1">
//           <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
//           <span className="text-sm font-medium">
//             {(item as IPopularItemFetched | IFeaturedItemFetched).rating}
//           </span>
//           {"reviewCount" in item && (
//             <span className="text-xs text-gray-500">
//               ({(item as IPopularItemFetched).reviewCount})
//             </span>
//           )}
//         </div>
//       ) : (
//         <span className="text-sm text-gray-500">N/A</span>
//       )}
//     </>
//   );
//   const renderActions = () => (
//     <div className="flex gap-2">
//       <Button
//         onClick={() => handleApproval(item.$id, true)}
//         disabled={item.isApproved}
//         className={`p-2 rounded-lg transition ${
//           item.isApproved
//             ? "bg-gray-100 text-gray-400 cursor-not-allowed"
//             : "bg-green-600 text-white hover:bg-green-700"
//         }`}
//         title="Approve"
//       >
//         <CheckCircle className="w-4 h-4" />
//       </Button>
//       <Button
//         onClick={() => handleApproval(item.$id, false)}
//         disabled={!item.isApproved && item.isApproved !== undefined}
//         className={`p-2 rounded-lg transition ${
//           !item.isApproved && item.isApproved !== undefined
//             ? "bg-gray-100 text-gray-400 cursor-not-allowed"
//             : "bg-red-600 text-white hover:bg-red-700"
//         }`}
//         title="Reject"
//       >
//         <XCircle className="w-4 h-4" />
//       </Button>
//       <button
//         onClick={() => handleEdit(item)}
//         className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
//         title="Edit"
//       >
//         <Edit2 className="w-4 h-4" />
//       </button>
//       <button
//         onClick={() => handleDeleteClick(item)}
//         className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
//         title="Delete"
//       >
//         <Trash2 className="w-4 h-4" />
//       </button>
//     </div>
//   );
//   return (
//     <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition">
//       <td className="py-4 px-6">{renderContent()}</td>
//       <td className="py-4 px-6">{renderDetails()}</td>
//       <td className="py-4 px-6">{renderPrice()}</td>
//       <td className="py-4 px-6">{renderRating()}</td>
//       <td className="py-4 px-6">
//         <div className="flex flex-wrap gap-2">
//           {getApprovalBadge(item.isApproved)}
//           {getPausedBadge((item as any).isPaused)}
//         </div>
//       </td>
//       <td className="py-4 px-6">{renderActions()}</td>
//     </tr>
//   );
// };
// // MobileItem component for mobile view (renders <div>)
// const MobileItem = ({
//   item,
//   activeContentTab,
//   handleApproval,
//   handleEdit,
//   handleDeleteClick,
// }: {
//   item: ContentItem;
//   activeContentTab: ContentType;
//   handleApproval: (itemId: string, isApproved: boolean) => Promise<void>;
//   handleEdit: (item: ContentItem) => void;
//   handleDeleteClick: (item: ContentItem) => void;
// }) => {
//   const isDiscount = activeContentTab === "discount";
//   const restaurantId = isDiscount
//     ? (item as IDiscountFetched).restaurantId
//     : "restaurantId" in item
//     ? item.restaurantId
//     : (item as any).restaurant || "";
//   const { restaurant, loading, error } = useRestaurantById(
//     restaurantId || null
//   );
//   const getTimeLeft = (endDate: string) => {
//     const now = new Date();
//     const end = new Date(endDate);
//     const diff = end.getTime() - now.getTime();
//     if (diff < 0) return "Expired";
//     const days = Math.floor(diff / (1000 * 60 * 60 * 24));
//     const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
//     return `${days}d ${hours}h left`;
//   };
//   const getApprovalBadge = (isApproved: boolean | undefined) => {
//     if (isApproved) {
//       return (
//         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
//           <CheckCircle className="w-3 h-3 mr-1" />
//           Approved
//         </span>
//       );
//     }
//     return (
//       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
//         <Clock className="w-3 h-3 mr-1" />
//         Pending
//       </span>
//     );
//   };
//   return (
//     <div className="lg:hidden bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-4">
//       <div className="flex gap-3 mb-3">
//         <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 relative">
//           {item.image ? (
//             <Image
//               src={fileUrl(getBucketId(activeContentTab), item.image as string)}
//               alt={"title" in item ? item.title : item.name}
//               className="w-full h-full object-cover"
//               onError={(e) => {
//                 const target = e.target as HTMLImageElement;
//                 target.style.display = "none";
//                 target.nextElementSibling?.classList.remove("hidden");
//               }}
//               width={50}
//               height={50}
//             />
//           ) : null}
//           <div
//             className={`w-full h-full flex items-center justify-center text-gray-400 absolute top-0 left-0 ${
//               item.image ? "hidden" : ""
//             }`}
//           >
//             <ImageIcon className="w-6 h-6" />
//           </div>
//         </div>
//         <div className="flex-1">
//           <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
//             {"title" in item ? item.title : item.name}
//           </h3>
//           <p className="text-sm text-gray-500 mb-2 line-clamp-2">
//             {item.description}
//           </p>
//           {restaurantId && (
//             <div className="flex items-center gap-2 mt-1.5 text-xs text-orange-700 dark:text-orange-300">
//               <Utensils className="w-3 h-3" />
//               {loading === "pending" ? (
//                 <Loader2 className="w-3 h-3 animate-spin" />
//               ) : error ? (
//                 <span className="text-xs text-red-500">Error</span>
//               ) : (
//                 <span>{restaurant?.name || "Restaurant not found"}</span>
//               )}
//             </div>
//           )}
//           <div className="flex items-center justify-between mt-2">
//             <div className="flex items-center gap-2">
//               <span className="font-bold text-orange-600">
//                 {!isDiscount
//                   ? `₦${
//                       (
//                         item as
//                           | IMenuItemFetched
//                           | IPopularItemFetched
//                           | IFeaturedItemFetched
//                       ).price
//                     }`
//                   : `${(item as IDiscountFetched).discountType} ${
//                       (item as IDiscountFetched).discountValue
//                     }`}
//               </span>
//               {!isDiscount &&
//                 "originalPrice" in item &&
//                 item.originalPrice &&
//                 item.originalPrice !==
//                   (item as IMenuItemFetched | IPopularItemFetched).price && (
//                   <span className="text-sm text-gray-500 line-through">
//                     ₦{item.originalPrice}
//                   </span>
//                 )}
//             </div>
//             {!isDiscount && "rating" in item ? (
//               <div className="flex items-center gap-1">
//                 <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
//                 <span className="text-sm font-medium">
//                   {(item as IPopularItemFetched | IFeaturedItemFetched).rating}
//                 </span>
//               </div>
//             ) : (
//               <span className="text-sm text-gray-500">N/A</span>
//             )}
//           </div>
//         </div>
//       </div>
//       <div className="space-y-3">
//         <div className="flex items-center justify-between">
//           <span
//             className={`px-2 py-1 rounded-full text-xs ${
//               !isDiscount
//                 ? (
//                     item as
//                       | IMenuItemFetched
//                       | IPopularItemFetched
//                       | IFeaturedItemFetched
//                   ).category === "veg" ||
//                   (
//                     item as
//                       | IMenuItemFetched
//                       | IPopularItemFetched
//                       | IFeaturedItemFetched
//                   ).category === "Vegetarian"
//                   ? "bg-green-100 text-green-800"
//                   : "bg-red-100 text-red-800"
//                 : "bg-blue-100 text-blue-800"
//             }`}
//           >
//             {!isDiscount
//               ? (
//                   item as
//                     | IMenuItemFetched
//                     | IPopularItemFetched
//                     | IFeaturedItemFetched
//                 ).category
//               : (item as IDiscountFetched).appliesTo}
//           </span>
//           {getApprovalBadge(item.isApproved)}
//         </div>
//         <div className="flex gap-2">
//           <Button
//             onClick={() => handleApproval(item.$id, true)}
//             disabled={item.isApproved}
//             className={`flex-1 p-2 rounded-lg transition ${
//               item.isApproved
//                 ? "bg-gray-100 text-gray-400 cursor-not-allowed"
//                 : "bg-green-600 text-white hover:bg-green-700"
//             }`}
//           >
//             <CheckCircle className="w-4 h-4 mx-auto" />
//             <span className="text-xs mt-1 block">Approve</span>
//           </Button>
//           <Button
//             onClick={() => handleApproval(item.$id, false)}
//             disabled={!item.isApproved && item.isApproved !== undefined}
//             className={`flex-1 p-2 rounded-lg transition ${
//               !item.isApproved && item.isApproved !== undefined
//                 ? "bg-gray-100 text-gray-400 cursor-not-allowed"
//                 : "bg-red-600 text-white hover:bg-red-700"
//             }`}
//           >
//             <XCircle className="w-4 h-4 mx-auto" />
//             <span className="text-xs mt-1 block">Reject</span>
//           </Button>
//           <button
//             onClick={() => handleEdit(item)}
//             className="flex-1 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
//           >
//             <Edit2 className="w-4 h-4 mx-auto" />
//             <span className="text-xs mt-1 block">Edit</span>
//           </button>
//           <button
//             onClick={() => handleDeleteClick(item)}
//             className="flex-1 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
//           >
//             <Trash2 className="w-4 h-4 mx-auto" />
//             <span className="text-xs mt-1 block">Delete</span>
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };
// // Helper function to get bucket ID
// const getBucketId = (activeContentTab: ContentType): string => {
//   const { popularBucketId, menuBucketId, featuredBucketId, discountBucketId } =
//     validateEnv();
//   switch (activeContentTab) {
//     case "menu":
//       return menuBucketId;
//     case "popular":
//       return popularBucketId;
//     case "featured":
//       return featuredBucketId;
//     case "discount":
//       return discountBucketId;
//     default:
//       return "";
//   }
// };
// export default function ContentModerationTab() {
//   // State management
//   const [activeContentTab, setActiveContentTab] = useState<ContentType>("menu");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [approvalFilter, setApprovalFilter] = useState<
//     "all" | "approved" | "pending"
//   >("all");
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 10;
//   const dispatch = useDispatch<AppDispatch>();
//   const { featuredItems } = useSelector(
//     (state: RootState) => state.featuredItem
//   );
//   const { menuItems } = useSelector((state: RootState) => state.menuItem);
//   const { popularItems } = useSelector((state: RootState) => state.popularItem);
//   const { discounts } = useSelector((state: RootState) => state.discounts);
//   // Edit/Delete states
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [showDeleteModal, setShowDeleteModal] = useState(false);
//   const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
//   const [editFormData, setEditFormData] = useState<any>({});

//   // just added
//   const [availableExtras, setAvailableExtras] = useState<IFetchedExtras[]>([]);
//   const [selectedExtrasForEdit, setSelectedExtrasForEdit] = useState<
//     IFetchedExtras[]
//     >([]);
//   const [availablePacks, setAvailablePacks] = useState<IPackFetched[]>([]);
//   const [selectedNormalExtras, setSelectedNormalExtras] = useState<
//     IFetchedExtras[]
//   >([]);
//   const [mediumPack, setMediumPack] = useState<IPackFetched | null>(null);
//   const [bigPack, setBigPack] = useState<IPackFetched | null>(null);
//   const [showExtrasModal, setShowExtrasModal] = useState(false);
//   const [currentVendorId, setCurrentVendorId] = useState<string>("");
//   const [pendingExtras, setPendingExtras] = useState<IFetchedExtras[]>([]);
//   // just added

//   const [newImage, setNewImage] = useState<File | null>(null);
//   const [isUpdating, setIsUpdating] = useState(false);
//   const [isDeleting, setIsDeleting] = useState(false);
//   const [restaurantName, setRestaurantName] = useState<string>("");
//   // Memoized getRestaurantName
//   const getRestaurantName = useCallback(
//     async (restaurantId: string, dispatch: AppDispatch): Promise<string> => {
//       try {
//         const response = await dispatch(
//           getAsyncRestaurantById(restaurantId)
//         ).unwrap();
//         return response.name || "Unknown restaurant";
//       } catch (error) {
//         console.error(
//           error instanceof Error ? error.message : "Could not fetch restaurant"
//         );
//         return "Unknown restaurant";
//       }
//     },
//     []
//   );
//   useEffect(() => {
//     if (editFormData.restaurantId && showEditModal) {
//       const fetchName = async () => {
//         const name = await getRestaurantName(
//           editFormData.restaurantId,
//           dispatch
//         );
//         setRestaurantName(name);
//       };
//       fetchName();
//     }
//   }, [editFormData.restaurantId, showEditModal, getRestaurantName, dispatch]);
//   // Effect to fetch data when tab changes
//   useEffect(() => {
//     setCurrentPage(1);
//     setError(null);
//     setLoading(true);
//     let action;
//     switch (activeContentTab) {
//       case "menu":
//         action = listAsyncMenusItem();
//         break;
//       case "popular":
//         action = listAsyncPopularItems();
//         break;
//       case "featured":
//         action = listAsyncFeaturedItems();
//         break;
//       case "discount":
//         action = listAsyncDiscounts();
//         break;
//       default:
//         setLoading(false);
//         return;
//     }
//     dispatch(action as any)
//       .then(() => setLoading(false))
//       .catch((err: any) => {
//         setError(err.message || "Failed to fetch items");
//         setLoading(false);
//       });
//   }, [activeContentTab, dispatch]);
//   // Approval handler
//   const handleApproval = async (itemId: string, isApproved: boolean) => {
//     try {
//       setIsUpdating(true);
//       let updateData = { isApproved };
//       let action;
//       switch (activeContentTab) {
//         case "menu":
//           action = updateApprovalAsyncMenuItem({
//             itemId,
//             isApproved: updateData.isApproved,
//           });
//           break;
//         case "popular":
//           action = updateApprovalAsyncPopularItem({
//             itemId,
//             isApproved: updateData.isApproved,
//           });
//           break;
//         case "featured":
//           action = updateApprovalAsyncFeaturedItem({
//             itemId,
//             isApproved: updateData.isApproved,
//           });
//           break;
//         case "discount":
//           action = updateAsyncDiscount({ id: itemId, data: updateData });
//           break;
//       }
//       if (action) {
//         await dispatch(action as any).unwrap();
//         toast.success(
//           `Item ${isApproved ? "approved" : "rejected"} successfully`
//         );
//       }
//     } catch (error) {
//       console.error("Error updating approval status:", error);
//       toast.error("Failed to update approval status");
//     } finally {
//       setIsUpdating(false);
//     }
//   };

//   // Edit handler
// const handleEdit = async (item: ContentItem) => {
//   setSelectedItem(item);

//   let formData: any = {
//     isApproved: item.isApproved ?? false,
//     needsTakeawayContainer: (item as any).needsTakeawayContainer ?? false,
//     extraPortion: false, // will be set below
//     isPaused: (item as any).isPaused ?? false,
//   };

//   if (activeContentTab === "discount") {
//     const d = item as IDiscountFetched;
//     formData = { ...formData, ...d };
//   } else {
//     const i = item as
//       | IMenuItemFetched
//       | IPopularItemFetched
//       | IFeaturedItemFetched;
//     formData = {
//       ...formData,
//       name: i.name,
//       description: i.description || "",
//       price: i.price,
//       rating: "rating" in i ? i.rating : undefined,
//       category: i.category,
//       restaurantId: i.restaurantId,
//     };

//     if (activeContentTab === "menu") {
//       const m = i as IMenuItemFetched;
//       formData.originalPrice = m.originalPrice || "";
//       formData.cookTime = m.cookTime || "";
//     } else if (activeContentTab === "popular") {
//       const p = i as IPopularItemFetched;
//       formData.originalPrice = p.originalPrice || "";
//       formData.cookingTime = p.cookingTime || "";
//       formData.reviewCount = p.reviewCount || 0;
//       formData.isPopular = p.isPopular || false;
//       formData.discount = p.discount || "";
//     }
//   }

//   setEditFormData(formData);
//   // Initialize pending extras from the item
//   const initialAttached = availableExtras.filter(ex =>
//     (item.extras as string[] || []).includes(ex.$id)
//   );
//   setPendingExtras(initialAttached);
//   setNewImage(null);

//   // === Load vendor extras + packs + detect current pack ===
//   try {
//     const restaurant = await dispatch(
//       getAsyncRestaurantById((item as any).restaurantId),
//     ).unwrap();
//     const vendorId = restaurant.vendorId;

//     setCurrentVendorId(vendorId || "");

//     if (vendorId) {
//       const allExtras = (await dispatch(
//         listAsyncExtras(vendorId),
//       ).unwrap()) as IFetchedExtras[];
//       const packs = (await dispatch(
//         listAsyncPacks(vendorId),
//       ).unwrap()) as IPackFetched[];

//       setAvailableExtras(allExtras);
//       setAvailablePacks(packs);

//       // Identify Medium & Big packs (default packs created by checkAndCreateDefaultPacks)
//       const sortedPacks = [...packs].sort((a, b) => a.price - b.price);
//       const medium = sortedPacks[0] || null; // cheapest = Medium
//       const big = sortedPacks[sortedPacks.length - 1] || null; // most expensive = Big

//       setMediumPack(medium);
//       setBigPack(big);

//       const currentExtrasIds: string[] = (item as any).extras || [];

//       // Detect if current item uses Big pack
//       const hasBigPack = big && currentExtrasIds.includes(big.$id);
//       formData.extraPortion = hasBigPack;
//       setEditFormData(formData);

//       // Separate normal extras (exclude any pack)
//       const normal = allExtras.filter(
//         (ex) =>
//           !packs.some((p) => p.$id === ex.$id) &&
//           currentExtrasIds.includes(ex.$id),
//       );
//       setSelectedNormalExtras(normal);
//     }
//   } catch (err) {
//     console.error(err);
//     toast.error("Could not load extras/packs");
//   }

//   setShowEditModal(true);
//   };

//   // Handle update
// const handleUpdate = async () => {
//   if (!selectedItem) return;

//   try {
//     setIsUpdating(true);

//    // === BUILD FINAL EXTRAS ARRAY FROM PENDING STATE ===
//     const finalExtrasIds = pendingExtras.map((e) => e.$id);

//     // Base update data
//     let updateData: any = {
//       extras: finalExtrasIds,                    // ← This is the line you asked for
//       isApproved: editFormData.isApproved,
//       isPaused: editFormData.isPaused ?? false,
//       needsTakeawayContainer: editFormData.needsTakeawayContainer ?? false,
//       extraPortion: editFormData.extraPortion ?? false,
//     };

//     if (activeContentTab !== "discount") {
//       if (editFormData.extraPortion && bigPack) {
//         finalExtrasIds.push(bigPack.$id); // Extra Portion = Big container
//       } else if (mediumPack) {
//         finalExtrasIds.push(mediumPack.$id); // No extra portion = Medium container
//       }
//     }

//     // === Type-specific fields ===
//     if (activeContentTab === "discount") {
//       updateData = {
//         ...updateData,
//         title: editFormData.title,
//         description: editFormData.description,
//         discountType: editFormData.discountType,
//         discountValue: Number(editFormData.discountValue),
//         originalPrice: Number(editFormData.originalPrice),
//         discountedPrice: Number(editFormData.discountedPrice),
//         validFrom: editFormData.validFrom,
//         validTo: editFormData.validTo,
//         minOrderValue: Number(editFormData.minOrderValue || 0),
//         maxUses: Number(editFormData.maxUses || 0),
//         code: editFormData.code || "",
//         appliesTo: editFormData.appliesTo,
//         targetId: editFormData.targetId || "",
//         isActive: editFormData.isActive,
//         restaurantId: editFormData.restaurantId,
//       };
//     } else {
//       // Non-discount items (menu, popular, featured)
//       updateData = {
//         ...updateData,
//         name: editFormData.name,
//         description: editFormData.description,
//         price: editFormData.price,
//         category: editFormData.category,
//         restaurantId: editFormData.restaurantId,
//       };

//       if (activeContentTab === "menu") {
//         updateData.originalPrice = editFormData.originalPrice || "";
//         updateData.cookTime = editFormData.cookTime || "";
//       } else if (activeContentTab === "popular") {
//         updateData.originalPrice = editFormData.originalPrice || "";
//         updateData.cookingTime = editFormData.cookingTime || "";
//         updateData.reviewCount = Number(editFormData.reviewCount || 0);
//         updateData.isPopular = editFormData.isPopular || false;
//         updateData.discount = editFormData.discount || "";
//       } else if (activeContentTab === "featured") {
//         updateData.rating = Number(editFormData.rating || 0);
//       }
//     }

//     // === Dispatch the correct update action ===
//     let action: any;
//     const itemId = selectedItem.$id;

//     switch (activeContentTab) {
//       case "menu":
//         action = updateAsyncMenuItem({ itemId, data: updateData, newImage });
//         break;
//       case "popular":
//         action = updateAsyncPopularItem({ itemId, data: updateData, newImage });
//         break;
//       case "featured":
//         action = updateAsyncFeaturedItem({
//           itemId,
//           data: updateData,
//           newImage,
//         });
//         break;
//       case "discount":
//         action = updateAsyncDiscount({
//           id: itemId,
//           data: updateData,
//           imageFile: newImage || null,
//         });
//         break;
//     }

//     if (action) {
//       await dispatch(action as any).unwrap();

//       toast.success("Item updated successfully!");

//       setShowEditModal(false);

//       // Refresh the current tab
//       if (activeContentTab === "menu") {
//         dispatch(listAsyncMenusItem());
//       } else if (activeContentTab === "popular") {
//         dispatch(listAsyncPopularItems());
//       } else if (activeContentTab === "featured") {
//         dispatch(listAsyncFeaturedItems());
//       } else {
//         dispatch(listAsyncDiscounts());
//       }
//     }
//   } catch (error: any) {
//     console.error("Update error:", error);
//     toast.error(error?.message || "Failed to update item");
//   } finally {
//     setIsUpdating(false);
//   }
//   };

//   // Delete handler
//   const handleDeleteClick = (item: ContentItem) => {
//     setSelectedItem(item);
//     setShowDeleteModal(true);
//   };
//   const confirmDelete = async () => {
//     if (!selectedItem) return;
//     try {
//       setIsDeleting(true);
//       let action;
//       switch (activeContentTab) {
//         case "menu":
//           action = deleteAsyncMenuItem({
//             itemId: selectedItem.$id,
//             imageId: selectedItem.image as string,
//           });
//           break;
//         case "popular":
//           action = deleteAsyncPopularItem({
//             itemId: selectedItem.$id,
//             imageId: selectedItem.image as string,
//           });
//           break;
//         case "featured":
//           action = deleteAsyncFeaturedItem({
//             itemId: selectedItem.$id,
//             imageId: selectedItem.image as string,
//           });
//           break;
//         case "discount":
//           action = deleteAsyncDiscount(selectedItem.$id);
//           break;
//       }
//       if (action) {
//         await dispatch(action as any).unwrap();
//         toast.success("Item deleted successfully");
//         setShowDeleteModal(false);
//         dispatch(
//           (activeContentTab === "menu"
//             ? listAsyncMenusItem()
//             : activeContentTab === "popular"
//             ? listAsyncPopularItems()
//             : activeContentTab === "featured"
//             ? listAsyncFeaturedItems()
//             : listAsyncDiscounts()) as any
//         );
//       }
//     } catch (error) {
//       toast.error("Failed to delete item");
//     } finally {
//       setIsDeleting(false);
//     }
//   };
//   // Get current items based on active tab
//   const getCurrentItems = (): ContentItem[] => {
//     switch (activeContentTab) {
//       case "menu":
//         return menuItems;
//       case "popular":
//         return popularItems;
//       case "featured":
//         return featuredItems;
//       case "discount":
//         return discounts;
//       default:
//         return [];
//     }
//   };
//   // Filter items
//   const filteredItems = getCurrentItems().filter((item) => {
//     const itemName = "title" in item ? item.title : item.name;
//     const matchesSearch =
//       itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       (item.description || "").toLowerCase().includes(searchTerm.toLowerCase());
//     const matchesApproval =
//       approvalFilter === "all" ||
//       (approvalFilter === "approved" && item.isApproved) ||
//       (approvalFilter === "pending" && !item.isApproved);
//     return matchesSearch && matchesApproval;
//   });
//   const paginatedItems = filteredItems.slice(
//     (currentPage - 1) * itemsPerPage,
//     currentPage * itemsPerPage
//   );
//   const getTabIcon = (type: ContentType) => {
//     switch (type) {
//       case "menu":
//         return <Package className="w-4 h-4" />;
//       case "popular":
//         return <TrendingUp className="w-4 h-4" />;
//       case "featured":
//         return <Award className="w-4 h-4" />;
//       case "discount":
//         return <Award className="w-4 h-4" />;
//       default:
//         return <Package className="w-4 h-4" />;
//     }
//   };
//   const handleEditChange = (
//     e: React.ChangeEvent<
//       HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
//     >
//   ) => {
//     setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
//   };
//   const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files?.[0]) {
//       setNewImage(e.target.files[0]);
//     }
//   };

//   return (
//     <>
//       <div className="mb-6">
//         <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
//           Content Moderation
//         </h2>
//         {/* Content Type Tabs */}
//         <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-6">
//           {(["menu", "popular", "featured", "discount"] as ContentType[]).map(
//             (type) => (
//               <button
//                 key={type}
//                 onClick={() => setActiveContentTab(type)}
//                 className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
//                   activeContentTab === type
//                     ? "bg-white dark:bg-gray-700 text-orange-600 shadow-sm"
//                     : "text-gray-600 dark:text-gray-300 hover:text-orange-600"
//                 }`}
//               >
//                 {getTabIcon(type)}
//                 {type.charAt(0).toUpperCase() + type.slice(1)} Items
//               </button>
//             ),
//           )}
//         </div>
//         {/* Filters */}
//         <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
//           <div className="relative flex-1 sm:flex-none">
//             <Search
//               className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
//               size={18}
//             />
//             <input
//               type="text"
//               placeholder="Search items..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="w-full pl-10 pr-4 py-2 rounded-lg border border-orange-300 focus:ring-2 focus:ring-orange-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
//             />
//           </div>
//           <div className="relative flex-1 sm:flex-none">
//             <Filter
//               className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
//               size={18}
//             />
//             <select
//               value={approvalFilter}
//               onChange={(e) =>
//                 setApprovalFilter(
//                   e.target.value as "all" | "approved" | "pending",
//                 )
//               }
//               className="w-full pl-10 pr-8 py-2 rounded-lg border border-orange-300 focus:ring-2 focus:ring-orange-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 appearance-none"
//             >
//               <option value="all">All Items</option>
//               <option value="pending">Pending Approval</option>
//               <option value="approved">Approved</option>
//             </select>
//             <ChevronDown
//               className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
//               size={18}
//             />
//           </div>
//         </div>
//       </div>
//       {/* Content */}
//       {loading ? (
//         <div className="space-y-4">
//           {[...Array(5)].map((_, index) => (
//             <div
//               key={index}
//               className="animate-pulse bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
//             >
//               <div className="flex gap-4">
//                 <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
//                 <div className="flex-1">
//                   <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
//                   <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
//                   <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       ) : error ? (
//         <div className="text-red-600 font-semibold p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
//           {error}
//         </div>
//       ) : (
//         <>
//           {/* Desktop View */}
//           <div className="hidden lg:block overflow-x-auto">
//             <table className="min-w-full bg-white dark:bg-gray-800 rounded-xl shadow-md">
//               <thead className="bg-orange-100 dark:bg-orange-900/30">
//                 <tr>
//                   <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 dark:text-gray-200">
//                     Item
//                   </th>
//                   <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 dark:text-gray-200">
//                     Details
//                   </th>
//                   <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 dark:text-gray-200">
//                     Price
//                   </th>
//                   <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 dark:text-gray-200">
//                     Rating
//                   </th>
//                   <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 dark:text-gray-200">
//                     Status
//                   </th>
//                   <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 dark:text-gray-200">
//                     Actions
//                   </th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {paginatedItems.length > 0 ? (
//                   paginatedItems.map((item) => (
//                     <ItemRow
//                       key={item.$id}
//                       item={item}
//                       activeContentTab={activeContentTab}
//                       handleApproval={handleApproval}
//                       handleEdit={handleEdit}
//                       handleDeleteClick={handleDeleteClick}
//                     />
//                   ))
//                 ) : (
//                   <tr>
//                     <td colSpan={6} className="py-8 text-center text-gray-500">
//                       No items found.
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//           {/* Mobile View */}
//           <div className="lg:hidden space-y-4">
//             {paginatedItems.length > 0 ? (
//               paginatedItems.map((item) => (
//                 <MobileItem
//                   key={item.$id}
//                   item={item}
//                   activeContentTab={activeContentTab}
//                   handleApproval={handleApproval}
//                   handleEdit={handleEdit}
//                   handleDeleteClick={handleDeleteClick}
//                 />
//               ))
//             ) : (
//               <div className="text-center text-gray-500 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md">
//                 No items found.
//               </div>
//             )}
//           </div>
//           {/* Pagination */}
//           {filteredItems.length > itemsPerPage && (
//             <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
//               <button
//                 onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
//                 disabled={currentPage === 1}
//                 className="w-full sm:w-auto px-4 py-2 bg-orange-600 text-white rounded-lg disabled:opacity-50 hover:bg-orange-700 transition text-sm"
//               >
//                 Previous
//               </button>
//               <span className="text-gray-600 dark:text-gray-300 text-sm text-center">
//                 Page {currentPage} of{" "}
//                 {Math.ceil(filteredItems.length / itemsPerPage)}
//               </span>
//               <button
//                 onClick={() =>
//                   setCurrentPage((prev) =>
//                     Math.min(
//                       prev + 1,
//                       Math.ceil(filteredItems.length / itemsPerPage),
//                     ),
//                   )
//                 }
//                 disabled={
//                   currentPage === Math.ceil(filteredItems.length / itemsPerPage)
//                 }
//                 className="w-full sm:w-auto px-4 py-2 bg-orange-600 text-white rounded-lg disabled:opacity-50 hover:bg-orange-700 transition text-sm"
//               >
//                 Next
//               </button>
//             </div>
//           )}
//         </>
//       )}
//       {/* Edit Modal */}
//       {showEditModal && selectedItem && (
//         <EditContentModal
//           activeContentTab={activeContentTab}
//           availableExtras={availableExtras}
//           bigPack={bigPack}
//           editFormData={editFormData}
//           handleEditChange={handleEditChange}
//           handleEditFileChange={handleEditFileChange}
//           handleUpdate={handleUpdate}
//           isUpdating={isUpdating}
//           mediumPack={mediumPack}
//           newImage={newImage}
//           restaurantName={restaurantName}

//           setEditFormData={setEditFormData}

//           setShowEditModal={setShowEditModal}
//           setShowExtrasModal={setShowExtrasModal}
//           pendingExtras={pendingExtras}
//           setPendingExtras={setPendingExtras}
//           selectedItem={selectedItem}
//           currentVendorId={currentVendorId}
//           showExtrasModal={showExtrasModal}
//         />
//       )}
//       {/* Delete Confirmation Modal */}
//       {showDeleteModal && (
//         <DeleteConfirmModal
//           setShowDeleteModal={setShowDeleteModal}
//           confirmDelete={confirmDelete}
//           isDeleting={isDeleting}
//         />
//       )}
//       {/* Vendor Extras Modal */}
//       <VendorExtrasModal
//         vendorId={currentVendorId}
//         isOpen={showExtrasModal}
//         onClose={() => setShowExtrasModal(false)}
//         item={selectedItem}
//         currentPendingIds={pendingExtras.map((e) => e.$id)}
//         onPendingChange={(newIds) => {
//           const newSelected = availableExtras.filter((ex) =>
//             newIds.includes(ex.$id),
//           );
//           setPendingExtras(newSelected);
//         }}
//       />
//     </>
//   );
// }

"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  IMenuItemFetched,
  IPopularItemFetched,
  IFeaturedItemFetched,
  IDiscountFetched,
  IRestaurantFetched,
} from "../../types/types";
import { fileUrl, validateEnv } from "@/utils/appwrite";
import toast from "react-hot-toast";
import {
  Search,
  Filter,
  ChevronDown,
  CheckCircle,
  XCircle,
  Star,
  Clock,
  Image as ImageIcon,
  Package,
  TrendingUp,
  Award,
  Edit2,
  Trash2,
  Loader2,
  Utensils,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/state/store";
import {
  listAsyncFeaturedItems,
  updateAsyncFeaturedItem,
  deleteAsyncFeaturedItem,
  updateApprovalAsyncFeaturedItem,
} from "@/state/featuredSlice";
import {
  listAsyncPopularItems,
  updateAsyncPopularItem,
  deleteAsyncPopularItem,
  updateApprovalAsyncPopularItem,
} from "@/state/popularSlice";
import {
  listAsyncMenusItem,
  updateAsyncMenuItem,
  deleteAsyncMenuItem,
  updateApprovalAsyncMenuItem,
} from "@/state/menuSlice";
import {
  listAsyncDiscounts,
  updateAsyncDiscount,
  deleteAsyncDiscount,
} from "@/state/discountSlice";
import {
  getAsyncRestaurantById,
  listAsyncRestaurants,
} from "@/state/restaurantSlice";
import { useRestaurantById } from "@/hooks/useRestaurant";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

// just added
import ExtrasSelector from "./forms/ExtrasSelector"; // adjust path if needed
import { listAsyncExtras } from "@/state/extraSlice";
import { IFetchedExtras } from "../../types/types";
import { IPackFetched } from "../../types/types";
import { listAsyncPacks } from "@/state/extraSlice";
import VendorExtrasModal from "./admin/VendorExtrasModal";
import DeleteConfirmModal from "./admin/DeleteConfirmModal";
import EditContentModal from "./admin/EditContentModal";

type ContentType = "menu" | "popular" | "featured" | "discount";
type ContentItem =
  | IMenuItemFetched
  | IPopularItemFetched
  | IFeaturedItemFetched
  | IDiscountFetched;
// ItemRow component for desktop view (renders <tr>)
const ItemRow = ({
  item,
  activeContentTab,
  handleApproval,
  handleEdit,
  handleDeleteClick,
}: {
  item: ContentItem;
  activeContentTab: ContentType;
  handleApproval: (itemId: string, isApproved: boolean) => Promise<void>;
  handleEdit: (item: ContentItem) => void;
  handleDeleteClick: (item: ContentItem) => void;
}) => {
  const isDiscount = activeContentTab === "discount";
  const restaurantId = isDiscount
    ? (item as IDiscountFetched).restaurantId
    : "restaurantId" in item
      ? item.restaurantId
      : (item as any).restaurant || "";
  const { restaurant, loading, error } = useRestaurantById(
    restaurantId || null,
  );
  const getTimeLeft = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    if (diff < 0) return "Expired";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h left`;
  };
  const getApprovalBadge = (isApproved: boolean | undefined) => {
    if (isApproved) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </span>
    );
  };
  const getPausedBadge = (isPaused?: boolean) => {
    if (!isPaused) return null;
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
        <XCircle className="w-3 h-3 mr-1" />
        PAUSED
      </span>
    );
  };
  // Common content for both desktop and mobile views
  const renderContent = () => (
    <div className="flex items-center gap-3">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 relative">
        {item.image ? (
          <Image
            src={fileUrl(getBucketId(activeContentTab), item.image as string)}
            alt={"title" in item ? item.title : item.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              target.nextElementSibling?.classList.remove("hidden");
            }}
            width={50}
            height={50}
            quality={100}
          />
        ) : null}
        <div
          className={`w-full h-full flex items-center justify-center text-gray-400 absolute top-0 left-0 ${
            item.image ? "hidden" : ""
          }`}
        >
          <ImageIcon className="w-6 h-6" />
        </div>
      </div>
      <div>
        <p className="font-medium text-gray-900 dark:text-gray-100">
          {"title" in item ? item.title : item.name}
        </p>
        <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
        {restaurantId && (
          <div className="flex items-center gap-2 mt-1.5 text-xs text-orange-700 dark:text-orange-300">
            <Utensils className="w-3 h-3" />
            {loading === "pending" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : error ? (
              <span className="text-xs text-red-500">Error</span>
            ) : (
              <span>{restaurant?.name || "Restaurant not found"}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
  const renderDetails = () => (
    <div className="text-sm text-gray-500">
      {!isDiscount ? (
        <>
          <p className="flex items-center gap-1 mb-1">
            <span className="font-medium">Category:</span>
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                (
                  item as
                    | IMenuItemFetched
                    | IPopularItemFetched
                    | IFeaturedItemFetched
                ).category === "veg" ||
                (
                  item as
                    | IMenuItemFetched
                    | IPopularItemFetched
                    | IFeaturedItemFetched
                ).category === "Vegetarian"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {
                (
                  item as
                    | IMenuItemFetched
                    | IPopularItemFetched
                    | IFeaturedItemFetched
                ).category
              }
            </span>
          </p>
          {"cookTime" in item && (
            <p className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {item.cookTime}
            </p>
          )}
          {"cookingTime" in item && (
            <p className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {item.cookingTime}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="flex items-center gap-1 mb-1">
            <span className="font-medium">Applies To:</span>
            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
              {(item as IDiscountFetched).appliesTo}
            </span>
          </p>
          <p className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {getTimeLeft((item as IDiscountFetched).validTo)}
          </p>
        </>
      )}
    </div>
  );
  const renderPrice = () => (
    <div>
      {!isDiscount ? (
        <>
          <p className="font-bold text-orange-600">
            ₦
            {
              (
                item as
                  | IMenuItemFetched
                  | IPopularItemFetched
                  | IFeaturedItemFetched
              ).price
            }
          </p>
          {"originalPrice" in item &&
            item.originalPrice &&
            item.originalPrice !==
              (item as IMenuItemFetched | IPopularItemFetched).price && (
              <p className="text-sm text-gray-500 line-through">
                ₦{item.originalPrice}
              </p>
            )}
        </>
      ) : (
        <p className="font-bold text-orange-600">
          {(item as IDiscountFetched).discountType === "percentage"
            ? `${(item as IDiscountFetched).discountValue}%`
            : `₦${(item as IDiscountFetched).discountValue}`}
        </p>
      )}
    </div>
  );
  const renderRating = () => (
    <>
      {!isDiscount && "rating" in item ? (
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-medium">
            {(item as IPopularItemFetched | IFeaturedItemFetched).rating}
          </span>
          {"reviewCount" in item && (
            <span className="text-xs text-gray-500">
              ({(item as IPopularItemFetched).reviewCount})
            </span>
          )}
        </div>
      ) : (
        <span className="text-sm text-gray-500">N/A</span>
      )}
    </>
  );
  const renderActions = () => (
    <div className="flex gap-2">
      <Button
        onClick={() => handleApproval(item.$id, true)}
        disabled={item.isApproved}
        className={`p-2 rounded-lg transition ${
          item.isApproved
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-green-600 text-white hover:bg-green-700"
        }`}
        title="Approve"
      >
        <CheckCircle className="w-4 h-4" />
      </Button>
      <Button
        onClick={() => handleApproval(item.$id, false)}
        disabled={!item.isApproved && item.isApproved !== undefined}
        className={`p-2 rounded-lg transition ${
          !item.isApproved && item.isApproved !== undefined
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-red-600 text-white hover:bg-red-700"
        }`}
        title="Reject"
      >
        <XCircle className="w-4 h-4" />
      </Button>
      <button
        onClick={() => handleEdit(item)}
        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        title="Edit"
      >
        <Edit2 className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleDeleteClick(item)}
        className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        title="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
  return (
    <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition">
      <td className="py-4 px-6">{renderContent()}</td>
      <td className="py-4 px-6">{renderDetails()}</td>
      <td className="py-4 px-6">{renderPrice()}</td>
      <td className="py-4 px-6">{renderRating()}</td>
      <td className="py-4 px-6">
        <div className="flex flex-wrap gap-2">
          {getApprovalBadge(item.isApproved)}
          {getPausedBadge((item as any).isPaused)}
        </div>
      </td>
      <td className="py-4 px-6">{renderActions()}</td>
    </tr>
  );
};
// MobileItem component for mobile view (renders <div>)
const MobileItem = ({
  item,
  activeContentTab,
  handleApproval,
  handleEdit,
  handleDeleteClick,
}: {
  item: ContentItem;
  activeContentTab: ContentType;
  handleApproval: (itemId: string, isApproved: boolean) => Promise<void>;
  handleEdit: (item: ContentItem) => void;
  handleDeleteClick: (item: ContentItem) => void;
}) => {
  const isDiscount = activeContentTab === "discount";
  const restaurantId = isDiscount
    ? (item as IDiscountFetched).restaurantId
    : "restaurantId" in item
      ? item.restaurantId
      : (item as any).restaurant || "";
  const { restaurant, loading, error } = useRestaurantById(
    restaurantId || null,
  );
  const getTimeLeft = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    if (diff < 0) return "Expired";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h left`;
  };
  const getApprovalBadge = (isApproved: boolean | undefined) => {
    if (isApproved) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </span>
    );
  };
  const getPausedBadge = (isPaused?: boolean) => {
    if (!isPaused) return null;
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
        <XCircle className="w-3 h-3 mr-1" />
        PAUSED
      </span>
    );
  };
  return (
    <div className="lg:hidden bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-4">
      <div className="flex gap-3 mb-3">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 relative">
          {item.image ? (
            <Image
              src={fileUrl(getBucketId(activeContentTab), item.image as string)}
              alt={"title" in item ? item.title : item.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                target.nextElementSibling?.classList.remove("hidden");
              }}
              width={50}
              height={50}
            />
          ) : null}
          <div
            className={`w-full h-full flex items-center justify-center text-gray-400 absolute top-0 left-0 ${
              item.image ? "hidden" : ""
            }`}
          >
            <ImageIcon className="w-6 h-6" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
            {"title" in item ? item.title : item.name}
          </h3>
          <p className="text-sm text-gray-500 mb-2 line-clamp-2">
            {item.description}
          </p>
          {restaurantId && (
            <div className="flex items-center gap-2 mt-1.5 text-xs text-orange-700 dark:text-orange-300">
              <Utensils className="w-3 h-3" />
              {loading === "pending" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : error ? (
                <span className="text-xs text-red-500">Error</span>
              ) : (
                <span>{restaurant?.name || "Restaurant not found"}</span>
              )}
            </div>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="font-bold text-orange-600">
              {!isDiscount
                ? `₦${
                    (
                      item as
                        | IMenuItemFetched
                        | IPopularItemFetched
                        | IFeaturedItemFetched
                    ).price
                  }`
                : `${(item as IDiscountFetched).discountType} ${
                    (item as IDiscountFetched).discountValue
                  }`}
            </span>
            {!isDiscount &&
              "originalPrice" in item &&
              item.originalPrice &&
              item.originalPrice !==
                (item as IMenuItemFetched | IPopularItemFetched).price && (
                <span className="text-sm text-gray-500 line-through">
                  ₦{item.originalPrice}
                </span>
              )}
            {!isDiscount && "rating" in item ? (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">
                  {(item as IPopularItemFetched | IFeaturedItemFetched).rating}
                </span>
              </div>
            ) : (
              <span className="text-sm text-gray-500">N/A</span>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between mt-2">
          <span
            className={`px-2 py-1 rounded-full text-xs ${
              !isDiscount
                ? (
                    item as
                      | IMenuItemFetched
                      | IPopularItemFetched
                      | IFeaturedItemFetched
                  ).category === "veg" ||
                  (
                    item as
                      | IMenuItemFetched
                      | IPopularItemFetched
                      | IFeaturedItemFetched
                  ).category === "Vegetarian"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {!isDiscount
              ? (
                  item as
                    | IMenuItemFetched
                    | IPopularItemFetched
                    | IFeaturedItemFetched
                ).category
              : (item as IDiscountFetched).appliesTo}
          </span>
          <div className="flex gap-2">
            {getApprovalBadge(item.isApproved)}
            {getPausedBadge((item as any).isPaused)}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => handleApproval(item.$id, true)}
            disabled={item.isApproved}
            className={`flex-1 p-2 rounded-lg transition ${
              item.isApproved
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            <CheckCircle className="w-4 h-4 mx-auto" />
            <span className="text-xs mt-1 block">Approve</span>
          </Button>
          <Button
            onClick={() => handleApproval(item.$id, false)}
            disabled={!item.isApproved && item.isApproved !== undefined}
            className={`flex-1 p-2 rounded-lg transition ${
              !item.isApproved && item.isApproved !== undefined
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
          >
            <XCircle className="w-4 h-4 mx-auto" />
            <span className="text-xs mt-1 block">Reject</span>
          </Button>
          <button
            onClick={() => handleEdit(item)}
            className="flex-1 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Edit2 className="w-4 h-4 mx-auto" />
            <span className="text-xs mt-1 block">Edit</span>
          </button>
          <button
            onClick={() => handleDeleteClick(item)}
            className="flex-1 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            <Trash2 className="w-4 h-4 mx-auto" />
            <span className="text-xs mt-1 block">Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};
// Helper function to get bucket ID
const getBucketId = (activeContentTab: ContentType): string => {
  const { popularBucketId, menuBucketId, featuredBucketId, discountBucketId } =
    validateEnv();
  switch (activeContentTab) {
    case "menu":
      return menuBucketId;
    case "popular":
      return popularBucketId;
    case "featured":
      return featuredBucketId;
    case "discount":
      return discountBucketId;
    default:
      return "";
  }
};
export default function ContentModerationTab() {
  // State management
  const [activeContentTab, setActiveContentTab] = useState<ContentType>("menu");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [approvalFilter, setApprovalFilter] = useState<
    "all" | "approved" | "pending"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const dispatch = useDispatch<AppDispatch>();
  const { featuredItems } = useSelector(
    (state: RootState) => state.featuredItem,
  );
  const { menuItems } = useSelector((state: RootState) => state.menuItem);
  const { popularItems } = useSelector((state: RootState) => state.popularItem);
  const { discounts } = useSelector((state: RootState) => state.discounts);
  // Edit/Delete states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  // just added
  const [availableExtras, setAvailableExtras] = useState<IFetchedExtras[]>([]);
  const [selectedExtrasForEdit, setSelectedExtrasForEdit] = useState<
    IFetchedExtras[]
  >([]);
  const [availablePacks, setAvailablePacks] = useState<IPackFetched[]>([]);
  const [selectedNormalExtras, setSelectedNormalExtras] = useState<
    IFetchedExtras[]
  >([]);
  const [mediumPack, setMediumPack] = useState<IPackFetched | null>(null);
  const [bigPack, setBigPack] = useState<IPackFetched | null>(null);
  const [showExtrasModal, setShowExtrasModal] = useState(false);
  const [currentVendorId, setCurrentVendorId] = useState<string>("");
  const [pendingExtras, setPendingExtras] = useState<IFetchedExtras[]>([]);
  // just added

  const [newImage, setNewImage] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [restaurantMap, setRestaurantMap] = useState<Record<string, string>>(
    {},
  );
  // Memoized getRestaurantName
  const getRestaurantName = useCallback(
    async (restaurantId: string, dispatch: AppDispatch): Promise<string> => {
      try {
        const response = await dispatch(
          getAsyncRestaurantById(restaurantId),
        ).unwrap();
        return response.name || "Unknown restaurant";
      } catch (error) {
        console.error(
          error instanceof Error ? error.message : "Could not fetch restaurant",
        );
        return "Unknown restaurant";
      }
    },
    [],
  );
  useEffect(() => {
    if (editFormData.restaurantId && showEditModal) {
      const fetchName = async () => {
        const name = await getRestaurantName(
          editFormData.restaurantId,
          dispatch,
        );
        setRestaurantName(name);
      };
      fetchName();
    }
  }, [editFormData.restaurantId, showEditModal, getRestaurantName, dispatch]);
  // Load all restaurants once so we can search by name (Kilimanjaro, etc.)
  useEffect(() => {
    dispatch(listAsyncRestaurants())
      .unwrap()
      .then((restaurants: IRestaurantFetched[]) => {
        const map: Record<string, string> = {};
        restaurants.forEach((r) => {
          if (r.$id && r.name) map[r.$id] = r.name;
        });
        setRestaurantMap(map);
      })
      .catch(() => {
        // Silent fail – search will still work by ID
      });
  }, [dispatch]);
  // Effect to fetch data when tab changes
  useEffect(() => {
    setCurrentPage(1);
    setError(null);
    setLoading(true);
    let action;
    switch (activeContentTab) {
      case "menu":
        action = listAsyncMenusItem();
        break;
      case "popular":
        action = listAsyncPopularItems();
        break;
      case "featured":
        action = listAsyncFeaturedItems();
        break;
      case "discount":
        action = listAsyncDiscounts();
        break;
      default:
        setLoading(false);
        return;
    }
    dispatch(action as any)
      .then(() => setLoading(false))
      .catch((err: any) => {
        setError(err.message || "Failed to fetch items");
        setLoading(false);
      });
  }, [activeContentTab, dispatch]);
  // Approval handler
  const handleApproval = async (itemId: string, isApproved: boolean) => {
    try {
      setIsUpdating(true);
      let updateData = { isApproved };
      let action;
      switch (activeContentTab) {
        case "menu":
          action = updateApprovalAsyncMenuItem({
            itemId,
            isApproved: updateData.isApproved,
          });
          break;
        case "popular":
          action = updateApprovalAsyncPopularItem({
            itemId,
            isApproved: updateData.isApproved,
          });
          break;
        case "featured":
          action = updateApprovalAsyncFeaturedItem({
            itemId,
            isApproved: updateData.isApproved,
          });
          break;
        case "discount":
          action = updateAsyncDiscount({ id: itemId, data: updateData });
          break;
      }
      if (action) {
        await dispatch(action as any).unwrap();
        toast.success(
          `Item ${isApproved ? "approved" : "rejected"} successfully`,
        );
      }
    } catch (error) {
      console.error("Error updating approval status:", error);
      toast.error("Failed to update approval status");
    } finally {
      setIsUpdating(false);
    }
  };

  // Edit handler
  const handleEdit = async (item: ContentItem) => {
    setSelectedItem(item);

    let formData: any = {
      isApproved: item.isApproved ?? false,
      needsTakeawayContainer: (item as any).needsTakeawayContainer ?? false,
      extraPortion: false, // will be set below
      isPaused: (item as any).isPaused ?? false,
    };

    if (activeContentTab === "discount") {
      const d = item as IDiscountFetched;
      formData = { ...formData, ...d };
    } else {
      const i = item as
        | IMenuItemFetched
        | IPopularItemFetched
        | IFeaturedItemFetched;
      formData = {
        ...formData,
        name: i.name,
        description: i.description || "",
        price: i.price,
        rating: "rating" in i ? i.rating : undefined,
        category: i.category,
        restaurantId: i.restaurantId,
      };

      if (activeContentTab === "menu") {
        const m = i as IMenuItemFetched;
        formData.originalPrice = m.originalPrice || "";
        formData.cookTime = m.cookTime || "";
      } else if (activeContentTab === "popular") {
        const p = i as IPopularItemFetched;
        formData.originalPrice = p.originalPrice || "";
        formData.cookingTime = p.cookingTime || "";
        formData.reviewCount = p.reviewCount || 0;
        formData.isPopular = p.isPopular || false;
        formData.discount = p.discount || "";
      }
    }

    setEditFormData(formData);
    // Initialize pending extras from the item
    const initialAttached = availableExtras.filter((ex) =>
      ((item.extras as string[]) || []).includes(ex.$id),
    );
    setPendingExtras(initialAttached);
    setNewImage(null);

    // === Load vendor extras + packs + detect current pack ===
    try {
      const restaurant = await dispatch(
        getAsyncRestaurantById((item as any).restaurantId),
      ).unwrap();
      const vendorId = restaurant.vendorId;

      setCurrentVendorId(vendorId || "");

      if (vendorId) {
        const allExtras = (await dispatch(
          listAsyncExtras(vendorId),
        ).unwrap()) as IFetchedExtras[];
        const packs = (await dispatch(
          listAsyncPacks(vendorId),
        ).unwrap()) as IPackFetched[];

        setAvailableExtras(allExtras);
        setAvailablePacks(packs);

        // Identify Medium & Big packs (default packs created by checkAndCreateDefaultPacks)
        const sortedPacks = [...packs].sort((a, b) => a.price - b.price);
        const medium = sortedPacks[0] || null; // cheapest = Medium
        const big = sortedPacks[sortedPacks.length - 1] || null; // most expensive = Big

        setMediumPack(medium);
        setBigPack(big);

        const currentExtrasIds: string[] = (item as any).extras || [];

        // Detect if current item uses Big pack
        const hasBigPack = big && currentExtrasIds.includes(big.$id);
        formData.extraPortion = hasBigPack;
        setEditFormData(formData);

        // Separate normal extras (exclude any pack)
        const normal = allExtras.filter(
          (ex) =>
            !packs.some((p) => p.$id === ex.$id) &&
            currentExtrasIds.includes(ex.$id),
        );
        setSelectedNormalExtras(normal);
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not load extras/packs");
    }

    setShowEditModal(true);
  };

  // Handle update
  const handleUpdate = async () => {
    if (!selectedItem) return;

    try {
      setIsUpdating(true);

      // === BUILD FINAL EXTRAS ARRAY FROM PENDING STATE ===
      const finalExtrasIds = pendingExtras.map((e) => e.$id);

      // Base update data
      let updateData: any = {
        extras: finalExtrasIds, // ← This is the line you asked for
        isApproved: editFormData.isApproved,
        isPaused: editFormData.isPaused ?? false,
        needsTakeawayContainer: editFormData.needsTakeawayContainer ?? false,
        extraPortion: editFormData.extraPortion ?? false,
      };

      if (activeContentTab !== "discount") {
        if (editFormData.extraPortion && bigPack) {
          finalExtrasIds.push(bigPack.$id); // Extra Portion = Big container
        } else if (mediumPack) {
          finalExtrasIds.push(mediumPack.$id); // No extra portion = Medium container
        }
      }

      // === Type-specific fields ===
      if (activeContentTab === "discount") {
        updateData = {
          ...updateData,
          title: editFormData.title,
          description: editFormData.description,
          discountType: editFormData.discountType,
          discountValue: Number(editFormData.discountValue),
          originalPrice: Number(editFormData.originalPrice),
          discountedPrice: Number(editFormData.discountedPrice),
          validFrom: editFormData.validFrom,
          validTo: editFormData.validTo,
          minOrderValue: Number(editFormData.minOrderValue || 0),
          maxUses: Number(editFormData.maxUses || 0),
          code: editFormData.code || "",
          appliesTo: editFormData.appliesTo,
          targetId: editFormData.targetId || "",
          isActive: editFormData.isActive,
          restaurantId: editFormData.restaurantId,
        };
      } else {
        // Non-discount items (menu, popular, featured)
        updateData = {
          ...updateData,
          name: editFormData.name,
          description: editFormData.description,
          price: editFormData.price,
          category: editFormData.category,
          restaurantId: editFormData.restaurantId,
        };

        if (activeContentTab === "menu") {
          updateData.originalPrice = editFormData.originalPrice || "";
          updateData.cookTime = editFormData.cookTime || "";
        } else if (activeContentTab === "popular") {
          updateData.originalPrice = editFormData.originalPrice || "";
          updateData.cookingTime = editFormData.cookingTime || "";
          updateData.reviewCount = Number(editFormData.reviewCount || 0);
          updateData.isPopular = editFormData.isPopular || false;
          updateData.discount = editFormData.discount || "";
        } else if (activeContentTab === "featured") {
          updateData.rating = Number(editFormData.rating || 0);
        }
      }

      // === Dispatch the correct update action ===
      let action: any;
      const itemId = selectedItem.$id;

      switch (activeContentTab) {
        case "menu":
          action = updateAsyncMenuItem({ itemId, data: updateData, newImage });
          break;
        case "popular":
          action = updateAsyncPopularItem({
            itemId,
            data: updateData,
            newImage,
          });
          break;
        case "featured":
          action = updateAsyncFeaturedItem({
            itemId,
            data: updateData,
            newImage,
          });
          break;
        case "discount":
          action = updateAsyncDiscount({
            id: itemId,
            data: updateData,
            imageFile: newImage || null,
          });
          break;
      }

      if (action) {
        await dispatch(action as any).unwrap();

        toast.success("Item updated successfully!");

        setShowEditModal(false);

        // Refresh the current tab
        if (activeContentTab === "menu") {
          dispatch(listAsyncMenusItem());
        } else if (activeContentTab === "popular") {
          dispatch(listAsyncPopularItems());
        } else if (activeContentTab === "featured") {
          dispatch(listAsyncFeaturedItems());
        } else {
          dispatch(listAsyncDiscounts());
        }
      }
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error?.message || "Failed to update item");
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete handler
  const handleDeleteClick = (item: ContentItem) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };
  const confirmDelete = async () => {
    if (!selectedItem) return;
    try {
      setIsDeleting(true);
      let action;
      switch (activeContentTab) {
        case "menu":
          action = deleteAsyncMenuItem({
            itemId: selectedItem.$id,
            imageId: selectedItem.image as string,
          });
          break;
        case "popular":
          action = deleteAsyncPopularItem({
            itemId: selectedItem.$id,
            imageId: selectedItem.image as string,
          });
          break;
        case "featured":
          action = deleteAsyncFeaturedItem({
            itemId: selectedItem.$id,
            imageId: selectedItem.image as string,
          });
          break;
        case "discount":
          action = deleteAsyncDiscount(selectedItem.$id);
          break;
      }
      if (action) {
        await dispatch(action as any).unwrap();
        toast.success("Item deleted successfully");
        setShowDeleteModal(false);
        dispatch(
          (activeContentTab === "menu"
            ? listAsyncMenusItem()
            : activeContentTab === "popular"
              ? listAsyncPopularItems()
              : activeContentTab === "featured"
                ? listAsyncFeaturedItems()
                : listAsyncDiscounts()) as any,
        );
      }
    } catch (error) {
      toast.error("Failed to delete item");
    } finally {
      setIsDeleting(false);
    }
  };
  // Get current items based on active tab
  const getCurrentItems = (): ContentItem[] => {
    switch (activeContentTab) {
      case "menu":
        return menuItems;
      case "popular":
        return popularItems;
      case "featured":
        return featuredItems;
      case "discount":
        return discounts;
      default:
        return [];
    }
  };
  // Filter items – now searches by item name, description, restaurant ID **AND restaurant name**
  const filteredItems = getCurrentItems().filter((item) => {
    const itemName = "title" in item ? item.title : item.name || "";
    const restaurantId =
      activeContentTab === "discount"
        ? (item as IDiscountFetched).restaurantId
        : "restaurantId" in item
          ? item.restaurantId
          : (item as any).restaurant || "";

    const restaurantName = restaurantMap[restaurantId] || "";
    const searchLower = searchTerm.toLowerCase().trim();

    const matchesSearch =
      itemName.toLowerCase().includes(searchLower) ||
      (item.description || "").toLowerCase().includes(searchLower) ||
      restaurantId.toLowerCase().includes(searchLower) ||
      restaurantName.toLowerCase().includes(searchLower);

    const matchesApproval =
      approvalFilter === "all" ||
      (approvalFilter === "approved" && item.isApproved) ||
      (approvalFilter === "pending" && !item.isApproved);

    return matchesSearch && matchesApproval;
  });
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  const getTabIcon = (type: ContentType) => {
    switch (type) {
      case "menu":
        return <Package className="w-4 h-4" />;
      case "popular":
        return <TrendingUp className="w-4 h-4" />;
      case "featured":
        return <Award className="w-4 h-4" />;
      case "discount":
        return <Award className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };
  const handleEditChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };
  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setNewImage(e.target.files[0]);
    }
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Content Moderation
        </h2>
        {/* Content Type Tabs */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-6">
          {(["menu", "popular", "featured", "discount"] as ContentType[]).map(
            (type) => (
              <button
                key={type}
                onClick={() => setActiveContentTab(type)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                  activeContentTab === type
                    ? "bg-white dark:bg-gray-700 text-orange-600 shadow-sm"
                    : "text-gray-600 dark:text-gray-300 hover:text-orange-600"
                }`}
              >
                {getTabIcon(type)}
                {type.charAt(0).toUpperCase() + type.slice(1)} Items
              </button>
            ),
          )}
        </div>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1 sm:flex-none">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search items, description or restaurant (e.g. Kilimanjaro)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-orange-300 focus:ring-2 focus:ring-orange-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
            />
          </div>
          <div className="relative flex-1 sm:flex-none">
            <Filter
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
            <select
              value={approvalFilter}
              onChange={(e) =>
                setApprovalFilter(
                  e.target.value as "all" | "approved" | "pending",
                )
              }
              className="w-full pl-10 pr-8 py-2 rounded-lg border border-orange-300 focus:ring-2 focus:ring-orange-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 appearance-none"
            >
              <option value="all">All Items</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
          </div>
        </div>
      </div>
      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div
              key={index}
              className="animate-pulse bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
            >
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-red-600 font-semibold p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
          {error}
        </div>
      ) : (
        <>
          {/* Desktop View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 rounded-xl shadow-md">
              <thead className="bg-orange-100 dark:bg-orange-900/30">
                <tr>
                  <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 dark:text-gray-200">
                    Item
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 dark:text-gray-200">
                    Details
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 dark:text-gray-200">
                    Price
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 dark:text-gray-200">
                    Rating
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 dark:text-gray-200">
                    Status
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 dark:text-gray-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.length > 0 ? (
                  paginatedItems.map((item) => (
                    <ItemRow
                      key={item.$id}
                      item={item}
                      activeContentTab={activeContentTab}
                      handleApproval={handleApproval}
                      handleEdit={handleEdit}
                      handleDeleteClick={handleDeleteClick}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Mobile View */}
          <div className="lg:hidden space-y-4">
            {paginatedItems.length > 0 ? (
              paginatedItems.map((item) => (
                <MobileItem
                  key={item.$id}
                  item={item}
                  activeContentTab={activeContentTab}
                  handleApproval={handleApproval}
                  handleEdit={handleEdit}
                  handleDeleteClick={handleDeleteClick}
                />
              ))
            ) : (
              <div className="text-center text-gray-500 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md">
                No items found.
              </div>
            )}
          </div>
          {/* Pagination */}
          {filteredItems.length > itemsPerPage && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="w-full sm:w-auto px-4 py-2 bg-orange-600 text-white rounded-lg disabled:opacity-50 hover:bg-orange-700 transition text-sm"
              >
                Previous
              </button>
              <span className="text-gray-600 dark:text-gray-300 text-sm text-center">
                Page {currentPage} of{" "}
                {Math.ceil(filteredItems.length / itemsPerPage)}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(
                      prev + 1,
                      Math.ceil(filteredItems.length / itemsPerPage),
                    ),
                  )
                }
                disabled={
                  currentPage === Math.ceil(filteredItems.length / itemsPerPage)
                }
                className="w-full sm:w-auto px-4 py-2 bg-orange-600 text-white rounded-lg disabled:opacity-50 hover:bg-orange-700 transition text-sm"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
      {/* Edit Modal */}
      {showEditModal && selectedItem && (
        <EditContentModal
          activeContentTab={activeContentTab}
          availableExtras={availableExtras}
          bigPack={bigPack}
          editFormData={editFormData}
          handleEditChange={handleEditChange}
          handleEditFileChange={handleEditFileChange}
          handleUpdate={handleUpdate}
          isUpdating={isUpdating}
          mediumPack={mediumPack}
          newImage={newImage}
          restaurantName={restaurantName}
          setEditFormData={setEditFormData}
          setShowEditModal={setShowEditModal}
          setShowExtrasModal={setShowExtrasModal}
          pendingExtras={pendingExtras}
          setPendingExtras={setPendingExtras}
          selectedItem={selectedItem}
          currentVendorId={currentVendorId}
          showExtrasModal={showExtrasModal}
        />
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmModal
          setShowDeleteModal={setShowDeleteModal}
          confirmDelete={confirmDelete}
          isDeleting={isDeleting}
        />
      )}
      {/* Vendor Extras Modal */}
      <VendorExtrasModal
        vendorId={currentVendorId}
        isOpen={showExtrasModal}
        onClose={() => setShowExtrasModal(false)}
        item={selectedItem}
        currentPendingIds={pendingExtras.map((e) => e.$id)}
        onPendingChange={(newIds) => {
          const newSelected = availableExtras.filter((ex) =>
            newIds.includes(ex.$id),
          );
          setPendingExtras(newSelected);
        }}
      />
    </>
  );
}