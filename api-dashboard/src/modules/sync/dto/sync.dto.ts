import { IsString, IsOptional, IsBoolean, IsUUID, IsNotEmpty, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SyncCompanyDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SyncBrandDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty()
  @IsUUID()
  companyId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessModel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SyncBranchDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty()
  @IsUUID()
  brandId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressDetail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provinceCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wardCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  manager?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  openTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  closeTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessModel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SyncDepartmentDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty()
  @IsUUID()
  branchId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SyncStaffDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty()
  @IsUUID()
  branchId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SyncTransactionCategoryDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  type: string; // 'income' | 'expense'

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SyncCompanyDataDto {
  @ApiProperty({ type: SyncCompanyDto })
  @ValidateNested()
  @Type(() => SyncCompanyDto)
  company: SyncCompanyDto;

  @ApiProperty({ type: SyncBrandDto })
  @ValidateNested()
  @Type(() => SyncBrandDto)
  brand: SyncBrandDto;

  @ApiProperty({ type: SyncBranchDto })
  @ValidateNested()
  @Type(() => SyncBranchDto)
  branch: SyncBranchDto;

  @ApiPropertyOptional({ type: SyncDepartmentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SyncDepartmentDto)
  department?: SyncDepartmentDto;

  @ApiPropertyOptional({ type: SyncStaffDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SyncStaffDto)
  staff?: SyncStaffDto;

  @ApiPropertyOptional({ type: [SyncBranchDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncBranchDto)
  additionalBranches?: SyncBranchDto[];
}

export class SyncFoodPlatformDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty()
  @IsUUID()
  branchId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  platform: string; // 'grab' | 'befood' | 'shopee_food'

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authType?: string; // 'username_password' | 'phone_otp'

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string; // 'pending' | 'connecting' | 'connected' | 'disconnected' | 'error'

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalMerchantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalStoreName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  pollIntervalSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  shopNumber?: number;

  @ApiPropertyOptional()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean; // Flag để xóa record
}

export class SyncFoodPlatformBatchDto {
  @ApiProperty({ type: [SyncFoodPlatformDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncFoodPlatformDto)
  foodPlatforms: SyncFoodPlatformDto[];
}
