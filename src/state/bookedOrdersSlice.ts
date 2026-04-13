import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Query } from "appwrite";
import { IBookedOrderFetched, IBookedOrderUpdate } from "../../types/types";
import { databases, validateEnv } from "../utils/appwrite";
import { formatNigerianPhone, sendOrderFeedback } from "../utils/sendSmsToNumber";

interface BookedOrdersState {
  orders: IBookedOrderFetched[];
  currentOrder: IBookedOrderFetched | null;
  loading: boolean;
  error: string | null;
}

const initialState: BookedOrdersState = {
  orders: [],
  currentOrder: null,
  loading: false,
  error: null,
};
// fetch all orders
export const fetchBookedOrders = createAsyncThunk<
  IBookedOrderFetched[],
  void,
  { rejectValue: string }
>("bookedOrders/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const { databaseId, bookedOrdersCollectionId } = validateEnv();
    const response = await databases.listDocuments(
      databaseId,
      bookedOrdersCollectionId,
      [Query.limit(1000), Query.orderDesc("createdAt")],
    );
    return response.documents as unknown as IBookedOrderFetched[];
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch booked orders"
    );
  }
});

// Fetch all booked orders for a user (excluding soft-deleted orders)
export const fetchBookedOrdersByUserId = createAsyncThunk<
  IBookedOrderFetched[],
  string,
  { rejectValue: string }
>("bookedOrders/fetchByUserId", async (userId, { rejectWithValue }) => {
  try {
    const { databaseId, bookedOrdersCollectionId } = validateEnv();
    const response = await databases.listDocuments(
      databaseId,
      bookedOrdersCollectionId,
      [
        Query.equal("customerId", userId), 
        Query.orderDesc("createdAt")
      ]
    );
    
    // Filter out soft-deleted orders in the application code
    const allOrders = response.documents as unknown as IBookedOrderFetched[];
    const filteredOrders = allOrders.filter(order => order.deletedByUser !== true);
    
    return filteredOrders;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch booked orders"
    );
  }
});

// Fetch a single booked order by orderId
export const fetchBookedOrderById = createAsyncThunk<
  IBookedOrderFetched,
  string,
  { rejectValue: string }
>("bookedOrders/fetchById", async (orderId, { rejectWithValue }) => {
  try {
    const { databaseId, bookedOrdersCollectionId } = validateEnv();
    const response = await databases.getDocument(
      databaseId,
      bookedOrdersCollectionId,
      orderId
    );
    return response as unknown as IBookedOrderFetched;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch booked order"
    );
  }
});

// Cancel (soft delete) a booked order - mark as deleted by user instead of removing from database
export const cancelBookedOrder = createAsyncThunk<
  IBookedOrderFetched,
  string,
  { rejectValue: string }
>("bookedOrders/cancel", async (orderId, { rejectWithValue }) => {
  try {
    const { databaseId, bookedOrdersCollectionId } = validateEnv();
    
    // Update the order to mark it as deleted by user and set status to cancelled
    const response = await databases.updateDocument(
      databaseId,
      bookedOrdersCollectionId,
      orderId,
      {
        status: "cancelled",
        deletedByUser: true,
        deletedAt: new Date().toISOString()
      }
    );
    
    return response as unknown as IBookedOrderFetched;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to cancel order"
    );
  }
});

// Delete a booked order permanently from database (admin only)
export const deleteBookedOrder = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("bookedOrders/delete", async (orderId, { rejectWithValue }) => {
  try {
    const { databaseId, bookedOrdersCollectionId } = validateEnv();
    
    // Permanently delete the order from database
    await databases.deleteDocument(
      databaseId,
      bookedOrdersCollectionId,
      orderId
    );
    
    return orderId;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to delete order"
    );
  }
});

function get_sms_message(status: string, rider_code: string) {
  const messages: { [key: string]: string } = {
    confirmed: `Yay!  Your order #${rider_code} is confirmed.\nWe've received it and the restaurant is preparing your food.`,
    out_for_delivery: `It's on the way!  \nYour Rideexapp order #${rider_code} is out for delivery and will arrive soon.`,
    delivered: `Bon appétit! \nYour Rideexapp order #${rider_code} has been successfully delivered.\nThanks for choosing Rideexapp`,
    cancelled: `Hi! Order #${rider_code} canceled. If charged, refund is on the way. Reorder in Rideexapp or contact support for help.`,
  };
  return messages[status] || null;
}

// Update booked order status

export const updateBookedOrderAsync = createAsyncThunk<
  IBookedOrderFetched,
  { orderId: string; orderData: Partial<IBookedOrderUpdate> },
  { rejectValue: string }
>(
  "bookedOrders/update",
  async ({ orderId, orderData }, { rejectWithValue }) => {
    try {
      const { databaseId, bookedOrdersCollectionId } = validateEnv();

      // Update the order in Appwrite
      const response = await databases.updateDocument(
        databaseId,
        bookedOrdersCollectionId,
        orderId,
        orderData
      );

      const updatedOrder = response as unknown as IBookedOrderFetched; 


      if (orderData.status && updatedOrder.phone) {
        const message = get_sms_message(
          orderData.status,
          updatedOrder.riderCode || updatedOrder.orderId.slice(-6)
        );
        if (message) {
          const smsResult = await sendOrderFeedback({
            number: formatNigerianPhone(updatedOrder.phone),
            message: message,
          });
          if (!smsResult.success) {
            console.warn(
              "Customer SMS notification failed (non-blocking)",
              smsResult
            );
          }
        } else {
          console.log(`No SMS for status: ${orderData.status}`);
        }
      }

      return updatedOrder;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update booked order"
      );
    }
  }
);
// Update booked order rider code
export const updateBookedOrderRiderCode = createAsyncThunk<
  IBookedOrderFetched,
  { id: string; riderCode: string },
  { rejectValue: string }
>(
  "bookedOrders/updateRiderCode",
  async ({ id, riderCode }, { rejectWithValue }) => {
    try {
      const { databaseId, bookedOrdersCollectionId } = validateEnv();
      const response = await databases.updateDocument(
        databaseId,
        bookedOrdersCollectionId,
        id,
        { riderCode }
      );
      return response as unknown as IBookedOrderFetched;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update rider code"
      );
    }
  }
);

export const bookedOrdersSlice = createSlice({
  name: "bookedOrders",
  initialState,
  reducers: {
    clearCurrentOrder(state) {
      state.currentOrder = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBookedOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookedOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
        state.error = null;
      })
      .addCase(fetchBookedOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch booked orders";
      })

      //
      .addCase(fetchBookedOrdersByUserId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookedOrdersByUserId.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
        state.error = null;
      })
      .addCase(fetchBookedOrdersByUserId.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch booked orders";
      })
      .addCase(fetchBookedOrderById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookedOrderById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = action.payload;
        state.error = null;
      })
      .addCase(fetchBookedOrderById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch booked order";
      })
      .addCase(cancelBookedOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelBookedOrder.fulfilled, (state, action) => {
        state.loading = false;
        // Update the order in the orders array with the cancelled status
        state.orders = state.orders.map((order) =>
          order.$id === action.payload.$id ? action.payload : order
        );
        // Update current order if it's the one being cancelled
        if (
          state.currentOrder &&
          state.currentOrder.$id === action.payload.$id
        ) {
          state.currentOrder = action.payload;
        }
        state.error = null;
      })
      .addCase(cancelBookedOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to cancel order";
      })
      .addCase(deleteBookedOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteBookedOrder.fulfilled, (state, action) => {
        state.loading = false;
        // Remove the deleted order from the orders array
        state.orders = state.orders.filter((order) => order.$id !== action.payload);
        // Clear current order if it's the one being deleted
        if (
          state.currentOrder &&
          state.currentOrder.$id === action.payload
        ) {
          state.currentOrder = null;
        }
        state.error = null;
      })
      .addCase(deleteBookedOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to delete order";
      })
      .addCase(updateBookedOrderAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBookedOrderAsync.fulfilled, (state, action) => {
        state.loading = false;
        // Update the order in the orders array
        state.orders = state.orders.map((order) =>
          order.$id === action.payload.$id ? action.payload : order
        );
        // Update current order if it's the one being updated
        if (
          state.currentOrder &&
          state.currentOrder.$id === action.payload.$id
        ) {
          state.currentOrder = action.payload;
        }
        state.error = null;
      })
      .addCase(updateBookedOrderAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update booked order";
      })
      .addCase(updateBookedOrderRiderCode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBookedOrderRiderCode.fulfilled, (state, action) => {
        state.loading = false;
        // Update the order in the orders array
        state.orders = state.orders.map((order) =>
          order.$id === action.payload.$id ? action.payload : order
        );
        // Update current order if it's the one being updated
        if (
          state.currentOrder &&
          state.currentOrder.$id === action.payload.$id
        ) {
          state.currentOrder = action.payload;
        }
        state.error = null;
      })
      .addCase(updateBookedOrderRiderCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update rider code";
      });
  },
});

export const { clearCurrentOrder } = bookedOrdersSlice.actions;
export default bookedOrdersSlice.reducer;
