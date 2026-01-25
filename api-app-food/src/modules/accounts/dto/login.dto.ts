import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { FoodPlatformType, AuthType } from '../../../database/entities';

/**
 * Create Account DTO
 */
export class CreateAccountDto {
  @ApiProperty({ example: 'tenant-001' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ enum: FoodPlatformType, example: FoodPlatformType.GRAB })
  @IsEnum(FoodPlatformType)
  platform: FoodPlatformType;

  @ApiProperty({ enum: AuthType, example: AuthType.USERNAME_PASSWORD })
  @IsEnum(AuthType)
  authType: AuthType;

  @ApiPropertyOptional({ example: 'GrabFood Chi nhánh Q1' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  displayName?: string;
}

/**
 * Login with Username/Password DTO
 */
export class LoginDto {
  @ApiProperty({ example: 'merchant@techres.vn' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  username: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(255)
  password: string;

  @ApiPropertyOptional({ example: 'branch-001', description: 'Branch ID to assign account to' })
  @IsString()
  @IsOptional()
  branchId?: string;
}

/**
 * Request OTP DTO
 */
export class RequestOtpDto {
  @ApiProperty({ example: '0901234567' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(15)
  phoneNumber: string;
}

/**
 * Verify OTP DTO
 */
export class VerifyOtpDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(8)
  otp: string;
}

/**
 * Select Store DTO (for OTP flow)
 */
export class SelectStoreDto {
  @ApiProperty({ example: 'SF-123456' })
  @IsString()
  @IsNotEmpty()
  merchantId: string;

  @ApiProperty({ example: 'Cà phê TechRes Q1' })
  @IsString()
  @IsNotEmpty()
  storeName: string;

  @ApiPropertyOptional({ example: 'branch-001', description: 'Branch ID to assign account to' })
  @IsString()
  @IsOptional()
  branchId?: string;
}

/**
 * Update Account Settings DTO
 */
export class UpdateAccountSettingsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  autoConfirmEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  autoPrintEnabled?: boolean;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  pollIntervalSeconds?: number;
}
