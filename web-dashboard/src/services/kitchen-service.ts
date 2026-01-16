import api from "./api";
import { Product } from "./product-service";

/**
 * Chế độ in của bếp
 * - TICKET: In phiếu bếp (nhiều món trên 1 tờ)
 * - LABEL: In tem (1 tem cho mỗi món/ly)
 * - BOTH: In cả phiếu và tem
 */
export type KitchenPrintMode = "TICKET" | "LABEL" | "BOTH";

/**
 * Loại bếp
 */
export type KitchenType =
  | "kitchen"   // Bếp chính
  | "bar"       // Quầy bar/đồ uống
  | "grill"     // Bếp nướng
  | "dessert"   // Tráng miệng
  | "seafood"   // Hải sản
  | "hotpot"    // Lẩu
  | "bakery"    // Bánh
  | "other";    // Khác

/**
 * Label cho các loại bếp
 */
export const KitchenTypeLabels: Record<KitchenType, string> = {
  kitchen: "Bếp chính",
  bar: "Quầy Bar",
  grill: "Bếp nướng",
  dessert: "Tráng miệng",
  seafood: "Hải sản",
  hotpot: "Lẩu",
  bakery: "Bánh",
  other: "Khác",
};

/**
 * Label cho các chế độ in
 */
export const PrintModeLabels: Record<KitchenPrintMode, string> = {
  TICKET: "In phiếu bếp",
  LABEL: "In tem/sticker",
  BOTH: "In cả phiếu và tem",
};

/**
 * Loại giao thức máy in
 * - ESC_POS: Máy in hóa đơn/receipt (thermal printer)
 * - TSPL: Máy in tem/sticker (label printer)
 */
export type PrinterProtocol = "ESC_POS" | "TSPL";

/**
 * Label cho các giao thức máy in
 */
export const PrinterProtocolLabels: Record<PrinterProtocol, string> = {
  ESC_POS: "ESC/POS (Máy in bill)",
  TSPL: "TSPL (Máy in tem)",
};

export interface Kitchen {
  id: string;
  name: string;
  kitchenType?: KitchenType;
  printerName?: string;
  printerIp?: string;
  printerPort?: number;
  printerProtocol?: PrinterProtocol;
  paperWidth?: number; // 58, 80, 110, etc.
  printMode?: KitchenPrintMode;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  productCount?: number;
  brandId?: string;
  branchId?: string;
  createdAt: string;
  // Ticket printing config
  ticketCutAfterPrint?: boolean;
  ticketPrintItemsSeparately?: boolean;
  ticketCopies?: number;
  // Label printing config
  labelPrintPrice?: boolean;
  labelPrintStoreName?: boolean;
  labelPrintOrderNumber?: boolean;
  labelPrintTableName?: boolean;
  labelPrintTime?: boolean;
  labelStoreName?: string;
  labelReverse?: boolean;
}

export interface CreateKitchenDto {
  name: string;
  kitchenType?: KitchenType;
  printerName?: string;
  printerIp?: string;
  printerPort?: number;
  printerProtocol?: PrinterProtocol;
  paperWidth?: number;
  printMode?: KitchenPrintMode;
  description?: string;
  // Ticket printing config
  ticketCutAfterPrint?: boolean;
  ticketPrintItemsSeparately?: boolean;
  ticketCopies?: number;
  // Label printing config
  labelPrintPrice?: boolean;
  labelPrintStoreName?: boolean;
  labelPrintOrderNumber?: boolean;
  labelPrintTableName?: boolean;
  labelPrintTime?: boolean;
  labelStoreName?: string;
  labelReverse?: boolean;
}

export interface UpdateKitchenDto {
  name?: string;
  kitchenType?: KitchenType;
  printerName?: string;
  printerIp?: string;
  printerPort?: number;
  printerProtocol?: PrinterProtocol;
  paperWidth?: number;
  printMode?: KitchenPrintMode;
  description?: string;
  // Ticket printing config
  ticketCutAfterPrint?: boolean;
  ticketPrintItemsSeparately?: boolean;
  ticketCopies?: number;
  // Label printing config
  labelPrintPrice?: boolean;
  labelPrintStoreName?: boolean;
  labelPrintOrderNumber?: boolean;
  labelPrintTableName?: boolean;
  labelPrintTime?: boolean;
  labelStoreName?: string;
  labelReverse?: boolean;
}

export const kitchenService = {
  getAll: async (branchId?: string): Promise<Kitchen[]> => {
    const params = branchId ? { branchId } : {};
    const response = await api.get<Kitchen[]>("/kitchen", { params });
    return response.data;
  },

  getById: async (id: string): Promise<Kitchen> => {
    const response = await api.get<Kitchen>(`/kitchen/${id}`);
    return response.data;
  },

  create: async (data: CreateKitchenDto): Promise<Kitchen> => {
    const response = await api.post<Kitchen>("/kitchen", data);
    return response.data;
  },

  update: async (id: string, data: UpdateKitchenDto): Promise<Kitchen> => {
    const response = await api.put<Kitchen>(`/kitchen/${id}`, data);
    return response.data;
  },

  toggleActive: async (id: string): Promise<Kitchen> => {
    const response = await api.patch<Kitchen>(`/kitchen/${id}/toggle-active`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/kitchen/${id}`);
  },

  // Product assignment APIs
  getKitchenProducts: async (kitchenId: string): Promise<Product[]> => {
    const response = await api.get<Product[]>(`/kitchen/${kitchenId}/products`);
    return response.data;
  },

  setKitchenProducts: async (kitchenId: string, productIds: string[]): Promise<Product[]> => {
    const response = await api.put<Product[]>(`/kitchen/${kitchenId}/products`, { productIds });
    return response.data;
  },

  addProductToKitchen: async (kitchenId: string, productId: string): Promise<Product[]> => {
    const response = await api.post<Product[]>(`/kitchen/${kitchenId}/products/${productId}`);
    return response.data;
  },

  removeProductFromKitchen: async (kitchenId: string, productId: string): Promise<Product[]> => {
    const response = await api.delete<Product[]>(`/kitchen/${kitchenId}/products/${productId}`);
    return response.data;
  },

  getProductKitchens: async (productId: string): Promise<Kitchen[]> => {
    const response = await api.get<Kitchen[]>(`/kitchen/product/${productId}/kitchens`);
    return response.data;
  },

  setProductKitchens: async (productId: string, kitchenIds: string[]): Promise<Kitchen[]> => {
    const response = await api.put<Kitchen[]>(`/kitchen/product/${productId}/kitchens`, { kitchenIds });
    return response.data;
  },
};
