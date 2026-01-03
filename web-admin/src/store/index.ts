import { configureStore } from "@reduxjs/toolkit";
import packagesReducer from "./slices/packagesSlice";
import companiesReducer from "./slices/companiesSlice";
import brandsReducer from "./slices/brandsSlice";
import branchesReducer from "./slices/branchesSlice";
import locationsReducer from "./slices/locationsSlice";
import transactionCategoriesReducer from "./slices/transactionCategoriesSlice";

export const store = configureStore({
  reducer: {
    packages: packagesReducer,
    companies: companiesReducer,
    brands: brandsReducer,
    branches: branchesReducer,
    locations: locationsReducer,
    transactionCategories: transactionCategoriesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
