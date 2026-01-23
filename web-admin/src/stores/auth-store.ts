import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AdminUser } from "@/types";
import { setInMemoryToken } from "@/services/api";

interface AuthState {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setUser: (user: AdminUser | null) => void;
  setToken: (token: string | null) => void;
  login: (user: AdminUser, token: string) => void;
  logout: () => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isHydrated: false,

      setUser: (user) =>
        set({ user, isAuthenticated: !!user }),

      setToken: (token) => {
        // Also set in-memory token for API calls before localStorage is hydrated
        setInMemoryToken(token);
        set({ token });
      },

      login: (user, token) => {
        // Also set in-memory token for API calls before localStorage is hydrated
        setInMemoryToken(token);
        set({
          user,
          token,
          isAuthenticated: true,
        });
      },

      logout: () => {
        // Clear in-memory token
        setInMemoryToken(null);
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      setHydrated: (isHydrated) =>
        set({ isHydrated }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Restore in-memory token from persisted state
        if (state?.token) {
          setInMemoryToken(state.token);
        }
        state?.setHydrated(true);
      },
    }
  )
);
