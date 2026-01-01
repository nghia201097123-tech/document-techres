import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsEmail,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessModel } from '../../../database/entities';

export class CreateBranchDto {
  @ApiProperty({ description: 'ID của thương hiệu' })
  @IsNotEmpty()
  @IsUUID()
  brandId: string;

  @ApiProperty({ example: 'Chi nhánh Quận 1' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'CHABC-Q1' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({ example: 'https://example.com/branch-logo.png' })
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
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
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

  @ApiPropertyOptional({ example: 3, default: 3, description: 'Số cổng kết nối tối đa' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxConnections?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  packageId?: string;
}
