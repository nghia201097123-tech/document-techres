import { IsNotEmpty, IsOptional, IsString, IsEnum, IsNumber, IsBoolean, IsDateString, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CouponType } from '../../../database/entities';

export class CreateCouponDto {
  @ApiProperty({ example: 'GIAM10', description: 'Mã coupon' })
  @IsNotEmpty({ message: 'Mã coupon không được để trống' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Giảm 10% cho nhân viên' })
  @IsNotEmpty({ message: 'Tên coupon không được để trống' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Áp dụng cho hóa đơn từ 200k' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: CouponType, default: CouponType.PERCENTAGE })
  @IsEnum(CouponType, { message: 'Loại coupon không hợp lệ' })
  couponType: CouponType;

  @ApiProperty({ example: 10, description: 'Giá trị giảm (% hoặc số tiền)' })
  @IsNumber({}, { message: 'Giá trị giảm phải là số' })
  @Min(0, { message: 'Giá trị giảm phải >= 0' })
  discountValue: number;

  @ApiPropertyOptional({ example: 100000, description: 'Giảm tối đa (chỉ áp dụng cho loại %)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @ApiPropertyOptional({ example: 200000, description: 'Giá trị đơn tối thiểu' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 100, description: 'Giới hạn lượt sử dụng tổng' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ example: 10, description: 'Giới hạn lượt sử dụng mỗi ngày' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  dailyLimit?: number;

  @ApiPropertyOptional({ example: false, description: 'Yêu cầu phê duyệt từ quản lý' })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ example: 500000, description: 'Ngưỡng giảm giá cần phê duyệt' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  approvalThreshold?: number;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}
