import api from "./api";

export interface PackageFeatures {
  orderManagement: boolean;
  inventoryManagement: boolean;
  reporting: boolean;
  multipleUsers: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
}

export interface Package {
  id: string;
  name: string;
  code: string;
  maxBranches: number;
  monthlyPrice: number;
  yearlyPrice: number;
  features: PackageFeatures;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePackageDto {
  name: string;
  code: string;
  maxBranches?: number;
  monthlyPrice?: number;
  yearlyPrice?: number;
  features?: Partial<PackageFeatures>;
}

export interface UpdatePackageDto {
  name?: string;
  maxBranches?: number;
  monthlyPrice?: number;
  yearlyPrice?: number;
  features?: Partial<PackageFeatures>;
  isActive?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilterParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const packageService = {
  async getAll(params?: FilterParams): Promise<PaginatedResponse<Package>> {
    const response = await api.get<PaginatedResponse<Package>>("/packages", { params });
    return response.data;
  },

  async getById(id: string): Promise<Package> {
    const response = await api.get<Package>(`/packages/${id}`);
    return response.data;
  },

  async create(data: CreatePackageDto): Promise<Package> {
    const response = await api.post<Package>("/packages", data);
    return response.data;
  },

  async update(id: string, data: UpdatePackageDto): Promise<Package> {
    const response = await api.patch<Package>(`/packages/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/packages/${id}`);
  },

  async toggleStatus(id: string): Promise<Package> {
    const response = await api.patch<Package>(`/packages/${id}/toggle-status`);
    return response.data;
  },
};
