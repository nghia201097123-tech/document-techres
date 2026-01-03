import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { categoryService, type Category } from "@/services/category-service";
import { ProductType } from "@/services/product-service";

interface CategoriesState {
  items: Category[];
  byProductType: Record<ProductType, Category[]>;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: CategoriesState = {
  items: [],
  byProductType: {
    [ProductType.FOOD]: [],
    [ProductType.DRINK]: [],
    [ProductType.OTHER]: [],
    [ProductType.TOPPING]: [],
    [ProductType.COMBO]: [],
  },
  loading: false,
  error: null,
  lastFetched: null,
};

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export const fetchCategories = createAsyncThunk(
  "categories/fetchCategories",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { categories: CategoriesState };
      const now = Date.now();

      // Return cached data if still valid
      if (state.categories.lastFetched && now - state.categories.lastFetched < CACHE_DURATION) {
        return state.categories.items;
      }

      const data = await categoryService.getAll();
      return data;
    } catch (error) {
      return rejectWithValue("Failed to fetch categories");
    }
  }
);

export const fetchCategoriesByType = createAsyncThunk(
  "categories/fetchCategoriesByType",
  async (productType: ProductType, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { categories: CategoriesState };
      const cached = state.categories.byProductType[productType];
      const now = Date.now();

      // Return cached data if still valid and has items
      if (cached.length > 0 && state.categories.lastFetched && now - state.categories.lastFetched < CACHE_DURATION) {
        return { productType, categories: cached };
      }

      const data = await categoryService.getAll(undefined, productType);
      return { productType, categories: data };
    } catch (error) {
      return rejectWithValue("Failed to fetch categories by type");
    }
  }
);

const categoriesSlice = createSlice({
  name: "categories",
  initialState,
  reducers: {
    clearCategories: (state) => {
      state.items = [];
      state.byProductType = {
        [ProductType.FOOD]: [],
        [ProductType.DRINK]: [],
        [ProductType.OTHER]: [],
        [ProductType.TOPPING]: [],
        [ProductType.COMBO]: [],
      };
      state.lastFetched = null;
    },
    invalidateCache: (state) => {
      state.lastFetched = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all categories
      .addCase(fetchCategories.pending, (state) => {
        if (!state.lastFetched) {
          state.loading = true;
        }
      })
      .addCase(fetchCategories.fulfilled, (state, action: PayloadAction<Category[]>) => {
        state.loading = false;
        state.items = action.payload;
        state.lastFetched = Date.now();
        state.error = null;

        // Group by product type
        state.byProductType = {
          [ProductType.FOOD]: [],
          [ProductType.DRINK]: [],
          [ProductType.OTHER]: [],
          [ProductType.TOPPING]: [],
          [ProductType.COMBO]: [],
        };
        action.payload.forEach((cat) => {
          if (state.byProductType[cat.productType]) {
            state.byProductType[cat.productType].push(cat);
          }
        });
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch categories by type
      .addCase(fetchCategoriesByType.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCategoriesByType.fulfilled, (state, action) => {
        state.loading = false;
        state.byProductType[action.payload.productType] = action.payload.categories;
        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(fetchCategoriesByType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCategories, invalidateCache: invalidateCategoriesCache } = categoriesSlice.actions;
export default categoriesSlice.reducer;
