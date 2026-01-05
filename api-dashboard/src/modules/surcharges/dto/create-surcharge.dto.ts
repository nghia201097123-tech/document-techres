import { IsNotEmpty, IsOptional, IsString, MaxLength, IsInt, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSurchargeDto {
  @ApiProperty({ example: 'Khách mang đồ ăn vào' })
  @IsNotEmpty({ message: 'Tên phụ thu không được để trống' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Phí phụ thu khi khách hàng mang đồ ăn từ bên ngoài vào' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 200000 })
  @IsNotEmpty({ message: 'Số tiền phụ thu không được để trống' })
  @IsNumber({}, { message: 'Số tiền phải là số' })
  @Min(0, { message: 'Số tiền không được âm' })
  amount: number;

  @ApiPropertyOptional({ example: 10, description: 'Thuế VAT (%)' })
  @IsOptional()
  @IsNumber({}, { message: 'VAT phải là số' })
  @Min(0, { message: 'VAT không được âm' })
  @Max(100, { message: 'VAT không được vượt quá 100%' })
  vatRate?: number;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
