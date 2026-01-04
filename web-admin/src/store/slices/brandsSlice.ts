import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { brandService, type Brand } from "@/services/brand-service";

interface BrandsState {
  // Store brands by companyId for efficient lookup
  byCompanyId: Record<string, Brand[]>;
  loading: boolean;
  error: string | null;
  lastFetchedByCompany: Record<string, number>;
}

const initialState: BrandsState = {
  byCompanyId: {},
  loading: false,
  error: null,
  lastFetchedByCompany: {},
};

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export const fetchBrandsByCompany = createAsyncThunk(
  "brands/fetchByCompany",
  async (companyId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { brands: BrandsState };
      const now = Date.now();
      const lastFetched = state.brands.lastFetchedByCompany[companyId];

      // Return cached data if still valid
      if (lastFetched && now - lastFetched < CACHE_DURATION) {
        return { companyId, brands: state.brands.byCompanyId[companyId] || [] };
      }

      const data = await brandService.getByCompany(companyId);
      return { companyId, brands: data };
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
      state.byCompanyId = {};
      state.lastFetchedByCompany = {};
    },
    invalidateBrandCache: (state, action: PayloadAction<string>) => {
      delete state.lastFetchedByCompany[action.payload];
    },
    addBrand: (state, action: PayloadAction<{ companyId: string; brand: Brand }>) => {
      const { companyId, brand } = action.payload;
      if (!state.byCompanyId[companyId]) {
        state.byCompanyId[companyId] = [];
      }
      state.byCompanyId[companyId].push(brand);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrandsByCompany.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchBrandsByCompany.fulfilled, (state, action) => {
        state.loading = false;
        state.byCompanyId[action.payload.companyId] = action.payload.brands;
        state.lastFetchedByCompany[action.payload.companyId] = Date.now();
        state.error = null;
      })
      .addCase(fetchBrandsByCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearBrands, invalidateBrandCache, addBrand } = brandsSlice.actions;
export default brandsSlice.reducer;
