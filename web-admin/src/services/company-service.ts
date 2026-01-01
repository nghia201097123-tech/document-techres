import api from "./api";
import type { Company } from "@/types";

interface CompanyListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

interface CompanyListResponse {
  data: Company[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CreateCompanyData {
  name: string;
  code: string;
  taxCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  representative?: string;
}

interface UpdateCompanyData extends Partial<CreateCompanyData> {
  isActive?: boolean;
}

export const companyService = {
  async getList(params?: CompanyListParams): Promise<CompanyListResponse> {
    const response = await api.get<CompanyListResponse>("/companies", { params });
    return response.data;
  },

  async getById(id: string): Promise<Company> {
    const response = await api.get<Company>(`/companies/${id}`);
    return response.data;
  },

  async create(data: CreateCompanyData): Promise<Company> {
    const response = await api.post<Company>("/companies", data);
    return response.data;
  },

  async update(id: string, data: UpdateCompanyData): Promise<Company> {
    const response = await api.put<Company>(`/companies/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/companies/${id}`);
  },

  async toggleStatus(id: string): Promise<Company> {
    const response = await api.patch<Company>(`/companies/${id}/toggle-status`);
    return response.data;
  },
};
