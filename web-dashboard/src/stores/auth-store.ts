import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Staff, Company } from "@/types";

interface AuthState {
  staff: Staff | null;
  company: Company | null;
  tenantId: string | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setStaff: (staff: Staff | null) => void;
  setCompany: (company: Company | null) => void;
  setToken: (token: string | null) => void;
  login: (staff: Staff, company: Company, token: string) => void;
  logout: () => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      staff: null,
      company: null,
      tenantId: null,
      token: null,
      isAuthenticated: false,
      isHydrated: false,

      setStaff: (staff) =>
        set({ staff, isAuthenticated: !!staff }),

      setCompany: (company) =>
        set({ company, tenantId: company?.code || null }),

      setToken: (token) =>
        set({ token }),

      login: (staff, company, token) =>
        set({
          staff,
          company,
          tenantId: company.code,
          token,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          staff: null,
          company: null,
          tenantId: null,
          token: null,
          isAuthenticated: false,
        }),

      setHydrated: (isHydrated) =>
        set({ isHydrated }),
    }),
    {
      name: "dashboard-auth-storage",
      partialize: (state) => ({
        staff: state.staff,
        company: state.company,
        tenantId: state.tenantId,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
