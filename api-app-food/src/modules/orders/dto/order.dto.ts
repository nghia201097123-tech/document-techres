import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { FoodOrderStatus, FoodPlatformType } from '../../../database/entities';

/**
 * Poll Orders Query DTO
 */
export class PollOrdersQueryDto {
  @ApiProperty({ example: '168ae283-3efb-46cc-8657-3df86def1aed' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiPropertyOptional({ example: 1706003400000 })
  @IsOptional()
  @IsInt()
  lastPollAt?: number;
}

/**
 * Get Orders Query DTO
 */
export class GetOrdersQueryDto {
  @ApiPropertyOptional({ example: '168ae283-3efb-46cc-8657-3df86def1aed' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ example: 'tenant-001' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ enum: FoodPlatformType })
  @IsOptional()
  @IsEnum(FoodPlatformType)
  platform?: FoodPlatformType;

  @ApiPropertyOptional({ enum: FoodOrderStatus })
  @IsOptional()
  @IsEnum(FoodOrderStatus)
  status?: FoodOrderStatus;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

/**
 * Cancel Order DTO
 */
export class CancelOrderDto {
  @ApiProperty({ example: 'Hết nguyên liệu' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

/**
 * Poll Response DTO
 */
export class PollResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ type: [Object] })
  newOrders: any[];

  @ApiProperty({ type: [Object] })
  updatedOrders: any[];

  @ApiProperty()
  meta: {
    pollTimestamp: number;
    accountsPolled: number;
    totalOrdersFetched: number;
    processingTimeMs: number;
  };

  @ApiPropertyOptional()
  errors?: {
    accountId: string;
    platform: string;
    message: string;
  }[];
}
