import api from "./api";

export interface DashboardStats {
  companies: number;
  brands: number;
  branches: number;
  packages: number;
}

export interface RecentCompany {
  id: string;
  name: string;
  createdAt: string;
}

export interface RecentBranch {
  id: string;
  name: string;
  brandName: string;
  createdAt: string;
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    // Fetch counts from each endpoint
    const [companiesRes, brandsRes, branchesRes, packagesRes] = await Promise.all([
      api.get("/api/companies", { params: { limit: 1 } }),
      api.get("/api/brands", { params: { limit: 1 } }),
      api.get("/api/branches", { params: { limit: 1 } }),
      api.get("/api/packages", { params: { limit: 1 } }),
    ]);

    return {
      companies: companiesRes.data.total || 0,
      brands: brandsRes.data.total || 0,
      branches: branchesRes.data.total || 0,
      packages: packagesRes.data.total || 0,
    };
  },

  async getRecentCompanies(limit: number = 5): Promise<RecentCompany[]> {
    const response = await api.get("/api/companies", { params: { limit, page: 1 } });
    return response.data.data?.map((c: any) => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt,
    })) || [];
  },

  async getRecentBranches(limit: number = 5): Promise<RecentBranch[]> {
    const response = await api.get("/api/branches", { params: { limit, page: 1 } });
    return response.data.data?.map((b: any) => ({
      id: b.id,
      name: b.name,
      brandName: b.brand?.name || "N/A",
      createdAt: b.createdAt,
    })) || [];
  },
};
