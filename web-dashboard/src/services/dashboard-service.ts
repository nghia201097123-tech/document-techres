import api from "./api";

export interface DashboardStats {
  staff: {
    total: number;
    active: number;
  };
  products: {
    total: number;
    active: number;
  };
  categories: {
    total: number;
  };
  kitchens: {
    total: number;
  };
}

export interface RecentActivity {
  recentStaff: Array<{
    id: string;
    name: string;
    username: string;
    createdAt: string;
  }>;
  recentProducts: Array<{
    id: string;
    name: string;
    code: string;
    createdAt: string;
  }>;
}

export const dashboardService = {
  getStats: async (branchId?: string, brandId?: string): Promise<DashboardStats> => {
    const params: Record<string, any> = {};
    if (branchId) params.branchId = branchId;
    if (brandId) params.brandId = brandId;
    const response = await api.get<DashboardStats>("/api/dashboard/stats", { params });
    return response.data;
  },

  getRecentActivity: async (limit?: number): Promise<RecentActivity> => {
    const params = limit ? { limit } : {};
    const response = await api.get<RecentActivity>("/api/dashboard/recent-activity", { params });
    return response.data;
  },
};
