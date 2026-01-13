import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { departmentService, type Department } from "@/services/department-service";

interface DepartmentsState {
  items: Department[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: DepartmentsState = {
  items: [],
  loading: false,
  error: null,
  lastFetched: null,
};

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export const fetchDepartments = createAsyncThunk(
  "departments/fetchDepartments",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { departments: DepartmentsState };
      const now = Date.now();

      // Return cached data if still valid
      if (state.departments.lastFetched && now - state.departments.lastFetched < CACHE_DURATION) {
        return state.departments.items;
      }

      const data = await departmentService.getAll();
      return data;
    } catch (error) {
      return rejectWithValue("Failed to fetch departments");
    }
  }
);

const departmentsSlice = createSlice({
  name: "departments",
  initialState,
  reducers: {
    clearDepartments: (state) => {
      state.items = [];
      state.lastFetched = null;
    },
    invalidateCache: (state) => {
      state.lastFetched = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDepartments.pending, (state) => {
        if (!state.lastFetched) {
          state.loading = true;
        }
      })
      .addCase(fetchDepartments.fulfilled, (state, action: PayloadAction<Department[]>) => {
        state.loading = false;
        state.items = action.payload;
        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(fetchDepartments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearDepartments, invalidateCache: invalidateDepartmentsCache } = departmentsSlice.actions;
export default departmentsSlice.reducer;
