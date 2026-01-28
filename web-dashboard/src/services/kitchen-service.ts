import api from "./api";
import { Product } from "./product-service";

/**
 * Chế độ in của bếp
 * - TICKET: In phiếu bếp (nhiều món trên 1 tờ)
 * - LABEL: In tem (1 tem cho mỗi món/ly)
 */
export type KitchenPrintMode = "TICKET" | "LABEL";

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
};

/**
 * Cỡ chữ phiếu bếp - Nhiều lựa chọn hơn để phù hợp các khổ giấy khác nhau
 */
export type TicketFontSize = "extra_small" | "small" | "medium" | "large" | "extra_large";

export const TicketFontSizeLabels: Record<TicketFontSize, string> = {
  extra_small: "Rất nhỏ (0.7x)",
  small: "Nhỏ (0.85x)",
  medium: "Vừa (1.0x)",
  large: "Lớn (1.2x)",
  extra_large: "Rất lớn (1.4x)",
};

/**
 * Font scale values tương ứng với từng cỡ chữ
 */
export const TicketFontScaleValues: Record<TicketFontSize, number> = {
  extra_small: 0.7,
  small: 0.85,
  medium: 1.0,
  large: 1.2,
  extra_large: 1.4,
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

/**
 * Các kích thước tem phổ biến
 */
export const LABEL_SIZE_OPTIONS = [
  { width: 40, height: 30, label: "40x30mm (Nhỏ)", maxToppings: 2 },
  { width: 50, height: 30, label: "50x30mm (Nhỏ)", maxToppings: 2 },
  { width: 60, height: 40, label: "60x40mm (Trung bình)", maxToppings: 3 },
  { width: 72, height: 30, label: "72x30mm (Mặc định)", maxToppings: 2 },
  { width: 80, height: 50, label: "80x50mm (Lớn)", maxToppings: 5 },
  { width: 100, height: 50, label: "100x50mm (Lớn)", maxToppings: 6 },
  { width: 100, height: 80, label: "100x80mm (Rất lớn)", maxToppings: 10 },
];

/**
 * Lấy max toppings đề xuất dựa trên kích thước tem
 */
export function getRecommendedMaxToppings(width: number, height: number): number {
  if (height <= 30) return 2;
  if (height <= 40) return 3;
  if (height <= 50 && width <= 80) return 5;
  if (height <= 50) return 6;
  return 10;
}

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
  ticketPrintOrderNumber?: boolean;
  ticketPrintTableName?: boolean;
  ticketPrintTime?: boolean;
  ticketPrintStoreName?: boolean;
  ticketStoreName?: string;
  ticketPrintNotes?: boolean;
  ticketFontSize?: TicketFontSize;
  ticketPrintPrice?: boolean;
  // Label printing config
  labelPrintPrice?: boolean;
  labelPrintStoreName?: boolean;
  labelPrintOrderNumber?: boolean;
  labelPrintTableName?: boolean;
  labelPrintTime?: boolean;
  labelStoreName?: string;
  labelReverse?: boolean;
  // Label size & font config
  labelWidthMm?: number;
  labelHeightMm?: number;
  labelGapMm?: number;
  labelFontScale?: number;
  labelMaxToppings?: number;
  // Line spacing config
  ticketLineSpacing?: number; // 0.3 - 1.0, default 0.4
  labelLineSpacing?: number; // 0.8 - 1.5, default 1.0
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
  ticketPrintOrderNumber?: boolean;
  ticketPrintTableName?: boolean;
  ticketPrintTime?: boolean;
  ticketPrintStoreName?: boolean;
  ticketStoreName?: string;
  ticketPrintNotes?: boolean;
  ticketFontSize?: TicketFontSize;
  ticketPrintPrice?: boolean;
  // Label printing config
  labelPrintPrice?: boolean;
  labelPrintStoreName?: boolean;
  labelPrintOrderNumber?: boolean;
  labelPrintTableName?: boolean;
  labelPrintTime?: boolean;
  labelStoreName?: string;
  labelReverse?: boolean;
  // Label size & font config
  labelWidthMm?: number;
  labelHeightMm?: number;
  labelGapMm?: number;
  labelFontScale?: number;
  labelMaxToppings?: number;
  // Line spacing config
  ticketLineSpacing?: number; // 0.3 - 1.0, default 0.4
  labelLineSpacing?: number; // 0.8 - 1.5, default 1.0
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
  ticketPrintOrderNumber?: boolean;
  ticketPrintTableName?: boolean;
  ticketPrintTime?: boolean;
  ticketPrintStoreName?: boolean;
  ticketStoreName?: string;
  ticketPrintNotes?: boolean;
  ticketFontSize?: TicketFontSize;
  ticketPrintPrice?: boolean;
  // Label printing config
  labelPrintPrice?: boolean;
  labelPrintStoreName?: boolean;
  labelPrintOrderNumber?: boolean;
  labelPrintTableName?: boolean;
  labelPrintTime?: boolean;
  labelStoreName?: string;
  labelReverse?: boolean;
  // Label size & font config
  labelWidthMm?: number;
  labelHeightMm?: number;
  labelGapMm?: number;
  labelFontScale?: number;
  labelMaxToppings?: number;
  // Line spacing config
  ticketLineSpacing?: number; // 0.3 - 1.0, default 0.4
  labelLineSpacing?: number; // 0.8 - 1.5, default 1.0
}

export const kitchenService = {
  getAll: async (branchId?: string): Promise<Kitchen[]> => {
    const params = branchId ? { branchId } : {};
    const response = await api.get<Kitchen[]>("/api/kitchen", { params });
    return response.data;
  },

  getById: async (id: string): Promise<Kitchen> => {
    const response = await api.get<Kitchen>(`/api/kitchen/${id}`);
    return response.data;
  },

  create: async (data: CreateKitchenDto): Promise<Kitchen> => {
    const response = await api.post<Kitchen>("/api/kitchen", data);
    return response.data;
  },

  update: async (id: string, data: UpdateKitchenDto): Promise<Kitchen> => {
    const response = await api.put<Kitchen>(`/api/kitchen/${id}`, data);
    return response.data;
  },

  toggleActive: async (id: string): Promise<Kitchen> => {
    const response = await api.patch<Kitchen>(`/api/kitchen/${id}/toggle-active`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/kitchen/${id}`);
  },

  // Product assignment APIs
  getKitchenProducts: async (kitchenId: string): Promise<Product[]> => {
    const response = await api.get<Product[]>(`/api/kitchen/${kitchenId}/products`);
    return response.data;
  },

  setKitchenProducts: async (kitchenId: string, productIds: string[]): Promise<Product[]> => {
    const response = await api.put<Product[]>(`/api/kitchen/${kitchenId}/products`, { productIds });
    return response.data;
  },

  addProductToKitchen: async (kitchenId: string, productId: string): Promise<Product[]> => {
    const response = await api.post<Product[]>(`/api/kitchen/${kitchenId}/products/${productId}`);
    return response.data;
  },

  removeProductFromKitchen: async (kitchenId: string, productId: string): Promise<Product[]> => {
    const response = await api.delete<Product[]>(`/api/kitchen/${kitchenId}/products/${productId}`);
    return response.data;
  },

  getProductKitchens: async (productId: string): Promise<Kitchen[]> => {
    const response = await api.get<Kitchen[]>(`/api/kitchen/product/${productId}/kitchens`);
    return response.data;
  },

  setProductKitchens: async (productId: string, kitchenIds: string[]): Promise<Kitchen[]> => {
    const response = await api.put<Kitchen[]>(`/api/kitchen/product/${productId}/kitchens`, { kitchenIds });
    return response.data;
  },

  // Get products with assigned kitchens (for product assignment dialog)
  getProductsWithKitchenAssignments: async (
    branchId?: string,
    categoryId?: string,
    search?: string,
  ): Promise<ProductWithKitchens[]> => {
    const params: Record<string, string> = {};
    if (branchId) params.branchId = branchId;
    if (categoryId) params.categoryId = categoryId;
    if (search) params.search = search;
    const response = await api.get<ProductWithKitchens[]>('/api/kitchen/products/with-assignments', { params });
    return response.data;
  },
};

// Product with assigned kitchens info
export interface ProductWithKitchens {
  id: string;
  code: string;
  name: string;
  categoryId: string | null;
  type: string;
  imageUrl: string | null;
  assignedKitchens: {
    id: string;
    name: string;
    kitchenType: string | null;
  }[];
}
