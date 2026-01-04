import { IsNotEmpty, IsOptional, IsString, IsNumber, IsEnum, MaxLength, Min, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export enum ProductType {
  FOOD = 'food',
  DRINK = 'drink',
  OTHER = 'other',
  TOPPING = 'topping',
  COMBO = 'combo',
}

export enum SellingType {
  PORTION = 'portion',
  WEIGHT = 'weight',
}

export class CreateProductDto {
  @ApiProperty({ example: 'Phở bò tái' })
  @IsNotEmpty({ message: 'Tên món không được để trống' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Phở bò tái thơm ngon' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 55000 })
  @IsNotEmpty({ message: 'Giá không được để trống' })
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Giá phải >= 0' })
  price: number;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'VAT phải >= 0' })
  vatRate?: number;

  @ApiProperty({ enum: ProductType, example: ProductType.FOOD })
  @IsNotEmpty()
  @IsEnum(ProductType, { message: 'Loại sản phẩm không hợp lệ' })
  type: ProductType;

  @ApiProperty({ description: 'ID danh mục' })
  @IsNotEmpty({ message: 'Danh mục không được để trống' })
  @IsString()
  categoryId: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 15, description: 'Thời gian chế biến (phút)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Thời gian chế biến phải >= 0' })
  preparationTime?: number;

  @ApiPropertyOptional({ example: 30000, description: 'Giá vốn (cho phép = 0)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Giá vốn phải >= 0' })
  costPrice?: number;

  @ApiPropertyOptional({ enum: SellingType, default: SellingType.PORTION, description: 'Loại bán (theo phần/theo ký)' })
  @IsOptional()
  @IsEnum(SellingType)
  sellingType?: SellingType;

  @ApiPropertyOptional({ example: 'phần', description: 'Đơn vị tính' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ default: true, description: 'Cho phép in món' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  printDish?: boolean;

  @ApiPropertyOptional({ default: false, description: 'Cho phép in tem' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  printLabel?: boolean;

  @ApiPropertyOptional({ default: false, description: 'Cho phép in hồ hải sản' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  printSeafood?: boolean;

  @ApiPropertyOptional({ description: 'Danh sách ID ghi chú được gán' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  noteIds?: string[];
}
