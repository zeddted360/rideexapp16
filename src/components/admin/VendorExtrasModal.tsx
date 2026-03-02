"use client";
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  listAsyncExtras,
  createAsyncExtra,
  updateAsyncExtra,
  deleteAsyncExtra,
} from "@/state/extraSlice";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/state/store";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  X,
  Edit2,
  Trash2,
  Plus,
  Upload,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { IFetchedExtras, ContentItem } from "../../../types/types";
import { fileUrl, validateEnv } from "@/utils/appwrite";
import Image from "next/image";

interface Props {
  vendorId: string;
  isOpen: boolean;
  onClose: () => void;
  item: ContentItem | null;
  currentPendingIds: string[];
  onPendingChange: (newPendingIds: string[]) => void;
}

export default function VendorExtrasModal({
  vendorId,
  isOpen,
  onClose,
  item,
  currentPendingIds,
  onPendingChange,
}: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const formRef = useRef<HTMLFormElement>(null); // ← for smooth scroll

  const [extras, setExtras] = useState<IFetchedExtras[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingExtra, setEditingExtra] = useState<IFetchedExtras | null>(null);
  const [form, setForm] = useState({ name: "", price: "", description: "" });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { extrasBucketId } = validateEnv();

  const itemName = (item as any)?.name || (item as any)?.title || "this item";

  const fetchExtras = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    try {
      const data = await dispatch(listAsyncExtras(vendorId)).unwrap();
      setExtras(data);
    } catch {
      toast.error("Failed to load extras");
    } finally {
      setLoading(false);
    }
  }, [dispatch, vendorId]);

  useEffect(() => {
    if (isOpen) fetchExtras();
  }, [isOpen, fetchExtras]);

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const sortedExtras = useMemo(() => {
    return [...extras].sort((a, b) => {
      const aAttached = currentPendingIds.includes(a.$id);
      const bAttached = currentPendingIds.includes(b.$id);
      return Number(bAttached) - Number(aAttached);
    });
  }, [extras, currentPendingIds]);

  const resetForm = () => {
    setForm({ name: "", price: "", description: "" });
    setSelectedImage(null);
    setImagePreview(null);
    setEditingExtra(null);
    setShowForm(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedImage(null);
    setImagePreview(null);
  };

  const isFormValid = form.name.trim() && form.price && Number(form.price) > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return toast.error("Name and valid price required");

    setSubmitting(true);
    const priceNum = Number(form.price);

    try {
      let newExtraId: string | null = null;

      if (editingExtra) {
        await dispatch(
          updateAsyncExtra({
            extraId: editingExtra.$id,
            data: {
              name: form.name.trim(),
              price: priceNum.toString(),
              description: form.description.trim(),
              vendorId,
            },
            newImage: selectedImage || undefined,
          }),
        ).unwrap();
        toast.success("Extra updated");
      } else {
        const created = await dispatch(
          createAsyncExtra({
            name: form.name.trim(),
            price: priceNum.toString(),
            description: form.description.trim(),
            vendorId,
            image: selectedImage || undefined,
          }),
        ).unwrap();
        toast.success("Extra created & attached");
        newExtraId = created.$id;
      }

      await fetchExtras();

      if (newExtraId && onPendingChange) {
        onPendingChange([...currentPendingIds, newExtraId]);
      }
      resetForm();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelection = (extraId: string) => {
    const isSelected = currentPendingIds.includes(extraId);
    const newIds = isSelected
      ? currentPendingIds.filter((id) => id !== extraId)
      : [...currentPendingIds, extraId];

    onPendingChange(newIds);
  };

  const handleEdit = (extra: IFetchedExtras) => {
    setEditingExtra(extra);
    setForm({
      name: extra.name,
      price: extra.price.toString(),
      description: extra.description || "",
    });
    setSelectedImage(null);
    if (extra.image) setImagePreview(fileUrl(extrasBucketId, extra.image));

    setShowForm(true);

    // Smooth scroll to form (great UX)
    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };

  const handleDelete = async (extra: IFetchedExtras) => {
    if (!confirm(`Delete "${extra.name}"?`)) return;
    try {
      await dispatch(
        deleteAsyncExtra({
          extraId: extra.$id,
          imageId: extra.image || undefined,
        }),
      ).unwrap();
      toast.success("Extra deleted");
      fetchExtras();
    } catch {
      toast.error("Failed to delete");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4 backdrop-blur-sm"
      onClick={onClose} // ← closes only extras modal
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border dark:border-gray-800"
        onClick={(e) => e.stopPropagation()} // ← CRITICAL: prevents closing parent EditItemModal
      >
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold">Extras for "{itemName}"</h2>
            <p className="text-sm text-gray-500">
              {currentPendingIds.length} attached • Select extras to include
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="rounded-full"
          >
            <X size={22} />
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              if (showForm) {
                resetForm();
              } else {
                setShowForm(true);
                setTimeout(() => {
                  formRef.current?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }
            }}
            className="w-full py-6 text-lg rounded-2xl border-2 border-dashed border-primary/20 hover:border-primary/50 transition-all"
            variant={showForm ? "secondary" : "outline"}
          >
            {showForm ? (
              "Close Form"
            ) : (
              <>
                <Plus className="mr-2 h-5 w-5" /> Create New Extra
              </>
            )}
          </Button>

          {/* ====================== FORM ====================== */}
          {showForm && (
            <form
              ref={formRef} // ← scroll target
              onSubmit={handleSubmit}
              className="space-y-5 p-6 border rounded-3xl bg-gray-50 dark:bg-gray-800/50 animate-in fade-in zoom-in duration-200"
            >
              {/* ... your existing form fields (unchanged) ... */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="extra-name">Name *</Label>
                  <Input
                    id="extra-name"
                    placeholder="e.g. Extra Cheese"
                    value={form.name}
                    onChange={(e) => {
                      e.stopPropagation();
                      setForm({ ...form, name: e.target.value });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extra-price">Price (₦) *</Label>
                  <Input
                    id="extra-price"
                    type="number"
                    placeholder="0.00"
                    value={form.price}
                    onChange={(e) => {
                      e.stopPropagation();
                      setForm({ ...form, price: e.target.value });
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="extra-desc">Description</Label>
                <Input
                  id="extra-desc"
                  placeholder="Optional details..."
                  value={form.description}
                  onChange={(e) => {
                    e.stopPropagation();
                    setForm({ ...form, description: e.target.value });
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Image (optional)</Label>
                <label className="group relative mt-2 block w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all overflow-hidden">
                  <div className="flex flex-col items-center justify-center h-full">
                    {imagePreview ? (
                      <div className="relative w-full h-full">
                        <Image
                          src={imagePreview}
                          alt="preview"
                          fill
                          className="object-contain p-2"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg"
                          onClick={removeImage}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400 mb-1 group-hover:text-primary transition-colors" />
                        <p className="text-xs text-gray-500 font-medium">
                          Click to upload image
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>

              <Button
                type="submit"
                disabled={!isFormValid || submitting}
                className="w-full py-6 rounded-2xl font-bold shadow-lg shadow-primary/20"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving...
                  </>
                ) : editingExtra ? (
                  "Update Extra"
                ) : (
                  "Save & Attach Extra"
                )}
              </Button>
            </form>
          )}

          {/* List Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider px-1">
              Available Extras
            </h3>
            {loading && extras.length === 0 ? (
              <div className="flex flex-col items-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-gray-500">Loading extras...</p>
              </div>
            ) : sortedExtras.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-3xl">
                <p className="text-gray-400">
                  No extras found for this vendor.
                </p>
              </div>
            ) : (
              sortedExtras.map((extra) => {
                const isAttached = currentPendingIds.includes(extra.$id);
                return (
                  <div
                    key={extra.$id}
                    className={`group flex items-center gap-4 p-4 border rounded-3xl transition-all duration-200 ${
                      isAttached
                        ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                        : "bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    {/* Restored checkbox */}
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isAttached}
                        onChange={() => toggleSelection(extra.$id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-6 h-6 text-green-600 rounded-lg border-gray-300 focus:ring-green-500 cursor-pointer"
                      />
                    </div>

                    {/* Restored image */}
                    {extra.image ? (
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden border bg-gray-100 flex-shrink-0">
                        <Image
                          src={fileUrl(extrasBucketId, extra.image)}
                          alt={extra.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 flex-shrink-0">
                        <Plus size={20} />
                      </div>
                    )}

                    {/* Restored info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold truncate">{extra.name}</p>
                        {isAttached && (
                          <span className="inline-flex items-center text-[10px] bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                            <CheckCircle size={10} className="mr-1" /> Attached
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-black text-primary">
                        ₦{Number(extra.price).toLocaleString()}
                      </p>
                      {extra.description && (
                        <p className="text-xs text-gray-500 line-clamp-1 italic">
                          {extra.description}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-xl hover:bg-blue-50 hover:text-blue-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(extra);
                        }}
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(extra);
                        }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
          <p className="text-xs text-gray-400 font-medium">
            Changes apply to "{itemName}"
          </p>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="px-10 rounded-2xl h-12 font-bold shadow-lg shadow-primary/20"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
