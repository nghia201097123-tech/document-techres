// ==========================================
// Company Types
// ==========================================
export interface Company {
  id: string;
  name: string;
  code: string;
  logo?: string;
  taxCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  representative?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyDto {
  name: string;
  code: string;
  logo?: string;
  taxCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  representative?: string;
}

// ==========================================
// Brand Types
// ==========================================
export type BusinessModel = "order_only" | "ccb_only" | "full_system";

export interface Brand {
  id: string;
  companyId: string;
  companyName?: string;
  name: string;
  code: string;
  businessModel: BusinessModel;
  logo?: string;
  description?: string;
  isActive: boolean;
  branchCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrandDto {
  companyId: string;
  name: string;
  code: string;
  businessModel: BusinessModel;
  logo?: string;
  description?: string;
}

// ==========================================
// Branch Types
// ==========================================
export interface Branch {
  id: string;
  brandId: string;
  brandName?: string;
  companyName?: string;
  name: string;
  code: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  manager?: string;
  openTime?: string;
  closeTime?: string;
  packageId?: string;
  packageName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBranchDto {
  brandId: string;
  name: string;
  code: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  manager?: string;
  openTime?: string;
  closeTime?: string;
  packageId?: string;
}

// ==========================================
// Package Types
// ==========================================
export interface Package {
  id: string;
  name: string;
  code: string;
  maxBranches: number;
  monthlyPrice: number;
  yearlyPrice: number;
  features: Record<string, boolean>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePackageDto {
  name: string;
  code: string;
  maxBranches: number;
  monthlyPrice: number;
  yearlyPrice: number;
  features?: Record<string, boolean>;
}

// ==========================================
// Transaction Category Types
// ==========================================
export type TransactionType = "income" | "expense";

export interface TransactionCategory {
  id: string;
  name: string;
  code: string;
  type: TransactionType;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionCategoryDto {
  name: string;
  code: string;
  type: TransactionType;
  description?: string;
}

// ==========================================
// Permission Types
// ==========================================
export interface PermissionGroup {
  id: string;
  name: string;
  code: string;
  description?: string;
  permissions: string[];
  userCount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePermissionGroupDto {
  name: string;
  code: string;
  description?: string;
  permissions?: string[];
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  description?: string;
}

export interface CreatePermissionDto {
  code: string;
  name: string;
  module: string;
  description?: string;
}

// ==========================================
// Admin User Types
// ==========================================
export type AdminRole = "super_admin" | "support";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: AdminRole;
  permissionGroupId?: string;
  permissionGroupName?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: AdminUser;
  token: string;
}

// ==========================================
// API Response Types
// ==========================================
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}
