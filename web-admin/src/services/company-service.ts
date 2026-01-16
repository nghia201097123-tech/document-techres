import api from "./api";
import type { Company } from "@/types";

export type { Company };

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
  logo?: string;
  taxCode?: string;
  provinceCode?: string;
  wardCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  representative?: string;
}

interface UpdateCompanyData extends Partial<CreateCompanyData> {
  isActive?: boolean;
}

/**
 * Wizard types - Cập nhật theo địa chỉ hành chính Việt Nam sau sáp nhập 07/2025
 * Cấu trúc 2 cấp: Tỉnh/Thành phố → Xã/Phường (không còn cấp Quận/Huyện)
 * Mã (code) sẽ được tự động sinh trên backend
 */
interface WizardCompanyData {
  name: string;
  alias: string; // Tiên định danh - viết tắt tên công ty, dùng làm code
  email: string; // Required
  isTrial: boolean; // Dùng thử hay chính thức
  taxCode?: string;
  addressDetail?: string; // Địa chỉ chi tiết (số nhà, đường)
  provinceCode?: string; // Mã tỉnh/thành (34 tỉnh sau sáp nhập)
  wardCode?: string; // Mã phường/xã (liên kết trực tiếp với tỉnh)
  phone?: string;
  representative?: string;
}

interface WizardBrandData {
  name: string;
  description?: string;
  businessModel?: "order_only" | "ccb_only" | "full_system";
}

interface WizardBranchData {
  name: string;
  addressDetail?: string; // Địa chỉ chi tiết (số nhà, đường)
  provinceCode?: string; // Mã tỉnh/thành
  wardCode?: string; // Mã phường/xã
  phone?: string;
  manager?: string;
  openTime?: string;
  closeTime?: string;
}

interface WizardStaffData {
  name: string;
  phone?: string;
  email?: string;
  role?: string;
  usernamePrefix?: string; // Mã đăng nhập (2 ký tự), mặc định "tr" → tr000001
}

export interface CreateCompanyWizardData {
  company: WizardCompanyData;
  brand: WizardBrandData;
  branch: WizardBranchData;
  staff: WizardStaffData;
}

export interface WizardResponse {
  company: { id: string; name: string; code: string };
  brand: { id: string; name: string; code: string };
  branch: { id: string; name: string; code: string };
  department: { id: string; name: string; code: string };
  staff: { id: string; name: string; username: string; temporaryPassword: string };
}

// Quick Create - tên công ty + tiên định danh
export interface QuickCreateData {
  companyName: string;
  alias: string;
  isTrial?: boolean;
}

// Bulk Create Branches
export interface BulkBranchData {
  name: string;
  addressDetail?: string;
  provinceCode?: string;
  wardCode?: string;
  phone?: string;
}

export interface CreateCompanyWithBranchesData extends CreateCompanyWizardData {
  additionalBranches?: BulkBranchData[];
}

// Clone Company
export interface CloneCompanyData {
  sourceCompanyId: string;
  newCompanyName: string;
  newAlias: string;
  newEmail: string;
  isTrial?: boolean;
  cloneOptions: {
    brands: boolean;
    branches: boolean;
    products: boolean;
    categories: boolean;
    staff: boolean;
  };
}

export const companyService = {
  async getList(params?: CompanyListParams): Promise<CompanyListResponse> {
    // Filter out empty/undefined params
    const cleanParams = params
      ? Object.fromEntries(
          Object.entries(params).filter(
            ([, value]) => value !== undefined && value !== ""
          )
        )
      : undefined;
    const response = await api.get<CompanyListResponse>("/companies", {
      params: cleanParams,
    });
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
    const response = await api.patch<Company>(`/companies/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/companies/${id}`);
  },

  async toggleStatus(id: string): Promise<Company> {
    const response = await api.patch<Company>(`/companies/${id}/toggle-status`);
    return response.data;
  },

  async createWithWizard(data: CreateCompanyWizardData): Promise<WizardResponse> {
    const response = await api.post<WizardResponse>("/companies/wizard", data);
    return response.data;
  },

  async getAll(): Promise<Company[]> {
    const response = await api.get<CompanyListResponse>("/companies", {
      params: { limit: 100 },
    });
    return response.data.data;
  },

  // Check if alias is available
  async checkAlias(alias: string): Promise<{ available: boolean; alias: string }> {
    const response = await api.get<{ available: boolean; alias: string }>(`/companies/check-alias/${alias}`);
    return response.data;
  },

  // Quick Create - tạo nhanh công ty với tên và tiên định danh
  async quickCreate(data: QuickCreateData): Promise<WizardResponse> {
    const response = await api.post<WizardResponse>("/companies/quick-create", data);
    return response.data;
  },

  // Create with multiple branches
  async createWithBranches(data: CreateCompanyWithBranchesData): Promise<WizardResponse & { additionalBranches?: Array<{ id: string; name: string; code: string }> }> {
    const response = await api.post<WizardResponse & { additionalBranches?: Array<{ id: string; name: string; code: string }> }>("/companies/wizard-bulk", data);
    return response.data;
  },

  // Clone company
  async clone(data: CloneCompanyData): Promise<WizardResponse> {
    const response = await api.post<WizardResponse>("/companies/clone", data);
    return response.data;
  },

  // Get company details for cloning (includes brands, branches count)
  async getDetailsForClone(id: string): Promise<{
    company: Company;
    brandsCount: number;
    branchesCount: number;
    productsCount: number;
    categoriesCount: number;
    staffCount: number;
  }> {
    const response = await api.get(`/companies/${id}/clone-details`);
    return response.data;
  },
};
