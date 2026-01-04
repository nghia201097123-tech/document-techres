import { IsNotEmpty, IsOptional, IsString, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '../../../database/entities/transaction-category.entity';

export class CreateTransactionCategoryDto {
  @ApiProperty({ example: 'Doanh thu bán hàng' })
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'DT_BH' })
  @IsNotEmpty({ message: 'Mã danh mục không được để trống' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ enum: TransactionType, example: 'income' })
  @IsNotEmpty({ message: 'Loại danh mục không được để trống' })
  @IsEnum(TransactionType, { message: 'Loại danh mục không hợp lệ' })
  type: TransactionType;

  @ApiPropertyOptional({ example: 'Doanh thu từ bán hàng trực tiếp' })
  @IsOptional()
  @IsString()
  description?: string;
}
