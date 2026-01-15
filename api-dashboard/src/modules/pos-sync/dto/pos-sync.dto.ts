/**
 * POS Sync DTOs - Data Transfer Objects for CCB App synchronization
 *
 * These DTOs match the expected format in CCB Android app's SyncDto.kt
 */

// ============ Category DTO ============
export class PosCategoryDto {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============ Product DTO ============
export class PosProductToppingDto {
  toppingId: string;
  groupName: string;
  groupType: string;
  isRequired: boolean;
  isMultiple: boolean;
  extraPrice: number;
  isDefault: boolean;
  sortOrder: number;
}

export class PosProductDto {
  id: string;
  categoryId?: string;
  code: string;
  name: string;
  searchName?: string;
  abbreviation?: string;
  description?: string;
  imageUrl?: string;
  price: number;
  costPrice: number;
  vatRate: number;
  unit?: string;
  type: string;
  isAvailable: boolean;
  isActive: boolean;
  sortOrder: number;
  preparationTime: number;
  printToKitchen: boolean;
  printToBar: boolean;
  // Kitchen IDs - comma-separated list for routing print
  kitchenIds?: string;
  createdAt: string;
  updatedAt: string;
  toppings?: PosProductToppingDto[];
}

// ============ Area DTO ============
export class PosAreaDto {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============ Table DTO ============
export class PosTableDto {
  id: string;
  areaId?: string;
  name: string;
  capacity: number;
  status: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============ Staff DTO ============
export class PosStaffDto {
  id: string;
  code?: string;
  name: string;
  phone?: string;
  email?: string;
  role: string;
  departmentId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============ Kitchen DTO ============
export class PosKitchenDto {
  id: string;
  name: string;
  kitchenType?: string;
  printerName?: string;
  printerIp?: string;
  printerPort?: number;
  paperWidth?: number;
  printMode?: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ============ Branch Info DTO ============
export class PosBranchInfoDto {
  id: string;
  name: string;
  code?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  openTime?: string;
  closeTime?: string;
  isActive: boolean;
}

// ============ Topping Group DTO ============
export class PosToppingItemDto {
  id: string;
  name: string;
  price: number;
  isDefault: boolean;
  sortOrder: number;
  isActive: boolean;
}

export class PosToppingGroupDto {
  id: string;
  name: string;
  groupType: string;
  isRequired: boolean;
  isMultiple: boolean;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  isActive: boolean;
  items: PosToppingItemDto[];
  productIds: string[];
}

// ============ Product Note DTO ============
export class PosProductNoteDto {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  productIds: string[];
}

// ============ Combo Item DTO ============
export class PosComboItemDto {
  comboId: string;
  productId: string;
  quantity: number;
  sortOrder: number;
}

// ============ Seasonal Price DTO ============
export class PosSeasonalPriceProductDto {
  productId: string;
}

export class PosSeasonalPriceDto {
  id: string;
  name: string;
  description?: string;
  adjustmentType: string;
  adjustmentValue: number;
  startDate: string;
  endDate: string;
  sortOrder: number;
  isActive: boolean;
  products: PosSeasonalPriceProductDto[];
  createdAt: string;
  updatedAt: string;
}

// ============ Coupon DTO ============
export class PosCouponDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  couponType: string;
  applyTo: string;
  activationType: string;
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount: number;
  minQuantity: number;
  productIds?: string[];
  categoryIds?: string[];
  isCombinable: boolean;
  priority: number;
  usageLimit?: number;
  usageCount: number;
  dailyLimit?: number;
  dailyUsageCount: number;
  requiresApproval: boolean;
  approvalThreshold?: number;
  startDate?: string;
  endDate?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============ Bill Template DTO ============
export class PosBillTemplateDto {
  id: string;
  name: string;
  paperWidth: number;
  headerText?: string;
  footerText?: string;
  showLogo: boolean;
  showQrCode: boolean;
  showBarcode: boolean;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============ Bill Printer Config DTO ============
export class PosBillPrinterConfigDto {
  id: string;
  name: string;
  printerType: string;
  printerIp?: string;
  printerPort?: number;
  paperWidth: number;
  isDefault: boolean;
  isActive: boolean;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ Full Sync Response ============
export class PosFullSyncResponseDto {
  categories: PosCategoryDto[];
  products: PosProductDto[];
  areas: PosAreaDto[];
  tables: PosTableDto[];
  staff: PosStaffDto[];
  kitchens?: PosKitchenDto[];
  branchInfo?: PosBranchInfoDto;
  seasonalPrices?: PosSeasonalPriceDto[];
  coupons?: PosCouponDto[];
  toppingGroups?: PosToppingGroupDto[];
  productNotes?: PosProductNoteDto[];
  comboItems?: PosComboItemDto[];
  billTemplates?: PosBillTemplateDto[];
  billPrinterConfigs?: PosBillPrinterConfigDto[];
}

// ============ Sync Response Wrapper ============
export class PosSyncResponseDto<T> {
  data: T[];
  total: number;
  timestamp: string;
}
