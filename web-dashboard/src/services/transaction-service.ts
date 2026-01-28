import api from "./api";

// ==========================================
// Transaction Types
// ==========================================

export enum TransactionType {
  INCOME = "income",
  EXPENSE = "expense",
}

export enum PaymentType {
  CASH = "cash",
  BANK = "bank",
}

export enum VoucherStatus {
  DRAFT = "draft",
  PENDING = "pending",
  APPROVED = "approved",
  CANCELLED = "cancelled",
}

// ==========================================
// Transaction Category Types
// ==========================================

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

export interface TransactionCategoryListResponse {
  data: TransactionCategory[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==========================================
// Transaction Voucher Types
// ==========================================

export interface TransactionVoucher {
  id: string;
  tenantId: string;
  brandId: string;
  branchId: string;
  voucherNumber: string;
  transactionType: TransactionType;
  voucherDate: string;
  categoryId?: string;
  category?: TransactionCategory;
  amount: number;
  paymentType: PaymentType;
  paymentMethodId?: string;
  paymentMethod?: any;
  bankAccountId?: string;
  bankAccount?: any;
  counterpartyName?: string;
  counterpartyAddress?: string;
  counterpartyTaxCode?: string;
  reason: string;
  notes?: string;
  attachments?: string[];
  status: VoucherStatus;
  createdById?: string;
  createdBy?: any;
  approvedById?: string;
  approvedBy?: any;
  approvedAt?: string;
  cancelledReason?: string;
  referenceCode?: string;
  referenceType?: string;
  branch?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionVoucherDto {
  branchId?: string;
  transactionType: TransactionType;
  voucherDate: string;
  categoryId?: string;
  amount: number;
  paymentType: PaymentType;
  paymentMethodId?: string;
  bankAccountId?: string;
  counterpartyName?: string;
  counterpartyAddress?: string;
  counterpartyTaxCode?: string;
  reason: string;
  notes?: string;
  attachments?: string[];
  status?: VoucherStatus;
  referenceCode?: string;
  referenceType?: string;
}

export interface TransactionVoucherListResponse {
  data: TransactionVoucher[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
}

export interface CashBankReportResponse {
  data: (TransactionVoucher & { income: number; expense: number; balance: number })[];
  summary: {
    totalIncome: number;
    totalExpense: number;
    finalBalance: number;
  };
}

// ==========================================
// Transaction Category Service
// ==========================================

export const transactionCategoryService = {
  /**
   * Lấy danh sách danh mục (có phân trang)
   */
  async getList(params?: {
    type?: TransactionType;
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<TransactionCategoryListResponse> {
    const cleanParams = params
      ? Object.fromEntries(
          Object.entries(params).filter(
            ([, value]) => value !== undefined && value !== ""
          )
        )
      : undefined;
    const response = await api.get<TransactionCategoryListResponse>(
      "/api/transaction-categories",
      { params: cleanParams }
    );
    return response.data;
  },

  /**
   * Lấy danh sách cho dropdown (không phân trang)
   */
  async getDropdown(type?: TransactionType): Promise<TransactionCategory[]> {
    const params = type ? { type } : undefined;
    const response = await api.get<TransactionCategory[]>(
      "/api/transaction-categories/dropdown",
      { params }
    );
    return response.data;
  },

  /**
   * Lấy chi tiết danh mục
   */
  async getById(id: string): Promise<TransactionCategory> {
    const response = await api.get<TransactionCategory>(
      `/api/transaction-categories/${id}`
    );
    return response.data;
  },

  /**
   * Tạo danh mục mới
   */
  async create(
    data: CreateTransactionCategoryDto
  ): Promise<TransactionCategory> {
    const response = await api.post<TransactionCategory>(
      "/api/transaction-categories",
      data
    );
    return response.data;
  },

  /**
   * Cập nhật danh mục
   */
  async update(
    id: string,
    data: Partial<CreateTransactionCategoryDto>
  ): Promise<TransactionCategory> {
    const response = await api.put<TransactionCategory>(
      `/api/transaction-categories/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Xóa danh mục
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/api/transaction-categories/${id}`);
  },

  /**
   * Kích hoạt/Tạm ngưng
   */
  async toggleActive(id: string): Promise<TransactionCategory> {
    const response = await api.patch<TransactionCategory>(
      `/api/transaction-categories/${id}/toggle-active`
    );
    return response.data;
  },

  /**
   * Khởi tạo danh mục mặc định
   */
  async seed(): Promise<{ message: string; created: number }> {
    const response = await api.post<{ message: string; created: number }>(
      "/api/transaction-categories/seed"
    );
    return response.data;
  },
};

// ==========================================
// Transaction Voucher Service
// ==========================================

export const transactionVoucherService = {
  /**
   * Lấy danh sách phiếu thu chi
   */
  async getList(params?: {
    brandId?: string;
    branchId?: string;
    transactionType?: TransactionType;
    paymentType?: PaymentType;
    status?: VoucherStatus;
    categoryId?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<TransactionVoucherListResponse> {
    const cleanParams = params
      ? Object.fromEntries(
          Object.entries(params).filter(
            ([, value]) => value !== undefined && value !== ""
          )
        )
      : undefined;
    const response = await api.get<TransactionVoucherListResponse>(
      "/api/transaction-vouchers",
      { params: cleanParams }
    );
    return response.data;
  },

  /**
   * Lấy chi tiết phiếu
   */
  async getById(id: string): Promise<TransactionVoucher> {
    const response = await api.get<TransactionVoucher>(
      `/api/transaction-vouchers/${id}`
    );
    return response.data;
  },

  /**
   * Tạo phiếu mới
   */
  async create(data: CreateTransactionVoucherDto): Promise<TransactionVoucher> {
    const response = await api.post<TransactionVoucher>(
      "/api/transaction-vouchers",
      data
    );
    return response.data;
  },

  /**
   * Cập nhật phiếu
   */
  async update(
    id: string,
    data: Partial<CreateTransactionVoucherDto>
  ): Promise<TransactionVoucher> {
    const response = await api.put<TransactionVoucher>(
      `/api/transaction-vouchers/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Xóa phiếu
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/api/transaction-vouchers/${id}`);
  },

  /**
   * Gửi duyệt
   */
  async submit(id: string): Promise<TransactionVoucher> {
    const response = await api.patch<TransactionVoucher>(
      `/api/transaction-vouchers/${id}/submit`
    );
    return response.data;
  },

  /**
   * Duyệt phiếu
   */
  async approve(id: string): Promise<TransactionVoucher> {
    const response = await api.patch<TransactionVoucher>(
      `/api/transaction-vouchers/${id}/approve`
    );
    return response.data;
  },

  /**
   * Hủy phiếu
   */
  async cancel(id: string, reason: string): Promise<TransactionVoucher> {
    const response = await api.patch<TransactionVoucher>(
      `/api/transaction-vouchers/${id}/cancel`,
      { reason }
    );
    return response.data;
  },

  /**
   * Sổ quỹ tiền mặt
   */
  async getCashBook(params: {
    brandId?: string;
    branchId?: string;
    fromDate: string;
    toDate: string;
  }): Promise<CashBankReportResponse> {
    const response = await api.get<CashBankReportResponse>(
      "/api/transaction-vouchers/cash-book",
      { params }
    );
    return response.data;
  },

  /**
   * Sổ tiền gửi ngân hàng
   */
  async getBankBook(params: {
    brandId?: string;
    branchId?: string;
    fromDate: string;
    toDate: string;
  }): Promise<CashBankReportResponse> {
    const response = await api.get<CashBankReportResponse>(
      "/api/transaction-vouchers/bank-book",
      { params }
    );
    return response.data;
  },
};

// Helper functions
export const transactionTypeLabels: Record<TransactionType, string> = {
  [TransactionType.INCOME]: "Thu",
  [TransactionType.EXPENSE]: "Chi",
};

export const paymentTypeLabels: Record<PaymentType, string> = {
  [PaymentType.CASH]: "Tiền mặt",
  [PaymentType.BANK]: "Chuyển khoản",
};

export const voucherStatusLabels: Record<VoucherStatus, string> = {
  [VoucherStatus.DRAFT]: "Nháp",
  [VoucherStatus.PENDING]: "Chờ duyệt",
  [VoucherStatus.APPROVED]: "Đã duyệt",
  [VoucherStatus.CANCELLED]: "Đã hủy",
};

export const voucherStatusColors: Record<VoucherStatus, string> = {
  [VoucherStatus.DRAFT]: "bg-gray-100 text-gray-800",
  [VoucherStatus.PENDING]: "bg-yellow-100 text-yellow-800",
  [VoucherStatus.APPROVED]: "bg-green-100 text-green-800",
  [VoucherStatus.CANCELLED]: "bg-red-100 text-red-800",
};
