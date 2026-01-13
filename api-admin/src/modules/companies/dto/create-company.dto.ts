import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEmail,
  MaxLength,
  IsEnum,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPlan } from '../../../database/entities';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Công ty TNHH ABC' })
  @IsNotEmpty({ message: 'Tên công ty không được để trống' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'abcfood', description: 'Mã công ty, dùng làm tenant_id' })
  @IsNotEmpty({ message: 'Mã công ty không được để trống' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({ example: '0123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxCode?: string;

  @ApiPropertyOptional({ example: '123 Nguyễn Văn Linh, Q7, TP.HCM' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '028 1234 5678' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: 'contact@abc.vn' })
  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: 'Nguyễn Văn A' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  representative?: string;

  @ApiPropertyOptional({ enum: SubscriptionPlan, default: SubscriptionPlan.BASIC })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  subscriptionPlan?: SubscriptionPlan;

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  subscriptionExpiresAt?: string;

  @ApiPropertyOptional({ example: 5, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxBranches?: number;

  @ApiPropertyOptional({ example: 20, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number;
}
