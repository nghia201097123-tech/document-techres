import { IsNotEmpty, IsOptional, IsString, IsEmail, MaxLength, ValidateIf, IsEnum, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Gender } from '../../../database/entities/enums';

export class BulkStaffItemDto {
  @ApiPropertyOptional({ description: 'ID nhân viên (để cập nhật), bỏ trống để tạo mới' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsNotEmpty({ message: 'Tên nhân viên không được để trống' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: '1990-01-15', description: 'Ngày sinh (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày sinh không hợp lệ' })
  birthDate?: string;

  @ApiPropertyOptional({ enum: Gender, example: 'male', description: 'Giới tính: male/female' })
  @IsOptional()
  @IsEnum(Gender, { message: 'Giới tính không hợp lệ' })
  gender?: Gender;

  @ApiPropertyOptional({ example: '123 Nguyễn Văn Linh', description: 'Địa chỉ' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '79', description: 'Mã tỉnh/thành phố' })
  @IsOptional()
  @IsString()
  provinceCode?: string;

  @ApiPropertyOptional({ example: '001', description: 'Mã phường/xã' })
  @IsOptional()
  @IsString()
  wardCode?: string;

  @ApiPropertyOptional({ description: 'ID bộ phận' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'ID thương hiệu (chỉ khi tạo mới)' })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiPropertyOptional({ description: 'ID chi nhánh (chỉ khi tạo mới)' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'nva@company.vn' })
  @IsOptional()
  @ValidateIf((o) => o.email && o.email.length > 0)
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '001234567890', description: 'Căn cước công dân' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  idNumber?: string;
}

export class BulkImportStaffDto {
  @ApiProperty({ type: [BulkStaffItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkStaffItemDto)
  items: BulkStaffItemDto[];

  @ApiPropertyOptional({
    example: 'tr',
    description: 'Prefix cho username khi tạo mới (2 ký tự)'
  })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  usernamePrefix?: string;
}

export class BulkImportResultDto {
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}
