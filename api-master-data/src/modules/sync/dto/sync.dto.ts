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

export class StaffBranchPermissionsSyncDto {
  @ApiProperty({ type: [BrandWithBranchesDto] })
  data: BrandWithBranchesDto[];

  @ApiProperty({ description: 'Chi nhánh mặc định của nhân viên' })
  defaultBranchId: string;

  @ApiProperty()
  syncedAt: string;
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

  @ApiProperty({ description: 'IDs của các bản ghi đã bị xóa' })
  deletedIds: {
    categories: string[];
    products: string[];
    areas: string[];
    tables: string[];
    staff: string[];
  };

  @ApiProperty()
  syncedAt: string;
}
