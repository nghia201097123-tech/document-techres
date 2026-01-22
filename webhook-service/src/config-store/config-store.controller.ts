import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ConfigStoreService, RegisterConfigDto } from './config-store.service';

class RegisterConfigRequestDto {
  @ApiProperty({ description: 'PayOS order code', example: 1234567890 })
  @IsNumber()
  orderCode: number;

  @ApiProperty({ description: 'PayOS checksum key for signature verification' })
  @IsString()
  checksumKey: string;

  @ApiProperty({ description: 'Branch ID', example: 'uuid-branch-id' })
  @IsString()
  branchId: string;

  @ApiProperty({ description: 'Brand ID (optional)', required: false })
  @IsString()
  @IsOptional()
  brandId?: string;

  @ApiProperty({ description: 'TTL in minutes (default: 60)', required: false, default: 60 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  ttlMinutes?: number;
}

@ApiTags('Config Store')
@Controller('config')
export class ConfigStoreController {
  private readonly logger = new Logger(ConfigStoreController.name);

  constructor(private readonly configStoreService: ConfigStoreService) {}

  /**
   * Register PayOS config for multi-tenant webhook verification
   * Called by api-dashboard when creating a payment
   */
  @Post('payos/register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register PayOS config for orderCode' })
  @ApiResponse({ status: 200, description: 'Config registered successfully' })
  registerPayOSConfig(
    @Body() dto: RegisterConfigRequestDto,
  ): { success: boolean; message: string } {
    this.logger.log(
      `Registering PayOS config: orderCode=${dto.orderCode}, branchId=${dto.branchId}`,
    );

    return this.configStoreService.registerConfig({
      orderCode: dto.orderCode,
      checksumKey: dto.checksumKey,
      branchId: dto.branchId,
      brandId: dto.brandId,
      ttlMinutes: dto.ttlMinutes,
    });
  }

  /**
   * Get config store stats for monitoring
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get config store statistics' })
  @ApiResponse({ status: 200, description: 'Returns config store stats' })
  getStats(): { totalConfigs: number; oldestConfigAge?: number } {
    return this.configStoreService.getStats();
  }

  /**
   * Remove config after payment is processed (optional cleanup)
   */
  @Delete('payos/:orderCode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove PayOS config for orderCode' })
  @ApiResponse({ status: 200, description: 'Config removed successfully' })
  removeConfig(
    @Param('orderCode') orderCode: string,
  ): { success: boolean; removed: boolean } {
    const removed = this.configStoreService.removeConfig(parseInt(orderCode, 10));
    return { success: true, removed };
  }
}
