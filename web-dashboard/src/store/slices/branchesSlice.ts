import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { branchService, type Branch } from "@/services/branch-service";

interface BranchesState {
  // Store branches by brandId for efficient lookup
  byBrandId: Record<string, Branch[]>;
  loading: boolean;
  error: string | null;
  lastFetchedByBrand: Record<string, number>;
}

const initialState: BranchesState = {
  byBrandId: {},
  loading: false,
  error: null,
  lastFetchedByBrand: {},
};

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export const fetchBranchesByBrand = createAsyncThunk(
  "branches/fetchByBrand",
  async (brandId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { branches: BranchesState };
      const now = Date.now();
      const lastFetched = state.branches.lastFetchedByBrand[brandId];

      // Return cached data if still valid
      if (lastFetched && now - lastFetched < CACHE_DURATION) {
        return { brandId, branches: state.branches.byBrandId[brandId] || [] };
      }

      const data = await branchService.getAll(brandId);
      return { brandId, branches: data };
    } catch (error) {
      return rejectWithValue("Failed to fetch branches");
    }
  }
);

const branchesSlice = createSlice({
  name: "branches",
  initialState,
  reducers: {
    clearBranches: (state) => {
      state.byBrandId = {};
      state.lastFetchedByBrand = {};
    },
    invalidateBranchCache: (state, action: PayloadAction<string>) => {
      delete state.lastFetchedByBrand[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBranchesByBrand.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchBranchesByBrand.fulfilled, (state, action) => {
        state.loading = false;
        state.byBrandId[action.payload.brandId] = action.payload.branches;
        state.lastFetchedByBrand[action.payload.brandId] = Date.now();
        state.error = null;
      })
      .addCase(fetchBranchesByBrand.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearBranches, invalidateBranchCache } = branchesSlice.actions;
export default branchesSlice.reducer;
