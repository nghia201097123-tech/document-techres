import { configureStore } from "@reduxjs/toolkit";
import brandsReducer from "./slices/brandsSlice";
import branchesReducer from "./slices/branchesSlice";
import departmentsReducer from "./slices/departmentsSlice";
import locationsReducer from "./slices/locationsSlice";

export const store = configureStore({
  reducer: {
    brands: brandsReducer,
    branches: branchesReducer,
    departments: departmentsReducer,
    locations: locationsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
