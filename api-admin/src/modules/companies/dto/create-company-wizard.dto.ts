import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEmail,
  MaxLength,
  IsEnum,
  IsInt,
  Min,
  IsDateString,
  ValidateNested,
  IsBoolean,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPlan, BusinessModel } from '../../../database/entities';

/**
 * Bước 1: Thông tin Công ty
 */
export class WizardCompanyDto {
  @ApiProperty({ example: 'Công ty TNHH ABC Food' })
  @IsNotEmpty({ message: 'Tên công ty không được để trống' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'abcfood', description: 'Mã công ty, dùng làm tenant_id để đăng nhập' })
  @IsNotEmpty({ message: 'Mã công ty không được để trống' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'CTAF', description: 'Tiên định danh - viết tắt tên công ty để đăng nhập' })
  @IsNotEmpty({ message: 'Tiên định danh không được để trống' })
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Z0-9]+$/, { message: 'Tiên định danh chỉ chứa chữ in hoa và số' })
  alias: string;

  @ApiProperty({ example: false, description: 'true = dùng thử 15 ngày, false = chính thức' })
  @IsBoolean()
  isTrial: boolean;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ example: '0123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxCode?: string;

  // Địa chỉ chi tiết (số nhà, đường)
  @ApiPropertyOptional({ example: '123 Nguyễn Văn Linh' })
  @IsOptional()
  @IsString()
  addressDetail?: string;

  // Mã tỉnh/thành phố (theo QĐ 19/2025/QĐ-TTg - 34 tỉnh sau sáp nhập 07/2025)
  @ApiPropertyOptional({ example: '79', description: 'Mã tỉnh/thành phố (34 tỉnh sau sáp nhập)' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  provinceCode?: string;

  // Mã phường/xã (liên kết trực tiếp với tỉnh, không qua quận/huyện)
  @ApiPropertyOptional({ example: '26734', description: 'Mã phường/xã' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  wardCode?: string;

  @ApiPropertyOptional({ example: '028 1234 5678' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({ example: 'contact@abc.vn' })
  @IsNotEmpty({ message: 'Email công ty không được để trống' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({ example: 'Nguyễn Văn A' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  representative?: string;

  @ApiPropertyOptional({ enum: SubscriptionPlan, default: SubscriptionPlan.BASIC })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  subscriptionPlan?: SubscriptionPlan;

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  subscriptionExpiresAt?: string;

  @ApiPropertyOptional({ example: 5, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxBranches?: number;

  @ApiPropertyOptional({ example: 20, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number;
}

/**
 * Bước 2: Thương hiệu đầu tiên (Bắt buộc)
 */
export class WizardBrandDto {
  @ApiProperty({ example: 'Phở 24' })
  @IsNotEmpty({ message: 'Tên thương hiệu không được để trống' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'PHO24', description: 'Mã thương hiệu' })
  @IsNotEmpty({ message: 'Mã thương hiệu không được để trống' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({ example: 'https://example.com/brand-logo.png' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'Chuỗi phở Việt Nam' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: BusinessModel, default: BusinessModel.FULL_SYSTEM })
  @IsOptional()
  @IsEnum(BusinessModel)
  businessModel?: BusinessModel;
}

/**
 * Bước 3: Chi nhánh đầu tiên (Bắt buộc)
 * Địa chỉ theo cấu trúc 2 cấp: Tỉnh → Xã/Phường (sau sáp nhập 07/2025)
 */
export class WizardBranchDto {
  @ApiProperty({ example: 'Phở 24 - Quận 1' })
  @IsNotEmpty({ message: 'Tên chi nhánh không được để trống' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'PHO24-Q1', description: 'Mã chi nhánh' })
  @IsNotEmpty({ message: 'Mã chi nhánh không được để trống' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({
    example: 'https://example.com/branch-logo.png',
    description: 'Logo chi nhánh (mặc định dùng logo thương hiệu)',
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ example: '123 Nguyễn Huệ', description: 'Địa chỉ chi tiết (số nhà, đường)' })
  @IsOptional()
  @IsString()
  addressDetail?: string;

  @ApiPropertyOptional({ example: '79', description: 'Mã tỉnh/thành phố' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  provinceCode?: string;

  @ApiPropertyOptional({ example: '26734', description: 'Mã phường/xã' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  wardCode?: string;

  @ApiPropertyOptional({ example: '028 1234 5678' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: 'Nguyễn Văn B' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  manager?: string;

  @ApiPropertyOptional({ enum: BusinessModel, default: BusinessModel.CCB_ONLY })
  @IsOptional()
  @IsEnum(BusinessModel)
  businessModel?: BusinessModel;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  openTime?: string;

  @ApiPropertyOptional({ example: '22:00' })
  @IsOptional()
  @IsString()
  closeTime?: string;

  @ApiPropertyOptional({ example: 3, default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxConnections?: number;
}

/**
 * Bước 4: Nhân viên đầu tiên (Bắt buộc - thường là chủ nhà hàng)
 */
export class WizardStaffDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsNotEmpty({ message: 'Tên nhân viên không được để trống' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'nva@abc.vn' })
  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: 'owner', description: 'Vai trò: owner, manager, staff' })
  @IsOptional()
  @IsString()
  role?: string;
}

/**
 * DTO cho Wizard tạo công ty 4 bước
 * (Company + Brand + Branch + Staff)
 * Bộ phận "Chủ nhà hàng" sẽ được tự động tạo ngầm
 * Bắt buộc phải hoàn thành cả 4 bước mới lưu được
 */
export class CreateCompanyWizardDto {
  @ApiProperty({ description: 'Bước 1: Thông tin công ty' })
  @ValidateNested()
  @Type(() => WizardCompanyDto)
  company: WizardCompanyDto;

  @ApiProperty({ description: 'Bước 2: Thương hiệu đầu tiên (bắt buộc)' })
  @ValidateNested()
  @Type(() => WizardBrandDto)
  brand: WizardBrandDto;

  @ApiProperty({ description: 'Bước 3: Chi nhánh đầu tiên (bắt buộc)' })
  @ValidateNested()
  @Type(() => WizardBranchDto)
  branch: WizardBranchDto;

  @ApiProperty({ description: 'Bước 4: Nhân viên đầu tiên (bắt buộc)' })
  @ValidateNested()
  @Type(() => WizardStaffDto)
  staff: WizardStaffDto;
}

/**
 * Response khi hoàn thành wizard
 */
export class CreateCompanyWizardResponseDto {
  company: {
    id: string;
    name: string;
    code: string;
  };
  brand: {
    id: string;
    name: string;
    code: string;
  };
  branch: {
    id: string;
    name: string;
    code: string;
  };
  department: {
    id: string;
    name: string;
    code: string;
  };
  staff: {
    id: string;
    name: string;
    username: string;
    temporaryPassword: string;
  };
}
