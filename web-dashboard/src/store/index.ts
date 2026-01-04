import { configureStore } from "@reduxjs/toolkit";
import brandsReducer from "./slices/brandsSlice";
import branchesReducer from "./slices/branchesSlice";
import departmentsReducer from "./slices/departmentsSlice";
import locationsReducer from "./slices/locationsSlice";
import categoriesReducer from "./slices/categoriesSlice";
import filtersReducer from "./slices/filtersSlice";

export const store = configureStore({
  reducer: {
    brands: brandsReducer,
    branches: branchesReducer,
    departments: departmentsReducer,
    locations: locationsReducer,
    categories: categoriesReducer,
    filters: filtersReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
