import api from "./api";
import { Area } from "./area-service";

export enum TableStatus {
  AVAILABLE = "available",
  OCCUPIED = "occupied",
  RESERVED = "reserved",
  CLEANING = "cleaning",
  MAINTENANCE = "maintenance",
}

export const tableStatusLabels: Record<TableStatus, { label: string; color: string }> = {
  [TableStatus.AVAILABLE]: { label: "Trống", color: "bg-green-100 text-green-800" },
  [TableStatus.OCCUPIED]: { label: "Có khách", color: "bg-red-100 text-red-800" },
  [TableStatus.RESERVED]: { label: "Đã đặt", color: "bg-yellow-100 text-yellow-800" },
  [TableStatus.CLEANING]: { label: "Đang dọn", color: "bg-blue-100 text-blue-800" },
  [TableStatus.MAINTENANCE]: { label: "Bảo trì", color: "bg-gray-100 text-gray-800" },
};

export interface Table {
  id: string;
  areaId: string;
  area?: Area;
  name: string;
  capacity: number;
  status: TableStatus;
  sortOrder: number;
  isActive: boolean;
  brandId?: string;
  branchId?: string;
  createdAt: string;
}

export interface CreateTableDto {
  areaId: string;
  name: string;
  capacity?: number;
  sortOrder?: number;
}

export interface UpdateTableDto {
  areaId?: string;
  name?: string;
  capacity?: number;
  sortOrder?: number;
}

export interface TableCountByArea {
  areaId: string;
  count: number;
}

export const tableService = {
  getAll: async (branchId?: string): Promise<Table[]> => {
    const params = branchId ? { branchId } : {};
    const response = await api.get<Table[]>("/tables", { params });
    return response.data;
  },

  getCountByArea: async (): Promise<TableCountByArea[]> => {
    const response = await api.get<TableCountByArea[]>("/tables/count-by-area");
    return response.data;
  },

  getById: async (id: string): Promise<Table> => {
    const response = await api.get<Table>(`/tables/${id}`);
    return response.data;
  },

  create: async (data: CreateTableDto): Promise<Table> => {
    const response = await api.post<Table>("/tables", data);
    return response.data;
  },

  update: async (id: string, data: UpdateTableDto): Promise<Table> => {
    const response = await api.put<Table>(`/tables/${id}`, data);
    return response.data;
  },

  updateStatus: async (id: string, status: TableStatus): Promise<Table> => {
    const response = await api.patch<Table>(`/tables/${id}/status`, { status });
    return response.data;
  },

  toggleActive: async (id: string): Promise<Table> => {
    const response = await api.patch<Table>(`/tables/${id}/toggle-active`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/tables/${id}`);
  },
};
