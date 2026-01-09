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

  @ApiProperty()
  displayOrder: number;

  @ApiProperty()
  imageUrl: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  version: number;

  @ApiProperty()
  updatedAt: string;
}

export class ProductDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  categoryId: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  imageUrl: string;

  @ApiProperty()
  unit: string;

  @ApiProperty()
  vatRate: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  displayOrder: number;

  @ApiProperty()
  version: number;

  @ApiProperty()
  updatedAt: string;
}

export class AreaDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  displayOrder: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  version: number;

  @ApiProperty()
  updatedAt: string;
}

export class TableDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  areaId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  capacity: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  displayOrder: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  version: number;

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

  @ApiProperty()
  phone: string;

  @ApiProperty()
  pinCode: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  avatarUrl: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  version: number;

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

export class FullSyncResponseDto {
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

  @ApiProperty()
  syncedAt: string;
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
