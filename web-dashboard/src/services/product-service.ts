import api from "./api";

export enum ProductType {
  FOOD = "food",
  DRINK = "drink",
  OTHER = "other",
  TOPPING = "topping",
  COMBO = "combo",
}

export enum SellingType {
  PORTION = "portion",
  WEIGHT = "weight",
}

export interface Product {
  id: string;
  code: string;
  name: string;
  type: ProductType;
  categoryId?: string;
  categoryName?: string;
  price: number;
  discountPrice?: number;
  vatRate: number;
  unit?: string;
  description?: string;
  imageUrl?: string;
  preparationTime: number;
  costPrice: number;
  sellingType: SellingType;
  printDish: boolean;
  printLabel: boolean;
  printSeafood: boolean;
  isActive: boolean;
  sortOrder: number;
  brandId?: string;
  createdAt: string;
}

export interface CreateProductDto {
  name: string;
  type: ProductType;
  categoryId?: string;
  price: number;
  discountPrice?: number;
  vatRate?: number;
  unit?: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  preparationTime?: number;
  costPrice?: number;
  sellingType?: SellingType;
  printDish?: boolean;
  printLabel?: boolean;
  printSeafood?: boolean;
  noteIds?: string[];
}

export interface UpdateProductDto {
  name?: string;
  type?: ProductType;
  categoryId?: string;
  price?: number;
  discountPrice?: number;
  vatRate?: number;
  unit?: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  preparationTime?: number;
  costPrice?: number;
  sellingType?: SellingType;
  printDish?: boolean;
  printLabel?: boolean;
  printSeafood?: boolean;
  noteIds?: string[];
}

// Product Note interfaces
export interface ProductNote {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  brandId?: string;
  createdAt: string;
}

export interface ProductNoteAssignment {
  id: string;
  noteId: string;
  note: ProductNote;
  sortOrder: number;
}

export interface CreateProductNoteDto {
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateProductNoteDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// Combo Item interfaces
export interface ComboItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  sortOrder: number;
}

// Topping Group interfaces
export interface ToppingItem {
  id: string;
  toppingId: string;
  topping: Product;
  priceAdjustment: number;
  maxQuantity: number;
  sortOrder: number;
}

export interface ToppingGroup {
  id: string;
  name: string;
  description?: string;
  isRequired: boolean;
  minSelection: number;
  maxSelection: number;
  isActive: boolean;
  sortOrder: number;
  brandId?: string;
  items: ToppingItem[];
}

export interface CreateToppingGroupDto {
  name: string;
  isRequired?: boolean;
  minSelection?: number;
  maxSelection?: number;
  sortOrder?: number;
}

export interface UpdateToppingGroupDto {
  name?: string;
  isRequired?: boolean;
  minSelection?: number;
  maxSelection?: number;
  sortOrder?: number;
}

export interface AddToppingItemDto {
  toppingId: string;
  priceAdjustment?: number;
  maxQuantity?: number;
  sortOrder?: number;
}

export interface UpdateToppingItemDto {
  priceAdjustment?: number;
  maxQuantity?: number;
  sortOrder?: number;
}

// Bulk import interfaces
export interface BulkProductItem {
  id?: string; // If provided, will update existing product
  code?: string; // Product code (only for update)
  name: string;
  type: ProductType;
  categoryId?: string;
  categoryName?: string; // For lookup
  price: number;
  discountPrice?: number;
  vatRate?: number;
  unit?: string;
  description?: string;
  imageUrl?: string;
  preparationTime?: number;
  costPrice?: number;
  sellingType?: SellingType;
  printDish?: boolean;
  printLabel?: boolean;
  printSeafood?: boolean;
}

export interface ProductBulkImportResult {
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
  products: Product[];
}

export const productService = {
  getAll: async (brandId?: string, type?: ProductType): Promise<Product[]> => {
    const params: Record<string, any> = {};
    if (brandId) params.brandId = brandId;
    if (type) params.type = type;
    const response = await api.get<Product[]>("/products", { params });
    return response.data;
  },

  getById: async (id: string): Promise<Product> => {
    const response = await api.get<Product>(`/products/${id}`);
    return response.data;
  },

  create: async (data: CreateProductDto): Promise<Product> => {
    const response = await api.post<Product>("/products", data);
    return response.data;
  },

  update: async (id: string, data: UpdateProductDto): Promise<Product> => {
    const response = await api.put<Product>(`/products/${id}`, data);
    return response.data;
  },

  toggleActive: async (id: string): Promise<Product> => {
    const response = await api.patch<Product>(`/products/${id}/toggle-active`);
    return response.data;
  },

  // Available Toppings
  getAvailableToppings: async (brandId?: string): Promise<Product[]> => {
    const params: Record<string, any> = {};
    if (brandId) params.brandId = brandId;
    const response = await api.get<Product[]>("/products/toppings/available", { params });
    return response.data;
  },

  // === Shared Topping Group Management ===

  getAllToppingGroups: async (brandId?: string): Promise<ToppingGroup[]> => {
    const params = brandId ? { brandId } : {};
    const response = await api.get<ToppingGroup[]>("/products/topping-groups", { params });
    return response.data;
  },

  getToppingGroupById: async (groupId: string): Promise<ToppingGroup> => {
    const response = await api.get<ToppingGroup>(`/products/topping-groups/${groupId}`);
    return response.data;
  },

  createToppingGroup: async (data: CreateToppingGroupDto): Promise<ToppingGroup> => {
    const response = await api.post<ToppingGroup>("/products/topping-groups", data);
    return response.data;
  },

  updateToppingGroup: async (groupId: string, data: UpdateToppingGroupDto): Promise<ToppingGroup> => {
    const response = await api.put<ToppingGroup>(`/products/topping-groups/${groupId}`, data);
    return response.data;
  },

  deleteToppingGroup: async (groupId: string): Promise<void> => {
    await api.delete(`/products/topping-groups/${groupId}`);
  },

  toggleToppingGroupActive: async (groupId: string): Promise<ToppingGroup> => {
    const response = await api.patch<ToppingGroup>(`/products/topping-groups/${groupId}/toggle-active`);
    return response.data;
  },

  // === Topping Group Item Management ===

  addToppingItem: async (groupId: string, data: AddToppingItemDto): Promise<ToppingGroup> => {
    const response = await api.post<ToppingGroup>(`/products/topping-groups/${groupId}/items`, data);
    return response.data;
  },

  updateToppingItem: async (groupId: string, itemId: string, data: UpdateToppingItemDto): Promise<ToppingGroup> => {
    const response = await api.put<ToppingGroup>(`/products/topping-groups/${groupId}/items/${itemId}`, data);
    return response.data;
  },

  removeToppingItem: async (groupId: string, itemId: string): Promise<ToppingGroup> => {
    const response = await api.delete<ToppingGroup>(`/products/topping-groups/${groupId}/items/${itemId}`);
    return response.data;
  },

  // === Product Topping Group Assignment ===

  getProductToppingGroups: async (productId: string): Promise<ToppingGroup[]> => {
    const response = await api.get<ToppingGroup[]>(`/products/${productId}/topping-groups`);
    return response.data;
  },

  assignToppingGroupsToProduct: async (productId: string, groupIds: string[]): Promise<ToppingGroup[]> => {
    const response = await api.post<ToppingGroup[]>(`/products/${productId}/topping-groups`, { groupIds });
    return response.data;
  },

  addToppingGroupToProduct: async (productId: string, groupId: string): Promise<ToppingGroup[]> => {
    const response = await api.post<ToppingGroup[]>(`/products/${productId}/topping-groups/${groupId}`);
    return response.data;
  },

  removeToppingGroupFromProduct: async (productId: string, groupId: string): Promise<ToppingGroup[]> => {
    const response = await api.delete<ToppingGroup[]>(`/products/${productId}/topping-groups/${groupId}`);
    return response.data;
  },

  // === Product Notes Management ===

  getAllNotes: async (brandId?: string): Promise<ProductNote[]> => {
    const params = brandId ? { brandId } : {};
    const response = await api.get<ProductNote[]>("/products/notes/all", { params });
    return response.data;
  },

  createNote: async (data: CreateProductNoteDto): Promise<ProductNote> => {
    const response = await api.post<ProductNote>("/products/notes", data);
    return response.data;
  },

  updateNote: async (noteId: string, data: UpdateProductNoteDto): Promise<ProductNote> => {
    const response = await api.put<ProductNote>(`/products/notes/${noteId}`, data);
    return response.data;
  },

  deleteNote: async (noteId: string): Promise<void> => {
    await api.delete(`/products/notes/${noteId}`);
  },

  getProductNotes: async (productId: string): Promise<ProductNoteAssignment[]> => {
    const response = await api.get<ProductNoteAssignment[]>(`/products/${productId}/notes`);
    return response.data;
  },

  assignNotesToProduct: async (productId: string, noteIds: string[]): Promise<ProductNoteAssignment[]> => {
    const response = await api.post<ProductNoteAssignment[]>(`/products/${productId}/notes`, { noteIds });
    return response.data;
  },

  addNoteToProduct: async (productId: string, noteId: string): Promise<ProductNoteAssignment[]> => {
    const response = await api.post<ProductNoteAssignment[]>(`/products/${productId}/notes/${noteId}`);
    return response.data;
  },

  removeNoteFromProduct: async (productId: string, noteId: string): Promise<ProductNoteAssignment[]> => {
    const response = await api.delete<ProductNoteAssignment[]>(`/products/${productId}/notes/${noteId}`);
    return response.data;
  },

  // === Note to Multiple Products Assignment ===

  getProductsByNote: async (noteId: string): Promise<Product[]> => {
    const response = await api.get<Product[]>(`/products/notes/${noteId}/products`);
    return response.data;
  },

  assignNoteToProducts: async (noteId: string, productIds: string[]): Promise<{ noteId: string; productCount: number; products: Product[] }> => {
    const response = await api.post<{ noteId: string; productCount: number; products: Product[] }>(`/products/notes/${noteId}/products`, { productIds });
    return response.data;
  },

  // === Combo Items Management ===

  getAvailableProductsForCombo: async (brandId?: string): Promise<Product[]> => {
    const params: Record<string, any> = {};
    if (brandId) params.brandId = brandId;
    const response = await api.get<Product[]>("/products/combo/available-products", { params });
    return response.data;
  },

  getComboItems: async (comboId: string): Promise<ComboItem[]> => {
    const response = await api.get<ComboItem[]>(`/products/${comboId}/combo-items`);
    return response.data;
  },

  assignComboItems: async (comboId: string, items: { productId: string; quantity?: number }[]): Promise<ComboItem[]> => {
    const response = await api.post<ComboItem[]>(`/products/${comboId}/combo-items`, { items });
    return response.data;
  },

  addItemToCombo: async (comboId: string, productId: string, quantity?: number): Promise<ComboItem[]> => {
    const response = await api.post<ComboItem[]>(`/products/${comboId}/combo-items/${productId}`, { quantity });
    return response.data;
  },

  removeItemFromCombo: async (comboId: string, productId: string): Promise<ComboItem[]> => {
    const response = await api.delete<ComboItem[]>(`/products/${comboId}/combo-items/${productId}`);
    return response.data;
  },

  // === Bulk Import ===

  bulkImport: async (items: BulkProductItem[], brandId: string): Promise<ProductBulkImportResult> => {
    const response = await api.post<ProductBulkImportResult>("/products/bulk-import", { items, brandId });
    return response.data;
  },
};
