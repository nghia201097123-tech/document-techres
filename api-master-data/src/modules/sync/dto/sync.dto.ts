import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class SyncQueryDto {
  @ApiPropertyOptional({ description: 'Lấy dữ liệu từ thời điểm này (incremental sync)' })
  @IsOptional()
  @IsDateString()
  since?: string;
}

export class CategoryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ nullable: true })
  imageUrl: string | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class ProductDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true })
  categoryId: string | null;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true, description: 'Tên không dấu để tìm kiếm' })
  searchName: string | null;

  @ApiProperty({ nullable: true, description: 'Tên viết tắt để tìm kiếm nhanh (VD: "ccdc" cho "Cơm chiên dương châu")' })
  abbreviation: string | null;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ nullable: true })
  imageUrl: string | null;

  @ApiProperty()
  price: number;

  @ApiProperty()
  costPrice: number;

  @ApiProperty()
  vatRate: number;

  @ApiProperty({ nullable: true })
  unit: string | null;

  @ApiProperty()
  type: string;

  @ApiProperty()
  isAvailable: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  preparationTime: number;

  @ApiProperty()
  printToKitchen: boolean;

  @ApiProperty()
  printToBar: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class AreaDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class TableDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true })
  areaId: string | null;

  @ApiProperty()
  name: string;

  @ApiProperty()
  capacity: number;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class StaffDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  phone: string | null;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty({ nullable: true })
  avatarUrl: string | null;

  @ApiProperty()
  pinCode: string;

  @ApiProperty()
  role: string;

  @ApiProperty({ nullable: true })
  permissions: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class BrandDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  logoUrl: string;

  @ApiProperty()
  isActive: boolean;
}

export class BranchDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  brandId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  storeCode: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  status: string;
}

export class BrandWithBranchesDto {
  @ApiProperty()
  brand: BrandDto;

  @ApiProperty({ type: [BranchDto] })
  branches: BranchDto[];
}

export class SeasonalPriceProductDto {
  @ApiProperty()
  productId: string;
}

export class SeasonalPriceDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  adjustmentType: string;

  @ApiProperty()
  adjustmentValue: number;

  @ApiProperty()
  startDate: string;

  @ApiProperty()
  endDate: string;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: [SeasonalPriceProductDto] })
  products: SeasonalPriceProductDto[];

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class CouponDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  couponType: string;

  @ApiProperty()
  discountValue: number;

  @ApiProperty({ nullable: true })
  maxDiscount: number | null;

  @ApiProperty()
  minOrderAmount: number;

  @ApiProperty({ nullable: true })
  usageLimit: number | null;

  @ApiProperty()
  usageCount: number;

  @ApiProperty({ nullable: true })
  dailyLimit: number | null;

  @ApiProperty()
  dailyUsageCount: number;

  @ApiProperty()
  requiresApproval: boolean;

  @ApiProperty({ nullable: true })
  approvalThreshold: number | null;

  @ApiProperty({ nullable: true })
  startDate: string | null;

  @ApiProperty({ nullable: true })
  endDate: string | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

// ============ Product Note DTOs ============

export class ProductNoteDto {
  @ApiProperty({ description: 'ID của ghi chú' })
  id: string;

  @ApiProperty({ description: 'Tên ghi chú' })
  name: string;

  @ApiProperty({ description: 'Mô tả', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Thứ tự sắp xếp' })
  sortOrder: number;

  @ApiProperty({ description: 'Còn hoạt động không' })
  isActive: boolean;

  @ApiProperty({ description: 'Danh sách product ID được gán ghi chú này', type: [String] })
  productIds: string[];

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

// ============ Topping Group DTOs ============

export class ToppingItemDto {
  @ApiProperty({ description: 'ID của topping item' })
  id: string;

  @ApiProperty({ description: 'Mã topping (vd: TOP2962)', nullable: true })
  code: string | null;

  @ApiProperty({ description: 'Tên topping (vd: Size S)' })
  name: string;

  @ApiProperty({ description: 'Giá thêm khi chọn topping này' })
  price: number;

  @ApiProperty({ description: 'Có phải mặc định không' })
  isDefault: boolean;

  @ApiProperty({ description: 'Số lượng tối đa có thể thêm' })
  maxQuantity: number;

  @ApiProperty({ description: 'Thứ tự sắp xếp' })
  sortOrder: number;

  @ApiProperty({ description: 'Còn hoạt động không' })
  isActive: boolean;
}

export class ToppingGroupDto {
  @ApiProperty({ description: 'ID của nhóm topping' })
  id: string;

  @ApiProperty({ description: 'Tên nhóm (vd: SIZE, ĐƯỜNG, ĐÁ, TOPPING)' })
  name: string;

  @ApiProperty({ description: 'Loại nhóm (size, sugar, ice, topping, other)' })
  groupType: string;

  @ApiProperty({ description: 'Bắt buộc phải chọn?' })
  isRequired: boolean;

  @ApiProperty({ description: 'Cho phép chọn nhiều?' })
  isMultiple: boolean;

  @ApiProperty({ description: 'Số tối thiểu cần chọn' })
  minSelect: number;

  @ApiProperty({ description: 'Số tối đa được chọn' })
  maxSelect: number;

  @ApiProperty({ description: 'Thứ tự sắp xếp' })
  sortOrder: number;

  @ApiProperty({ description: 'Còn hoạt động không' })
  isActive: boolean;

  @ApiProperty({ type: [ToppingItemDto], description: 'Danh sách topping trong nhóm' })
  toppings: ToppingItemDto[];

  @ApiProperty({ type: [String], description: 'Danh sách product ID được gán nhóm này', nullable: true })
  productIds: string[] | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class StaffBranchPermissionsSyncDto {
  @ApiProperty({ type: [BrandWithBranchesDto] })
  data: BrandWithBranchesDto[];

  @ApiProperty({ description: 'Chi nhánh mặc định của nhân viên' })
  defaultBranchId: string;

  @ApiProperty()
  syncedAt: string;
}

export class ComboItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'ID của sản phẩm combo (sản phẩm cha)' })
  comboId: string;

  @ApiProperty({ description: 'ID của sản phẩm con trong combo' })
  productId: string;

  @ApiProperty({ description: 'Tên sản phẩm con' })
  productName: string;

  @ApiProperty({ nullable: true, description: 'Mã sản phẩm con' })
  productCode: string | null;

  @ApiProperty({ description: 'Số lượng sản phẩm con trong combo' })
  quantity: number;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isActive: boolean;
}

// ============ Kitchen DTOs ============

export class KitchenDto {
  @ApiProperty({ description: 'ID của bếp' })
  id: string;

  @ApiProperty({ description: 'Tên bếp' })
  name: string;

  @ApiProperty({ description: 'Mô tả', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Loại bếp (cooking, grill, bar, dessert, other)', nullable: true })
  kitchenType: string | null;

  @ApiProperty({ description: 'Thứ tự sắp xếp' })
  sortOrder: number;

  @ApiProperty({ description: 'Còn hoạt động không' })
  isActive: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class FullSyncDataDto {
  @ApiProperty({ type: [CategoryDto] })
  categories: CategoryDto[];

  @ApiProperty({ type: [ProductDto] })
  products: ProductDto[];

  @ApiProperty({ type: [AreaDto] })
  areas: AreaDto[];

  @ApiProperty({ type: [TableDto] })
  tables: TableDto[];

  @ApiProperty({ type: [StaffDto] })
  staff: StaffDto[];

  @ApiProperty({ type: [KitchenDto], description: 'Danh sách bếp' })
  kitchens: KitchenDto[];

  @ApiProperty({ type: [SeasonalPriceDto] })
  seasonalPrices: SeasonalPriceDto[];

  @ApiProperty({ type: [CouponDto] })
  coupons: CouponDto[];

  @ApiProperty({ type: [ToppingGroupDto], description: 'Danh sách nhóm topping với các product được gán' })
  toppingGroups: ToppingGroupDto[];

  @ApiProperty({ type: [ProductNoteDto], description: 'Danh sách ghi chú món ăn' })
  productNotes: ProductNoteDto[];

  @ApiProperty({ type: [ComboItemDto], description: 'Danh sách các món trong combo' })
  comboItems: ComboItemDto[];
}

export class FullSyncResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ type: FullSyncDataDto, nullable: true })
  data: FullSyncDataDto | null;

  @ApiProperty()
  syncTime: string;

  @ApiProperty({ nullable: true })
  message: string | null;
}

export class IncrementalSyncResponseDto {
  @ApiProperty({ type: [CategoryDto] })
  categories: CategoryDto[];

  @ApiProperty({ type: [ProductDto] })
  products: ProductDto[];

  @ApiProperty({ type: [AreaDto] })
  areas: AreaDto[];

  @ApiProperty({ type: [TableDto] })
  tables: TableDto[];

  @ApiProperty({ type: [StaffDto] })
  staff: StaffDto[];

  @ApiProperty({ type: [SeasonalPriceDto] })
  seasonalPrices: SeasonalPriceDto[];

  @ApiProperty({ type: [CouponDto] })
  coupons: CouponDto[];

  @ApiProperty({ description: 'IDs của các bản ghi đã bị xóa' })
  deletedIds: {
    categories: string[];
    products: string[];
    areas: string[];
    tables: string[];
    staff: string[];
    seasonalPrices: string[];
    coupons: string[];
  };

  @ApiProperty()
  syncedAt: string;
}
