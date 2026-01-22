import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { storage, validateEnv } from "@/utils/appwrite";
import { ID, Models, Query } from "appwrite";

type LogosStateType = {
  restaurant: Models.File | null;
  shops: Models.File | null;
  pharmacy: Models.File | null;
};

interface UpdateLogoPayload {
  category: keyof LogosStateType;
  file: File;
}

const initialState = {
  logos: { restaurant: null, shops: null, pharmacy: null } as LogosStateType,
  loading: false,
  error: null as string | null,
};

// Helper to get the latest logo file for a prefix (or null)
const getLatestLogo = async (
  bucketId: string,
  prefix: string,
): Promise<Models.File | null> => {
  const response = await storage.listFiles(bucketId, [
    Query.startsWith("name", prefix),
    Query.orderDesc("$createdAt"),
    Query.limit(1),
  ]);
  return response.files[0] || null;
};

// Helper to get ALL files matching a prefix (for cleanup)
const getAllMatchingFiles = async (
  bucketId: string,
  prefix: string,
): Promise<Models.File[]> => {
  const response = await storage.listFiles(bucketId, [
    Query.startsWith("name", prefix),
  ]);
  return response.files;
};

export const listAsyncLogos = createAsyncThunk(
  "categoryLogos/listAsyncLogos",
  async (): Promise<LogosStateType> => {
    const { categoryLogosBucketId } = validateEnv();

    // Fetch latest for each category in parallel
    const [restaurant, shops, pharmacy] = await Promise.all([
      getLatestLogo(categoryLogosBucketId, "restaurant-logo"),
      getLatestLogo(categoryLogosBucketId, "shops-logo"),
      getLatestLogo(categoryLogosBucketId, "pharmacy-logo"),
    ]);

    return { restaurant, shops, pharmacy };
  },
);

export const updateAsyncLogo = createAsyncThunk(
  "categoryLogos/updateAsyncLogo",
  async ({ category, file }: UpdateLogoPayload): Promise<LogosStateType> => {
    const { categoryLogosBucketId } = validateEnv();
    const prefix = `${category}-logo`;

    // 1. Cleanup: Delete ALL old files matching prefix
    const oldFiles = await getAllMatchingFiles(categoryLogosBucketId, prefix);
    for (const oldFile of oldFiles) {
      await storage.deleteFile(categoryLogosBucketId, oldFile.$id);
    }

    // 2. Upload new file
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const newName = `${prefix}.${ext}`;
    const newFile = new File([file], newName, { type: file.type });
    const uploadedFile = await storage.createFile(
      categoryLogosBucketId,
      ID.unique(),
      newFile,
    );

    // 3. Refetch latest for ALL categories (ensures accurate state)
    const [restaurant, shops, pharmacy] = await Promise.all([
      getLatestLogo(categoryLogosBucketId, "restaurant-logo"),
      getLatestLogo(categoryLogosBucketId, "shops-logo"),
      getLatestLogo(categoryLogosBucketId, "pharmacy-logo"),
    ]);

    return { restaurant, shops, pharmacy };
  },
);

export const deleteAsyncLogo = createAsyncThunk(
  "categoryLogos/deleteAsyncLogo",
  async (category: keyof LogosStateType): Promise<LogosStateType> => {
    const { categoryLogosBucketId } = validateEnv();
    const prefix = `${category}-logo`;

    // 1. Delete ALL matching files
    const filesToDelete = await getAllMatchingFiles(
      categoryLogosBucketId,
      prefix,
    );
    for (const file of filesToDelete) {
      await storage.deleteFile(categoryLogosBucketId, file.$id);
    }

    // 2. Refetch latest for ALL categories
    const [restaurant, shops, pharmacy] = await Promise.all([
      getLatestLogo(categoryLogosBucketId, "restaurant-logo"),
      getLatestLogo(categoryLogosBucketId, "shops-logo"),
      getLatestLogo(categoryLogosBucketId, "pharmacy-logo"),
    ]);

    return { restaurant, shops, pharmacy };
  },
);

const categoryLogosSlice = createSlice({
  name: "categoryLogos",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(listAsyncLogos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(listAsyncLogos.fulfilled, (state, action) => {
        state.loading = false;
        state.logos = action.payload;
      })
      .addCase(listAsyncLogos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch logos";
      })
      .addCase(updateAsyncLogo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAsyncLogo.fulfilled, (state, action) => {
        state.loading = false;
        state.logos = action.payload;
      })
      .addCase(updateAsyncLogo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to update logo";
      })
      .addCase(deleteAsyncLogo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAsyncLogo.fulfilled, (state, action) => {
        state.loading = false;
        state.logos = action.payload;
      })
      .addCase(deleteAsyncLogo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to delete logo";
      });
  },
});

export const categoryLogosReducer = categoryLogosSlice.reducer;
export default categoryLogosSlice;
