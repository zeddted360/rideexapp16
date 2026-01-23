// state/promotionalImagesSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { ID, Models, Query } from "appwrite";
import { storage, validateEnv } from "../utils/appwrite";

const fetchLatestPromoImages = async (): Promise<Models.File[]> => {
  const { promoImagesBucketId } = validateEnv();

  const response = await storage.listFiles(promoImagesBucketId, [
    Query.startsWith("name", "promo_"),
    Query.orderDesc("$createdAt"),
    Query.limit(2), // Only get the 2 newest
  ]);

  return response.files;
};

// Async Thunks
export const fetchPromotionalImages = createAsyncThunk(
  "promotionalImages/fetch",
  async () => {
    return await fetchLatestPromoImages();
  },
);

export const createPromotionalImage = createAsyncThunk(
  "promotionalImages/create",
  async (file: File) => {
    const { promoImagesBucketId } = validateEnv();
    const customName = `promo_${Date.now()}_${file.name}`;
    const renamedFile = new File([file], customName, { type: file.type });
    await storage.createFile(promoImagesBucketId, ID.unique(), renamedFile);
    return await fetchLatestPromoImages();
  },
);

export const updatePromotionalImage = createAsyncThunk(
  "promotionalImages/update",
  async ({ fileId, file }: { fileId: string; file: File }) => {
    const { promoImagesBucketId } = validateEnv();
    await storage.deleteFile(promoImagesBucketId, fileId);
    const customName = `promo_${Date.now()}_${file.name}`;
    const renamedFile = new File([file], customName, { type: file.type });
    await storage.createFile(promoImagesBucketId, ID.unique(), renamedFile);
    return await fetchLatestPromoImages();
  },
);

export const deletePromotionalImage = createAsyncThunk(
  "promotionalImages/delete",
  async (fileId: string) => {
    const { promoImagesBucketId } = validateEnv();
    await storage.deleteFile(promoImagesBucketId, fileId);
    return await fetchLatestPromoImages();
  },
);

// Slice
interface PromotionalImagesState {
  images: Models.File[];
  loading: boolean;
  error: string | null;
}

const initialState: PromotionalImagesState = {
  images: [],
  loading: false,
  error: null,
};

const promotionalImagesSlice = createSlice({
  name: "promotionalImages",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchPromotionalImages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPromotionalImages.fulfilled, (state, action) => {
        state.loading = false;
        state.images = action.payload;
      })
      .addCase(fetchPromotionalImages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch images";
      })
      // Create
      .addCase(createPromotionalImage.pending, (state) => {
        state.error = null;
      })
      .addCase(createPromotionalImage.fulfilled, (state, action) => {
        state.images = action.payload;
      })
      .addCase(createPromotionalImage.rejected, (state, action) => {
        state.error = action.error.message || "Failed to create image";
      })
      // Update
      .addCase(updatePromotionalImage.pending, (state) => {
        state.error = null;
      })
      .addCase(updatePromotionalImage.fulfilled, (state, action) => {
        state.images = action.payload;
      })
      .addCase(updatePromotionalImage.rejected, (state, action) => {
        state.error = action.error.message || "Failed to update image";
      })
      // Delete
      .addCase(deletePromotionalImage.pending, (state) => {
        state.error = null;
      })
      .addCase(deletePromotionalImage.fulfilled, (state, action) => {
        state.images = action.payload;
      })
      .addCase(deletePromotionalImage.rejected, (state, action) => {
        state.error = action.error.message || "Failed to delete image";
      });
  },
});

export const { clearError } = promotionalImagesSlice.actions;
export default promotionalImagesSlice.reducer;
