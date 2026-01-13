import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { brandService, type Brand } from "@/services/brand-service";

interface BrandsState {
  items: Brand[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: BrandsState = {
  items: [],
  loading: false,
  error: null,
  lastFetched: null,
};

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export const fetchBrands = createAsyncThunk(
  "brands/fetchBrands",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { brands: BrandsState };
      const now = Date.now();

      // Return cached data if still valid
      if (state.brands.lastFetched && now - state.brands.lastFetched < CACHE_DURATION) {
        return state.brands.items;
      }

      const data = await brandService.getAll();
      return data;
    } catch (error) {
      return rejectWithValue("Failed to fetch brands");
    }
  }
);

const brandsSlice = createSlice({
  name: "brands",
  initialState,
  reducers: {
    clearBrands: (state) => {
      state.items = [];
      state.lastFetched = null;
    },
    invalidateCache: (state) => {
      state.lastFetched = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrands.pending, (state) => {
        if (!state.lastFetched) {
          state.loading = true;
        }
      })
      .addCase(fetchBrands.fulfilled, (state, action: PayloadAction<Brand[]>) => {
        state.loading = false;
        state.items = action.payload;
        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(fetchBrands.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearBrands, invalidateCache: invalidateBrandsCache } = brandsSlice.actions;
export default brandsSlice.reducer;
