import { IsString, IsArray, IsUUID, IsBoolean, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SellingType } from '../../../database/entities';

export class BulkUpdateCategoryDto {
  @ApiProperty({ description: 'Danh sách ID món ăn' })
  @IsArray()
  @IsUUID('4', { each: true })
  productIds: string[];

  @ApiProperty({ description: 'ID danh mục mới' })
  @IsUUID('4')
  categoryId: string;
}

export class BulkToggleActiveDto {
  @ApiProperty({ description: 'Danh sách ID món ăn' })
  @IsArray()
  @IsUUID('4', { each: true })
  productIds: string[];

  @ApiProperty({ description: 'Trạng thái mới' })
  @IsBoolean()
  isActive: boolean;
}

export class BulkDeleteProductsDto {
  @ApiProperty({ description: 'Danh sách ID món ăn' })
  @IsArray()
  @IsUUID('4', { each: true })
  productIds: string[];
}

export class BulkUpdateVatRateDto {
  @ApiProperty({ description: 'Danh sách ID món ăn' })
  @IsArray()
  @IsUUID('4', { each: true })
  productIds: string[];

  @ApiProperty({ description: 'Tỷ lệ VAT mới (%)' })
  @IsNumber()
  @Min(0)
  vatRate: number;
}

export class BulkUpdatePriceDto {
  @ApiProperty({ description: 'Danh sách ID món ăn' })
  @IsArray()
  @IsUUID('4', { each: true })
  productIds: string[];

  @ApiProperty({ description: 'Giá mới' })
  @IsNumber()
  @Min(0)
  price: number;
}

export class BulkUpdatePrintLabelDto {
  @ApiProperty({ description: 'Danh sách ID món ăn' })
  @IsArray()
  @IsUUID('4', { each: true })
  productIds: string[];

  @ApiProperty({ description: 'In tem' })
  @IsBoolean()
  printLabel: boolean;
}

export class BulkUpdatePrintSeafoodDto {
  @ApiProperty({ description: 'Danh sách ID món ăn' })
  @IsArray()
  @IsUUID('4', { each: true })
  productIds: string[];

  @ApiProperty({ description: 'In hồ hải sản' })
  @IsBoolean()
  printSeafood: boolean;
}

export class BulkUpdatePrintDishDto {
  @ApiProperty({ description: 'Danh sách ID món ăn' })
  @IsArray()
  @IsUUID('4', { each: true })
  productIds: string[];

  @ApiProperty({ description: 'In món' })
  @IsBoolean()
  printDish: boolean;
}

export class BulkUpdateUnitDto {
  @ApiProperty({ description: 'Danh sách ID món ăn' })
  @IsArray()
  @IsUUID('4', { each: true })
  productIds: string[];

  @ApiProperty({ description: 'Đơn vị mới' })
  @IsString()
  unit: string;
}

export class BulkUpdateSellingTypeDto {
  @ApiProperty({ description: 'Danh sách ID món ăn' })
  @IsArray()
  @IsUUID('4', { each: true })
  productIds: string[];

  @ApiProperty({ description: 'Loại bán', enum: SellingType })
  @IsEnum(SellingType)
  sellingType: SellingType;
}

export class BulkUpdatePreparationTimeDto {
  @ApiProperty({ description: 'Danh sách ID món ăn' })
  @IsArray()
  @IsUUID('4', { each: true })
  productIds: string[];

  @ApiProperty({ description: 'Thời gian chế biến (phút)' })
  @IsNumber()
  @Min(0)
  preparationTime: number;
}
