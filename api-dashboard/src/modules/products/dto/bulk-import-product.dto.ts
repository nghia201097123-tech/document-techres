import { IsNotEmpty, IsOptional, IsString, IsNumber, IsEnum, IsArray, ValidateNested, Min, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { ProductType, SellingType } from './create-product.dto';

export class BulkProductItemDto {
  @ApiPropertyOptional({ description: 'ID sản phẩm (để cập nhật sản phẩm hiện có)' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ description: 'Mã sản phẩm (để tra cứu)' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ example: 'Phở bò tái' })
  @IsNotEmpty({ message: 'Tên món không được để trống' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ProductType, example: ProductType.FOOD })
  @IsNotEmpty()
  @IsEnum(ProductType, { message: 'Loại sản phẩm không hợp lệ' })
  type: ProductType;

  @ApiPropertyOptional({ description: 'ID danh mục' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Tên danh mục (để tra cứu nếu không có ID)' })
  @IsOptional()
  @IsString()
  categoryName?: string;

  @ApiProperty({ example: 55000 })
  @IsNotEmpty({ message: 'Giá không được để trống' })
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Giá phải >= 0' })
  price: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  vatRate?: number;

  @ApiPropertyOptional({ example: 'phần' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: 'Mô tả món' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  preparationTime?: number;

  @ApiPropertyOptional({ example: 30000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ enum: SellingType })
  @IsOptional()
  @IsEnum(SellingType)
  sellingType?: SellingType;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === 'Có')
  @IsBoolean()
  printDish?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === 'Có')
  @IsBoolean()
  printLabel?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === 'Có')
  @IsBoolean()
  printSeafood?: boolean;
}

export class BulkImportProductDto {
  @ApiProperty({ type: [BulkProductItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkProductItemDto)
  items: BulkProductItemDto[];

  @ApiProperty({ description: 'ID thương hiệu' })
  @IsNotEmpty({ message: 'Brand ID là bắt buộc' })
  @IsString()
  brandId: string;
}
