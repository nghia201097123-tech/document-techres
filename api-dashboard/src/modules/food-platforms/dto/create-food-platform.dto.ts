import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import {
  FoodPlatformType,
  FoodPlatformAuthType,
} from '../../../database/entities';

export class CreateFoodPlatformDto {
  @ApiProperty({ description: 'ID chi nhánh' })
  @IsString()
  branchId: string;

  @ApiProperty({ description: 'Tên hiển thị', example: 'Grab Food - Chi nhánh Q1' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Loại nền tảng',
    enum: FoodPlatformType,
    example: FoodPlatformType.GRAB,
  })
  @IsEnum(FoodPlatformType)
  platform: FoodPlatformType;

  @ApiPropertyOptional({
    description: 'Loại xác thực',
    enum: FoodPlatformAuthType,
  })
  @IsOptional()
  @IsEnum(FoodPlatformAuthType)
  authType?: FoodPlatformAuthType;

  @ApiPropertyOptional({ description: 'Thứ tự hiển thị' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Kích hoạt', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFoodPlatformDto {
  @ApiPropertyOptional({ description: 'Tên hiển thị' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Thứ tự hiển thị' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Kích hoạt' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Khoảng thời gian poll (giây)' })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(300)
  pollIntervalSeconds?: number;
}

/**
 * DTO cho đăng nhập bằng username/password (Grab, BeFood)
 */
export class LoginUsernamePasswordDto {
  @ApiProperty({ description: 'Username hoặc email' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'Password' })
  @IsString()
  password: string;
}

/**
 * DTO cho yêu cầu OTP (ShopeeFood)
 */
export class RequestOtpDto {
  @ApiProperty({ description: 'Số điện thoại', example: '0901234567' })
  @IsString()
  phoneNumber: string;
}

/**
 * DTO cho xác thực OTP (ShopeeFood)
 */
export class VerifyOtpDto {
  @ApiProperty({ description: 'Mã OTP', example: '123456' })
  @IsString()
  otp: string;
}

/**
 * DTO cho chọn cửa hàng sau khi xác thực OTP (ShopeeFood)
 */
export class SelectStoreDto {
  @ApiProperty({ description: 'ID cửa hàng trên ShopeeFood' })
  @IsString()
  storeId: string;

  @ApiProperty({ description: 'Tên cửa hàng' })
  @IsString()
  storeName: string;
}
