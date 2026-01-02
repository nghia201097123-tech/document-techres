import { IsNotEmpty, IsOptional, IsString, IsNumber, IsEnum, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ProductType {
  FOOD = 'food',
  DRINK = 'drink',
  OTHER = 'other',
  TOPPING = 'topping',
  COMBO = 'combo',
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
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vatRate?: number;

  @ApiProperty({ enum: ProductType, example: ProductType.FOOD })
  @IsNotEmpty()
  @IsEnum(ProductType, { message: 'Loại sản phẩm không hợp lệ' })
  type: ProductType;

  @ApiPropertyOptional({ description: 'ID danh mục' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
