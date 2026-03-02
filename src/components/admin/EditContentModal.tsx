import React, { ChangeEvent, Dispatch, MouseEvent, useMemo, useState,useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Edit3,
  ImageIcon,
  Loader2,
  X,
  Tag,
  Info,
  DollarSign,
  Clock,
  Settings,
  Eye,
  AlertCircle,
} from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import ExtrasSelector from "../forms/ExtrasSelector";
import VendorExtrasModal from "./VendorExtrasModal";
import {
  IFetchedExtras,
  ContentItem,
  IPackFetched,
} from "../../../types/types";
import Image from "next/image";
import { fileUrl, validateEnv } from "@/utils/appwrite";

type ContentType = "menu" | "popular" | "featured" | "discount";

interface Props {
  setShowEditModal: Dispatch<React.SetStateAction<boolean>>;
  activeContentTab: ContentType;
  editFormData: any;
  handleEditChange: (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => void;
  restaurantName: string;
  setEditFormData: Dispatch<any>;
  availableExtras: IFetchedExtras[];
  showExtrasModal: boolean;
  setShowExtrasModal: Dispatch<React.SetStateAction<boolean>>;
  handleEditFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  newImage: File | null;
  isUpdating: boolean;
  handleUpdate: () => Promise<void>;
  pendingExtras: IFetchedExtras[];
  setPendingExtras: Dispatch<React.SetStateAction<IFetchedExtras[]>>;
  bigPack: IPackFetched | null;
  mediumPack: IPackFetched | null;
  selectedItem: ContentItem | null;
  currentVendorId: string;
}

const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
  <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-700/50 pb-2">
    <Icon className="w-4 h-4 text-orange-500" />
    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
      {title}
    </h4>
  </div>
);

const FormCard = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`bg-gray-50/50 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800 p-5 rounded-xl ${className}`}
  >
    {children}
  </div>
);

const EditContentModal = ({
  setShowEditModal,
  activeContentTab,
  editFormData,
  handleEditChange,
  restaurantName,
  setEditFormData,
  setShowExtrasModal,
  handleEditFileChange,
  newImage,
  handleUpdate,
  isUpdating,
  pendingExtras,
  setPendingExtras,
  bigPack,
  mediumPack,
  selectedItem,
  currentVendorId,
  availableExtras,
  showExtrasModal,
}: Props) => {
  
  // === BUCKET HELPER - ADD THIS EXACTLY HERE ===
  const { menuBucketId, featuredBucketId, discountBucketId, popularBucketId } =
    validateEnv();

  const getBucketId = (type: ContentType): string => {
    switch (type) {
      case "menu":
        return menuBucketId;
      case "featured":
        return featuredBucketId;
      case "discount":
        return discountBucketId;
      case "popular":
        return popularBucketId;
      default:
        return "";
    }
  };

  const [calculationWarning, setCalculationWarning] = useState<string | null>(
    null,
  );

  const imageSrc = useMemo(() => {
    if (newImage) {
      return URL.createObjectURL(newImage);
    }
    // Show the ORIGINAL item image from Appwrite
    if (selectedItem?.image) {
      return fileUrl(
        getBucketId(activeContentTab),
        selectedItem.image as string,
      );
    }
    return null;
  }, [newImage, selectedItem?.image, activeContentTab]);

  // Auto-calculation for discount
  useEffect(() => {
    if (
      activeContentTab === "discount" &&
      editFormData.originalPrice &&
      editFormData.discountValue > 0
    ) {
      let calculated = 0;
      let warning: string | null = null;

      if (editFormData.discountType === "percentage") {
        if (editFormData.discountValue > 100) {
          warning = "Percentage cannot exceed 100%";
          calculated = editFormData.originalPrice;
        } else {
          calculated =
            Math.round(
              editFormData.originalPrice *
                (1 - editFormData.discountValue / 100) *
                100,
            ) / 100;
        }
      } else {
        if (editFormData.discountValue > editFormData.originalPrice) {
          warning = "Fixed discount cannot exceed original price";
          calculated = 0;
        } else {
          calculated =
            Math.round(
              (editFormData.originalPrice - editFormData.discountValue) * 100,
            ) / 100;
        }
      }

      setEditFormData((prev: any) => ({
        ...prev,
        discountedPrice: calculated,
      }));
      setCalculationWarning(warning);
    }
  }, [
    editFormData.originalPrice,
    editFormData.discountValue,
    editFormData.discountType,
    activeContentTab,
    setEditFormData,
  ]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={() => setShowEditModal(false)}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-orange-100 dark:border-orange-900/30"
        onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        {/* STICKY HEADER */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-500/10 rounded-xl flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-orange-600 dark:text-orange-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                Edit {activeContentTab}
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                {restaurantName || "Vendor Management"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowEditModal(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* FORM BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
            {/* IMAGE SECTION */}
            <FormCard className="flex flex-col md:flex-row gap-6 items-center">
              <div className="relative group">
                <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-orange-100 dark:border-orange-900/50 bg-gray-100 dark:bg-gray-800 shadow-inner relative">
                  {imageSrc ? (
                    <Image
                      src={imageSrc}
                      alt="Current Item Image"
                      fill
                      className="object-cover"
                      sizes="128px"
                      unoptimized // Required for external Appwrite URLs
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ImageIcon className="w-8 h-8 opacity-20" />
                    </div>
                  )}
                </div>

                {/* Upload button */}
                <label className="absolute -bottom-2 -right-2 p-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow-lg cursor-pointer transition-transform active:scale-95">
                  <ImageIcon className="w-4 h-4" />
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleEditFileChange}
                    accept="image/*"
                  />
                </label>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                  Item Media
                </h4>
                <p className="text-xs text-gray-500 mb-3">
                  Upload a high-quality JPEG or PNG. Recommended size 800x800px.
                </p>
                {newImage && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider">
                    <CheckCircle className="w-3 h-3" /> New File Ready
                  </span>
                )}
              </div>
            </FormCard>

            {activeContentTab !== "discount" ? (
              <>
                {/* BASIC INFO */}
                <div className="space-y-4">
                  <SectionHeader icon={Info} title="General Information" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label className="text-xs font-semibold mb-1.5 block ml-1">
                        Item Name
                      </Label>
                      <Input
                        name="name"
                        value={editFormData.name}
                        onChange={handleEditChange}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs font-semibold mb-1.5 block ml-1">
                        Description
                      </Label>
                      <textarea
                        name="description"
                        value={editFormData.description}
                        onChange={handleEditChange}
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block ml-1">
                        Category
                      </Label>
                      <select
                        name="category"
                        value={editFormData.category}
                        onChange={handleEditChange}
                        className="w-full h-10 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none"
                      >
                        <option value="veg">Vegetarian</option>
                        <option value="non-veg">Non-Vegetarian</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block ml-1">
                        Rating
                      </Label>
                      <Input
                        name="rating"
                        type="number"
                        step="0.1"
                        value={editFormData.rating}
                        onChange={handleEditChange}
                      />
                    </div>
                  </div>
                </div>

                {/* PRICING & LOGISTICS */}
                <div className="space-y-4">
                  <SectionHeader
                    icon={DollarSign}
                    title="Pricing & Logistics"
                  />
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block ml-1">
                        Current Price (₦)
                      </Label>
                      <Input
                        name="price"
                        type="number"
                        value={editFormData.price}
                        onChange={handleEditChange}
                      />
                    </div>
                    {"originalPrice" in editFormData && (
                      <div>
                        <Label className="text-xs font-semibold mb-1.5 block ml-1">
                          Strike Price (₦)
                        </Label>
                        <Input
                          name="originalPrice"
                          type="number"
                          value={editFormData.originalPrice}
                          onChange={handleEditChange}
                        />
                      </div>
                    )}
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block ml-1">
                        Prep Time
                      </Label>
                      <Input
                        name={
                          editFormData.cookTime ? "cookTime" : "cookingTime"
                        }
                        value={
                          editFormData.cookTime ||
                          editFormData.cookingTime ||
                          ""
                        }
                        onChange={handleEditChange}
                        placeholder="20 mins"
                      />
                    </div>
                  </div>
                </div>

                {/* CONTAINER OPTIONS - RESTORED */}
                <div className="space-y-4">
                  <SectionHeader icon={Settings} title="Container Options" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl cursor-pointer border border-transparent hover:border-orange-300 transition-all">
                      <input
                        type="checkbox"
                        checked={!!editFormData.needsTakeawayContainer}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            needsTakeawayContainer: e.target.checked,
                            extraPortion: e.target.checked
                              ? editFormData.extraPortion
                              : false,
                          })
                        }
                        className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                      />
                      <div>
                        <p className="font-medium">Needs Takeaway Container</p>
                        <p className="text-xs text-gray-500">
                          Customer pays for packaging
                        </p>
                      </div>
                    </label>

                    {editFormData.needsTakeawayContainer && (
                      <label className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl cursor-pointer border border-transparent hover:border-orange-300 transition-all">
                        <input
                          type="checkbox"
                          checked={!!editFormData.extraPortion}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              extraPortion: e.target.checked,
                            })
                          }
                          className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                        />
                        <div>
                          <p className="font-medium">
                            Extra Portion (Big Container)
                          </p>
                          <p className="text-xs text-gray-500">
                            +₦
                            {bigPack && mediumPack
                              ? bigPack.price - mediumPack.price
                              : 0}{" "}
                            • Switches to Big
                          </p>
                        </div>
                      </label>
                    )}
                  </div>
                </div>

                {/* ATTACHED EXTRAS */}
                <div className="space-y-4">
                  <SectionHeader icon={Settings} title="Attached Extras" />
                  <FormCard className="!p-0 overflow-hidden border-orange-100 dark:border-orange-900/20">
                    <div className="p-4 bg-orange-50/50 dark:bg-orange-900/10 border-b border-orange-100 dark:border-orange-900/20 flex justify-between items-center">
                      <span className="text-xs font-bold text-orange-700 dark:text-orange-400">
                        Active Add-ons
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowExtrasModal(true)}
                        className="text-[10px] h-7 bg-white dark:bg-gray-800 shadow-sm border border-orange-200 dark:border-orange-800"
                      >
                        Manage All Extras
                      </Button>
                    </div>
                    <div className="p-4">
                      <ExtrasSelector
                        availableExtras={pendingExtras}
                        selectedExtras={pendingExtras}
                        onChange={setPendingExtras}
                      />
                    </div>
                  </FormCard>
                </div>
              </>
            ) : (
              /* === RESTORED DISCOUNT SECTION === */
              <div className="space-y-6">
                <SectionHeader icon={Tag} title="Discount Configuration" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-xs font-semibold mb-1.5 block">
                      Promo Title
                    </Label>
                    <Input
                      name="title"
                      value={editFormData.title}
                      onChange={handleEditChange}
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">
                      Discount Type
                    </Label>
                    <select
                      name="discountType"
                      value={editFormData.discountType}
                      onChange={handleEditChange}
                      className="w-full h-10 px-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₦)</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">
                      Discount Value
                    </Label>
                    <div className="relative">
                      <Input
                        name="discountValue"
                        type="number"
                        value={editFormData.discountValue}
                        onChange={handleEditChange}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                        {editFormData.discountType === "percentage" ? "%" : "₦"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">
                      Original Price (₦)
                    </Label>
                    <Input
                      name="originalPrice"
                      type="number"
                      value={editFormData.originalPrice}
                      onChange={handleEditChange}
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">
                      Discounted Price (Auto)
                    </Label>
                    <Input
                      name="discountedPrice"
                      type="number"
                      value={editFormData.discountedPrice}
                      readOnly
                      className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                    />
                    {calculationWarning && (
                      <p className="text-xs text-orange-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {calculationWarning}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">
                      Valid From
                    </Label>
                    <Input
                      name="validFrom"
                      type="datetime-local"
                      value={editFormData.validFrom}
                      onChange={handleEditChange}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">
                      Valid To
                    </Label>
                    <Input
                      name="validTo"
                      type="datetime-local"
                      value={editFormData.validTo}
                      onChange={handleEditChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">
                      Min Order Value (₦)
                    </Label>
                    <Input
                      name="minOrderValue"
                      type="number"
                      value={editFormData.minOrderValue}
                      onChange={handleEditChange}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">
                      Max Uses
                    </Label>
                    <Input
                      name="maxUses"
                      type="number"
                      value={editFormData.maxUses}
                      onChange={handleEditChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">
                      Promo Code (Optional)
                    </Label>
                    <Input
                      name="code"
                      value={editFormData.code}
                      onChange={handleEditChange}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">
                      Applies To
                    </Label>
                    <select
                      name="appliesTo"
                      value={editFormData.appliesTo}
                      onChange={handleEditChange}
                      className="w-full h-10 px-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800"
                    >
                      <option value="all">All</option>
                      <option value="item">Item</option>
                      <option value="category">Category</option>
                      <option value="restaurant">Restaurant</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">
                    Target ID
                  </Label>
                  <Input
                    name="targetId"
                    value={editFormData.targetId}
                    onChange={handleEditChange}
                  />
                </div>
              </div>
            )}

            {/* VISIBILITY */}
            <div className="space-y-4">
              <SectionHeader icon={Eye} title="Visibility Settings" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label
                  className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${editFormData.isApproved ? "bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-800" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60"}`}
                >
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-green-600"
                    checked={editFormData.isApproved}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        isApproved: e.target.checked,
                      })
                    }
                  />
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      Approved Status
                    </p>
                    <p className="text-[10px] text-gray-500 uppercase font-medium">
                      Visible to customers
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </form>
        </div>

        {/* STICKY FOOTER */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-end gap-3 sticky bottom-0 z-10">
          <Button
            variant="ghost"
            onClick={() => setShowEditModal(false)}
            className="px-6 font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Discard
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="px-8 bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-lg shadow-orange-200 dark:shadow-none transition-all flex items-center gap-2 h-11"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Update Item</span>
              </>
            )}
          </Button>
        </div>
      </motion.div>

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
    </motion.div>
  );
};;

export default EditContentModal;
