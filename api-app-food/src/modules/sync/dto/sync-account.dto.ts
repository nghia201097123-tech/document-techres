import { IsString, IsOptional, IsBoolean, IsUUID, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SyncAccountDto {
  @ApiProperty({ description: 'Account ID from api-admin' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Tenant ID (company code)' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ description: 'Branch ID' })
  @IsUUID()
  branchId: string;

  @ApiProperty({ description: 'Account name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Platform type: grab, befood, shopee_food' })
  @IsString()
  @IsNotEmpty()
  platform: string;

  @ApiPropertyOptional({ description: 'Auth type: username_password, phone_otp' })
  @IsOptional()
  @IsString()
  authType?: string;

  @ApiPropertyOptional({ description: 'Status: pending, connecting, connected, disconnected, error' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalMerchantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalStoreName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pollIntervalSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  shopNumber?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Flag to delete the account' })
  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;
}
