import { IsNotEmpty, IsString, IsEnum, IsOptional, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '../../../database/entities';

export class CreateTransactionCategoryDto {
  @ApiProperty({ example: 'Doanh thu bán hàng', description: 'Tên danh mục' })
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'DT_BH', description: 'Mã danh mục (chữ in hoa, số, gạch dưới)' })
  @IsNotEmpty({ message: 'Mã danh mục không được để trống' })
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_]+$/, { message: 'Mã danh mục chỉ được chứa chữ in hoa, số và gạch dưới' })
  code: string;

  @ApiProperty({ enum: TransactionType, example: 'income', description: 'Loại giao dịch: thu (income) hoặc chi (expense)' })
  @IsNotEmpty({ message: 'Loại giao dịch không được để trống' })
  @IsEnum(TransactionType, { message: 'Loại giao dịch phải là income hoặc expense' })
  type: TransactionType;

  @ApiPropertyOptional({ example: 'Doanh thu từ hoạt động bán hàng', description: 'Mô tả danh mục' })
  @IsOptional()
  @IsString()
  description?: string;
}
