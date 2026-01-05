import { IsNotEmpty, IsOptional, IsString, MaxLength, IsInt, IsNumber, Min, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGiftItemDto {
  @ApiProperty({ example: 'Nước ngọt tặng kèm' })
  @IsNotEmpty({ message: 'Tên món tặng không được để trống' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Tặng nước ngọt khi hóa đơn trên 500k' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'uuid-of-product' })
  @IsOptional()
  @IsUUID('4', { message: 'ID sản phẩm không hợp lệ' })
  productId?: string;

  @ApiPropertyOptional({ example: 2, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Số lượng tối đa phải >= 1' })
  maxQuantity?: number;

  @ApiPropertyOptional({ example: 500000, description: 'Giá trị đơn hàng tối thiểu để được tặng' })
  @IsOptional()
  @IsNumber({}, { message: 'Giá trị đơn tối thiểu phải là số' })
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
