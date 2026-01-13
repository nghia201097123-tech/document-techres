// Staff - nhân viên đăng nhập Dashboard
export interface Staff {
  id: string;
  tenantId: string;
  companyId: string;
  brandId?: string;
  branchId: string;
  departmentId?: string;
  name: string;
  avatarUrl?: string;
  phone?: string;
  email?: string;
  username: string;
  role: StaffRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type StaffRole = 'owner' | 'manager' | 'cashier' | 'staff' | 'kitchen';

// Company
export interface Company {
  id: string;
  code: string;
  name: string;
  logoUrl?: string;
  taxCode?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
}

// Brand
export interface Brand {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  logoUrl?: string;
  description?: string;
  businessModel: BusinessModel;
  isActive: boolean;
}

export type BusinessModel = 'order_only' | 'ccb_only' | 'full_system';

// Branch
export interface Branch {
  id: string;
  tenantId: string;
  brandId: string;
  name: string;
  logoUrl?: string;
  addressDetail?: string;
  provinceCode?: string;
  wardCode?: string;
  phone?: string;
  manager?: string;
  businessModel: BusinessModel;
  openTime?: string;
  closeTime?: string;
  maxConnections: number;
  isActive: boolean;
}

// Department
export interface Department {
  id: string;
  tenantId: string;
  companyId: string;
  parentId?: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  children?: Department[];
}

// Product / Món ăn
export interface Product {
  id: string;
  tenantId: string;
  brandId: string;
  categoryId?: string;
  unitId?: string;
  name: string;
  code?: string;
  price: number;
  vatRate: number;
  imageUrl?: string;
  description?: string;
  productType: ProductType;
  isAvailable: boolean;
  isActive: boolean;
  showInMenu: boolean;
  printToKitchen: boolean;
  printStamp: boolean;
  sortOrder: number;
}

export type ProductType = 'food' | 'drink' | 'other' | 'topping' | 'combo';

// Category / Danh mục
export interface Category {
  id: string;
  tenantId: string;
  brandId: string;
  productType: ProductType;
  name: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
}

// Kitchen Station / Bếp
export interface KitchenStation {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  printerName?: string;
  printerIp?: string;
  isActive: boolean;
}

// Area / Khu vực
export interface Area {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

// Table / Bàn
export interface Table {
  id: string;
  tenantId: string;
  branchId: string;
  areaId?: string;
  name: string;
  capacity: number;
  status: TableStatus;
  sortOrder: number;
  isActive: boolean;
}

export type TableStatus = 'available' | 'occupied' | 'reserved';

// Auth Response
export interface LoginResponse {
  staff: Staff;
  company: Company;
  token: string;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
