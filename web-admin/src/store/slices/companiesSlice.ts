import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { companyService, type Company } from "@/services/company-service";

interface CompaniesState {
  items: Company[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: CompaniesState = {
  items: [],
  loading: false,
  error: null,
  lastFetched: null,
};

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export const fetchCompanies = createAsyncThunk(
  "companies/fetchCompanies",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { companies: CompaniesState };
      const now = Date.now();

      // Return cached data if still valid
      if (state.companies.lastFetched && now - state.companies.lastFetched < CACHE_DURATION) {
        return state.companies.items;
      }

      const data = await companyService.getAll();
      return data;
    } catch (error) {
      return rejectWithValue("Failed to fetch companies");
    }
  }
);

const companiesSlice = createSlice({
  name: "companies",
  initialState,
  reducers: {
    clearCompanies: (state) => {
      state.items = [];
      state.lastFetched = null;
    },
    invalidateCache: (state) => {
      state.lastFetched = null;
    },
    addCompany: (state, action: PayloadAction<Company>) => {
      state.items.push(action.payload);
    },
    updateCompany: (state, action: PayloadAction<Company>) => {
      const index = state.items.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCompanies.pending, (state) => {
        if (!state.lastFetched) {
          state.loading = true;
        }
      })
      .addCase(fetchCompanies.fulfilled, (state, action: PayloadAction<Company[]>) => {
        state.loading = false;
        state.items = action.payload;
        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(fetchCompanies.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCompanies, invalidateCache: invalidateCompaniesCache, addCompany, updateCompany } = companiesSlice.actions;
export default companiesSlice.reducer;
