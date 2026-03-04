"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Edit3,
  Image as ImageIcon,
  Loader2,
  X,
  Tag,
  Info,
  DollarSign,
  Clock,
  Settings,
  Eye,
} from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import ExtrasSelector from "../forms/ExtrasSelector";
import {
  IFetchedExtras,
  ContentItem,
  IPackFetched,
} from "../../../types/types";
import { fileUrl, validateEnv } from "@/utils/appwrite";
import VendorExtrasModal from "../admin/VendorExtrasModal";
import Image from "next/image";
import toast from "react-hot-toast";
import { updateAsyncMenuItem } from "@/state/menuSlice";
import { updateAsyncPopularItem } from "@/state/popularSlice";
import { updateAsyncFeaturedItem } from "@/state/featuredSlice";
import { updateAsyncDiscount } from "@/state/discountSlice";
import { listAsyncMenusItem } from "@/state/menuSlice";
import { listAsyncPopularItems } from "@/state/popularSlice";
import { listAsyncFeaturedItems } from "@/state/featuredSlice";
import { listAsyncDiscounts } from "@/state/discountSlice";

type ContentType = "menu" | "popular" | "featured" | "discount";

interface Props {
  item: ContentItem;
  type: ContentType;
  dispatch: any;
  onClose: () => void;
  editFormData: any;
  setEditFormData: React.Dispatch<React.SetStateAction<any>>;
  newImage: File | null;
  setNewImage: React.Dispatch<React.SetStateAction<File | null>>;
  isUpdating: boolean;
  setIsUpdating: React.Dispatch<React.SetStateAction<boolean>>;
  restaurantName: string;
  pendingExtras?: IFetchedExtras[];
  setPendingExtras?: React.Dispatch<React.SetStateAction<IFetchedExtras[]>>;
  availableExtras: IFetchedExtras[];
  mediumPack: IPackFetched | null;
  bigPack: IPackFetched | null;
  currentVendorId: string;
  showExtrasModal: boolean;
  setShowExtrasModal: React.Dispatch<React.SetStateAction<boolean>>;
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

const EditItemModal = ({
  item,
  type,
  dispatch,
  onClose,
  editFormData,
  setEditFormData,
  newImage,
  setNewImage,
  isUpdating,
  setIsUpdating,
  restaurantName,
  pendingExtras = [],
  setPendingExtras,
  availableExtras,
  mediumPack,
  bigPack,
  currentVendorId,
}: Props) => {
  const [showVendorExtrasModal, setShowVendorExtrasModal] = useState(false);

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

  const imagePreview = useMemo(() => {
    if (newImage) return URL.createObjectURL(newImage);
    return item.image ? fileUrl(getBucketId(type), item.image as string) : null;
  }, [newImage, item.image, type]);

  const handleEditChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setNewImage(e.target.files[0]);
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const itemId = item.$id;
      const finalExtrasIds = pendingExtras.map((e) => e.$id);

      let updateData: any = {
        ...editFormData,
        extras: finalExtrasIds,
        needsTakeawayContainer: editFormData.needsTakeawayContainer ?? false,
        extraPortion: editFormData.extraPortion ?? false,
      };

      if (type !== "discount") {
        if (editFormData.needsTakeawayContainer) {
          if (editFormData.extraPortion && bigPack) {
            finalExtrasIds.push(bigPack.$id);
          } else if (mediumPack) {
            finalExtrasIds.push(mediumPack.$id);
          }
        }
      }

      let action;
      switch (type) {
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
            imageFile: newImage,
          });
          break;
      }

      if (action) {
        await dispatch(action).unwrap();
        toast.success("Item updated successfully!");
        onClose();

        switch (type) {
          case "menu":
            dispatch(listAsyncMenusItem());
            break;
          case "popular":
            dispatch(listAsyncPopularItems());
            break;
          case "featured":
            dispatch(listAsyncFeaturedItems());
            break;
          case "discount":
            dispatch(listAsyncDiscounts());
            break;
        }
      }
    } catch (error) {
      toast.error("Failed to update item");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-orange-100 dark:border-orange-900/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-500/10 rounded-xl flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-orange-600 dark:text-orange-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Edit {type.charAt(0).toUpperCase() + type.slice(1)}
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                {restaurantName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
            {/* Image Section */}
            <FormCard className="flex flex-col md:flex-row gap-6 items-center">
              <div className="relative group">
                <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-orange-100 dark:border-orange-900/50 bg-gray-100 dark:bg-gray-800 shadow-inner">
                  {imagePreview ? (
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ImageIcon className="w-8 h-8 opacity-20" />
                    </div>
                  )}
                </div>
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
                <p className="text-xs text-gray-500">
                  Upload a high-quality image (800x800px recommended)
                </p>
              </div>
            </FormCard>

            {type !== "discount" ? (
              <>
                {/* Basic Info */}
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
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 text-sm"
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
                        className="w-full h-10 px-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 text-sm"
                      >
                        <option value="veg">Vegetarian</option>
                        <option value="non-veg">Non-Vegetarian</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Pricing & Logistics */}
                <div className="space-y-4">
                  <SectionHeader
                    icon={DollarSign}
                    title="Pricing & Logistics"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          Original Price (₦)
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
                    <div>
                      <Label className="text-xs font-semibold mb-1.5 block ml-1">
                        Restaurant
                      </Label>
                      <Input
                        value={restaurantName || "Not available"}
                        readOnly
                        className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* Container Options - RESTORED */}
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

                {/* Attached Extras */}
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
                        onClick={() => setShowVendorExtrasModal(true)}
                        className="text-[10px] h-7 bg-white dark:bg-gray-800 shadow-sm border border-orange-200 dark:border-orange-800"
                      >
                        Manage All Extras
                      </Button>
                    </div>
                    <div className="p-4">
                      <ExtrasSelector
                        availableExtras={pendingExtras}
                        selectedExtras={pendingExtras}
                        onChange={setPendingExtras || (() => {})}
                      />
                    </div>
                  </FormCard>
                </div>
              </>
            ) : (
              /* Discount Section */
              <div className="space-y-6">
                <SectionHeader icon={Tag} title="Discount Configuration" />
                {/* Your discount fields here */}
              </div>
            )}

            {/* Visibility */}
            <div className="space-y-4">
              <SectionHeader icon={Eye} title="Visibility Settings" />
              <label
                className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${editFormData.isApproved ? "bg-green-50/50 border-green-200" : "bg-gray-50 border-gray-200 opacity-60"}`}
              >
                <input
                  type="checkbox"
                  checked={editFormData.isApproved}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      isApproved: e.target.checked,
                    })
                  }
                  className="w-5 h-5 accent-green-600"
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
          </form>
        </div>

        {/* Sticky Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-end gap-3 sticky bottom-0 z-10">
          <Button
            variant="ghost"
            onClick={onClose}
            className="px-6 font-semibold text-gray-500 hover:text-gray-700"
          >
            Discard
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="px-8 bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-lg flex items-center gap-2 h-11"
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
        isOpen={showVendorExtrasModal}
        onClose={() => setShowVendorExtrasModal(false)}
        item={item}
        currentPendingIds={pendingExtras.map((e) => e.$id)}
        onPendingChange={(newIds: string[]) => {
          if (setPendingExtras) {
            const newSelected = availableExtras.filter((ex) =>
              newIds.includes(ex.$id),
            );
            setPendingExtras(newSelected);
          }
        }}
      />
    </motion.div>
  );
};

export default EditItemModal;
