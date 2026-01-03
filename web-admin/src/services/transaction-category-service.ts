import api from "./api";

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

export interface UpdateTransactionCategoryDto {
  name?: string;
  type?: TransactionType;
  description?: string;
  isActive?: boolean;
}

export interface FilterParams {
  type?: TransactionType;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const transactionCategoryService = {
  async getAll(params?: FilterParams): Promise<PaginatedResponse<TransactionCategory>> {
    const response = await api.get<PaginatedResponse<TransactionCategory>>("/transaction-categories", { params });
    return response.data;
  },

  async getById(id: string): Promise<TransactionCategory> {
    const response = await api.get<TransactionCategory>(`/transaction-categories/${id}`);
    return response.data;
  },

  async create(data: CreateTransactionCategoryDto): Promise<TransactionCategory> {
    const response = await api.post<TransactionCategory>("/transaction-categories", data);
    return response.data;
  },

  async update(id: string, data: UpdateTransactionCategoryDto): Promise<TransactionCategory> {
    const response = await api.put<TransactionCategory>(`/transaction-categories/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/transaction-categories/${id}`);
  },

  async toggleActive(id: string): Promise<TransactionCategory> {
    const response = await api.patch<TransactionCategory>(`/transaction-categories/${id}/toggle-active`);
    return response.data;
  },

  async seedDefaults(): Promise<void> {
    await api.post("/transaction-categories/seed");
  },
};
