import { IsNotEmpty, IsOptional, IsString, IsEnum, MaxLength, IsInt, Min, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductType } from '../../products/dto/create-product.dto';

export class CreateCategoryDto {
  @ApiPropertyOptional({ description: 'Brand ID - lấy từ token nếu không truyền' })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiProperty({ example: 'Phở' })
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Các loại phở' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ProductType, example: ProductType.FOOD })
  @IsNotEmpty()
  @IsEnum(ProductType, { message: 'Loại sản phẩm không hợp lệ' })
  productType: ProductType;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
