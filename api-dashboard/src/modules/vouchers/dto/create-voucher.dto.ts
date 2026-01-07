import { IsNotEmpty, IsOptional, IsString, MaxLength, IsInt, IsNumber, Min, Max, IsEnum, IsDateString, Matches, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VoucherType } from '../../../database/entities/voucher.entity';

export class CreateVoucherDto {
  @ApiPropertyOptional({ description: 'Brand ID - lấy từ token nếu không truyền' })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiProperty({ example: 'SALE20' })
  @IsNotEmpty({ message: 'Mã voucher không được để trống' })
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/, { message: 'Mã voucher chỉ được chứa chữ in hoa, số, dấu gạch ngang và gạch dưới' })
  code: string;

  @ApiProperty({ example: 'Giảm 20% đơn hàng' })
  @IsNotEmpty({ message: 'Tên voucher không được để trống' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Voucher giảm giá 20% cho đơn hàng từ 200k' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: VoucherType, example: VoucherType.PERCENTAGE })
  @IsEnum(VoucherType, { message: 'Loại voucher không hợp lệ' })
  voucherType: VoucherType;

  @ApiProperty({ example: 20, description: 'Giá trị giảm (% hoặc số tiền)' })
  @IsNumber({}, { message: 'Giá trị giảm phải là số' })
  @Min(0, { message: 'Giá trị giảm không được âm' })
  discountValue: number;

  @ApiPropertyOptional({ example: 100000, description: 'Giảm tối đa (chỉ áp dụng cho loại %)' })
  @IsOptional()
  @IsNumber({}, { message: 'Giảm tối đa phải là số' })
  @Min(0)
  maxDiscount?: number;

  @ApiPropertyOptional({ example: 200000, description: 'Giá trị đơn hàng tối thiểu' })
  @IsOptional()
  @IsNumber({}, { message: 'Giá trị đơn tối thiểu phải là số' })
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 100, description: 'Số lượt sử dụng tối đa' })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Số lượt sử dụng phải >= 1' })
  usageLimit?: number;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày bắt đầu không hợp lệ' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày kết thúc không hợp lệ' })
  endDate?: string;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
