import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  transactionCategoryService,
  type TransactionCategory,
  type FilterParams,
  type PaginatedResponse,
} from "@/services/transaction-category-service";

interface TransactionCategoriesState {
  items: TransactionCategory[];
  total: number;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  currentFilter: FilterParams;
}

const initialState: TransactionCategoriesState = {
  items: [],
  total: 0,
  loading: false,
  error: null,
  lastFetched: null,
  currentFilter: {},
};

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export const fetchTransactionCategories = createAsyncThunk(
  "transactionCategories/fetchAll",
  async (params: FilterParams | undefined, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { transactionCategories: TransactionCategoriesState };
      const now = Date.now();

      // Check if we should use cache (only if no filter params changed)
      const filterChanged = JSON.stringify(params) !== JSON.stringify(state.transactionCategories.currentFilter);

      if (
        !filterChanged &&
        state.transactionCategories.lastFetched &&
        now - state.transactionCategories.lastFetched < CACHE_DURATION
      ) {
        return {
          items: state.transactionCategories.items,
          total: state.transactionCategories.total,
          filter: params || {},
        };
      }

      const data = await transactionCategoryService.getAll(params);
      return { items: data.items, total: data.total, filter: params || {} };
    } catch (error) {
      return rejectWithValue("Failed to fetch transaction categories");
    }
  }
);

const transactionCategoriesSlice = createSlice({
  name: "transactionCategories",
  initialState,
  reducers: {
    clearTransactionCategories: (state) => {
      state.items = [];
      state.total = 0;
      state.lastFetched = null;
    },
    invalidateCache: (state) => {
      state.lastFetched = null;
    },
    addCategory: (state, action: PayloadAction<TransactionCategory>) => {
      state.items.unshift(action.payload);
      state.total += 1;
    },
    updateCategory: (state, action: PayloadAction<TransactionCategory>) => {
      const index = state.items.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    removeCategory: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((c) => c.id !== action.payload);
      state.total -= 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactionCategories.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTransactionCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.currentFilter = action.payload.filter;
        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(fetchTransactionCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearTransactionCategories,
  invalidateCache: invalidateTransactionCategoriesCache,
  addCategory,
  updateCategory,
  removeCategory,
} = transactionCategoriesSlice.actions;
export default transactionCategoriesSlice.reducer;
