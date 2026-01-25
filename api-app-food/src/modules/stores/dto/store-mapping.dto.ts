import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Single Store Mapping Item
 */
export class StoreMappingItemDto {
  @ApiProperty({ example: 'GR-001' })
  @IsString()
  @IsNotEmpty()
  externalStoreId: string;

  @ApiPropertyOptional({ example: '104746', description: 'Merchant ID on platform (for BeFood)' })
  @IsString()
  @IsOptional()
  externalMerchantId?: string;

  @ApiProperty({ example: 'Cà phê TechRes Quận 1' })
  @IsString()
  @IsNotEmpty()
  externalStoreName: string;

  @ApiPropertyOptional({ example: '123 Nguyễn Huệ, Q1, HCM' })
  @IsString()
  @IsOptional()
  externalStoreAddress?: string;

  @ApiPropertyOptional({ example: '028-1234-5678' })
  @IsString()
  @IsOptional()
  externalStorePhone?: string;

  @ApiPropertyOptional({ example: 'store@example.com' })
  @IsString()
  @IsOptional()
  externalStoreEmail?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  branchId: number;

  @ApiPropertyOptional({ example: 'Chi nhánh Quận 1' })
  @IsString()
  @IsOptional()
  branchName?: string;
}

/**
 * Create Store Mappings DTO
 */
export class CreateStoreMappingsDto {
  @ApiProperty({ type: [StoreMappingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoreMappingItemDto)
  mappings: StoreMappingItemDto[];
}

/**
 * Update Store Mapping DTO
 */
export class UpdateStoreMappingDto {
  @ApiPropertyOptional({ example: 2 })
  @IsInt()
  @IsOptional()
  branchId?: number;

  @ApiPropertyOptional({ example: 'Chi nhánh Quận 2' })
  @IsString()
  @IsOptional()
  branchName?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

/**
 * Toggle Store Mapping DTO
 */
export class ToggleStoreMappingDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}
