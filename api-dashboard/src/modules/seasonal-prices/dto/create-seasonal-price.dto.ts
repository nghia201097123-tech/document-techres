import { IsNotEmpty, IsOptional, IsString, MaxLength, IsInt, IsNumber, Min, IsEnum, IsDateString, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdjustmentType } from '../../../database/entities/seasonal-price.entity';

export class CreateSeasonalPriceDto {
  @ApiProperty({ example: 'Giá mùa hè' })
  @IsNotEmpty({ message: 'Tên giá thời vụ không được để trống' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Giá ưu đãi trong mùa hè' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: AdjustmentType, example: AdjustmentType.PERCENTAGE })
  @IsEnum(AdjustmentType, { message: 'Loại điều chỉnh không hợp lệ' })
  adjustmentType: AdjustmentType;

  @ApiProperty({ example: 10, description: 'Giá trị điều chỉnh (% hoặc số tiền)' })
  @IsNumber({}, { message: 'Giá trị điều chỉnh phải là số' })
  adjustmentValue: number;

  @ApiProperty({ example: '2025-06-01' })
  @IsNotEmpty({ message: 'Ngày bắt đầu không được để trống' })
  @IsDateString({}, { message: 'Ngày bắt đầu không hợp lệ' })
  startDate: string;

  @ApiProperty({ example: '2025-08-31' })
  @IsNotEmpty({ message: 'Ngày kết thúc không được để trống' })
  @IsDateString({}, { message: 'Ngày kết thúc không hợp lệ' })
  endDate: string;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({ example: ['uuid-1', 'uuid-2'], description: 'Danh sách ID sản phẩm áp dụng giá thời vụ' })
  @IsArray({ message: 'Danh sách sản phẩm phải là mảng' })
  @IsUUID('4', { each: true, message: 'ID sản phẩm không hợp lệ' })
  productIds: string[];
}
