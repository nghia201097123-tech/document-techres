import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Load initial state from localStorage if available
const loadFromLocalStorage = (): FiltersState => {
  if (typeof window === "undefined") {
    return { brandId: "", branchId: "" };
  }
  try {
    const saved = localStorage.getItem("dashboard-filters");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error("Error loading filters from localStorage:", error);
  }
  return { brandId: "", branchId: "" };
};

// Save state to localStorage
const saveToLocalStorage = (state: FiltersState) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("dashboard-filters", JSON.stringify(state));
  } catch (error) {
    console.error("Error saving filters to localStorage:", error);
  }
};

interface FiltersState {
  brandId: string;
  branchId: string;
}

const initialState: FiltersState = {
  brandId: "",
  branchId: "",
};

const filtersSlice = createSlice({
  name: "filters",
  initialState,
  reducers: {
    setBrandId: (state, action: PayloadAction<string>) => {
      state.brandId = action.payload;
      // Reset branchId when brand changes
      state.branchId = "";
      saveToLocalStorage(state);
    },
    setBranchId: (state, action: PayloadAction<string>) => {
      state.branchId = action.payload;
      saveToLocalStorage(state);
    },
    setFilters: (state, action: PayloadAction<Partial<FiltersState>>) => {
      if (action.payload.brandId !== undefined) {
        state.brandId = action.payload.brandId;
      }
      if (action.payload.branchId !== undefined) {
        state.branchId = action.payload.branchId;
      }
      saveToLocalStorage(state);
    },
    loadFiltersFromStorage: (state) => {
      const saved = loadFromLocalStorage();
      state.brandId = saved.brandId;
      state.branchId = saved.branchId;
    },
    clearFilters: (state) => {
      state.brandId = "";
      state.branchId = "";
      saveToLocalStorage(state);
    },
  },
});

export const { setBrandId, setBranchId, setFilters, loadFiltersFromStorage, clearFilters } = filtersSlice.actions;
export default filtersSlice.reducer;
