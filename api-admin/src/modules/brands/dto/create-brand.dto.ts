import { IsNotEmpty, IsOptional, IsString, IsEnum, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessModel } from '../../../database/entities';

export class CreateBrandDto {
  @ApiProperty({ description: 'ID của công ty' })
  @IsNotEmpty()
  @IsUUID()
  companyId: string;

  @ApiProperty({ example: 'Coffee House ABC' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'CHABC' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ enum: BusinessModel, default: BusinessModel.FULL_SYSTEM })
  @IsOptional()
  @IsEnum(BusinessModel)
  businessModel?: BusinessModel;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ example: '01', description: 'Mã tỉnh/thành phố (sau sáp nhập 2025)' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  provinceCode?: string;

  @ApiPropertyOptional({ example: '00001', description: 'Mã phường/xã (liên kết trực tiếp với tỉnh)' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  wardCode?: string;

  @ApiPropertyOptional({ example: '123 Nguyễn Văn Linh, Q7, TP.HCM' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
