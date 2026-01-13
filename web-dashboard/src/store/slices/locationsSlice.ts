import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { locationService, type Province, type Ward } from "@/services/location-service";

interface LocationsState {
  provinces: Province[];
  wardsByProvince: Record<string, Ward[]>;
  loadingProvinces: boolean;
  loadingWards: boolean;
  error: string | null;
  provincesLastFetched: number | null;
  wardsLastFetchedByProvince: Record<string, number>;
}

const initialState: LocationsState = {
  provinces: [],
  wardsByProvince: {},
  loadingProvinces: false,
  loadingWards: false,
  error: null,
  provincesLastFetched: null,
  wardsLastFetchedByProvince: {},
};

// Cache duration: 30 minutes (locations don't change often)
const CACHE_DURATION = 30 * 60 * 1000;

export const fetchProvinces = createAsyncThunk(
  "locations/fetchProvinces",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { locations: LocationsState };
      const now = Date.now();

      // Return cached data if still valid
      if (state.locations.provincesLastFetched && now - state.locations.provincesLastFetched < CACHE_DURATION) {
        return state.locations.provinces;
      }

      const data = await locationService.getProvinces();
      return data;
    } catch (error) {
      return rejectWithValue("Failed to fetch provinces");
    }
  }
);

export const fetchWardsByProvince = createAsyncThunk(
  "locations/fetchWardsByProvince",
  async (provinceCode: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { locations: LocationsState };
      const now = Date.now();
      const lastFetched = state.locations.wardsLastFetchedByProvince[provinceCode];

      // Return cached data if still valid
      if (lastFetched && now - lastFetched < CACHE_DURATION) {
        return { provinceCode, wards: state.locations.wardsByProvince[provinceCode] || [] };
      }

      const data = await locationService.getWards(provinceCode);
      return { provinceCode, wards: data };
    } catch (error) {
      return rejectWithValue("Failed to fetch wards");
    }
  }
);

const locationsSlice = createSlice({
  name: "locations",
  initialState,
  reducers: {
    clearLocations: (state) => {
      state.provinces = [];
      state.wardsByProvince = {};
      state.provincesLastFetched = null;
      state.wardsLastFetchedByProvince = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // Provinces
      .addCase(fetchProvinces.pending, (state) => {
        if (!state.provincesLastFetched) {
          state.loadingProvinces = true;
        }
      })
      .addCase(fetchProvinces.fulfilled, (state, action: PayloadAction<Province[]>) => {
        state.loadingProvinces = false;
        state.provinces = action.payload;
        state.provincesLastFetched = Date.now();
        state.error = null;
      })
      .addCase(fetchProvinces.rejected, (state, action) => {
        state.loadingProvinces = false;
        state.error = action.payload as string;
      })
      // Wards
      .addCase(fetchWardsByProvince.pending, (state) => {
        state.loadingWards = true;
      })
      .addCase(fetchWardsByProvince.fulfilled, (state, action) => {
        state.loadingWards = false;
        state.wardsByProvince[action.payload.provinceCode] = action.payload.wards;
        state.wardsLastFetchedByProvince[action.payload.provinceCode] = Date.now();
        state.error = null;
      })
      .addCase(fetchWardsByProvince.rejected, (state, action) => {
        state.loadingWards = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearLocations } = locationsSlice.actions;
export default locationsSlice.reducer;
