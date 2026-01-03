import { IsOptional, IsString, IsEnum, MaxLength, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '../../../database/entities/transaction-category.entity';

export class UpdateTransactionCategoryDto {
  @ApiPropertyOptional({ example: 'Doanh thu bán hàng' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ enum: TransactionType, example: 'income' })
  @IsOptional()
  @IsEnum(TransactionType, { message: 'Loại danh mục không hợp lệ' })
  type?: TransactionType;

  @ApiPropertyOptional({ example: 'Doanh thu từ bán hàng trực tiếp' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
