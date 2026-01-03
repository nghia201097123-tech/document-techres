import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { packageService, type Package } from "@/services/package-service";

interface PackagesState {
  items: Package[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: PackagesState = {
  items: [],
  loading: false,
  error: null,
  lastFetched: null,
};

// Cache duration: 10 minutes
const CACHE_DURATION = 10 * 60 * 1000;

export const fetchPackages = createAsyncThunk(
  "packages/fetchPackages",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { packages: PackagesState };
      const now = Date.now();

      // Return cached data if still valid
      if (state.packages.lastFetched && now - state.packages.lastFetched < CACHE_DURATION) {
        return state.packages.items;
      }

      const data = await packageService.getAll();
      return data;
    } catch (error) {
      return rejectWithValue("Failed to fetch packages");
    }
  }
);

const packagesSlice = createSlice({
  name: "packages",
  initialState,
  reducers: {
    clearPackages: (state) => {
      state.items = [];
      state.lastFetched = null;
    },
    invalidateCache: (state) => {
      state.lastFetched = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPackages.pending, (state) => {
        if (!state.lastFetched) {
          state.loading = true;
        }
      })
      .addCase(fetchPackages.fulfilled, (state, action: PayloadAction<Package[]>) => {
        state.loading = false;
        state.items = action.payload;
        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(fetchPackages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearPackages, invalidateCache: invalidatePackagesCache } = packagesSlice.actions;
export default packagesSlice.reducer;
