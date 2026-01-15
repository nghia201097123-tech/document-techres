import {
  Controller,
  Get,
  Query,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PosSyncService } from './pos-sync.service';
import { GetTenant } from '../auth/tenant.decorator';
import {
  PosFullSyncResponseDto,
  PosProductDto,
  PosKitchenDto,
  PosSyncResponseDto,
} from './dto/pos-sync.dto';

/**
 * POS Sync Controller
 *
 * Provides endpoints for CCB Android app to sync master data.
 * These endpoints match the expected API format in CCB app's MasterDataApi.kt
 */
@Controller('pos-sync')
@UseGuards(JwtAuthGuard)
export class PosSyncController {
  private readonly logger = new Logger(PosSyncController.name);

  constructor(private readonly posSyncService: PosSyncService) {}

  /**
   * GET /pos-sync/full
   *
   * Full sync endpoint - returns all master data for a branch
   * Called by CCB app on startup or manual sync button
   *
   * @param branchId Branch ID to sync data for
   * @returns Full sync data including products with kitchenIds
   */
  @Get('full')
  async getFullSyncData(
    @Query('branchId') branchId: string,
    @GetTenant() tenantId: string,
  ): Promise<PosFullSyncResponseDto> {
    if (!branchId) {
      throw new BadRequestException('branchId is required');
    }

    this.logger.log(`Full sync request for branch: ${branchId}, tenant: ${tenantId}`);
    return this.posSyncService.getFullSyncData(branchId, tenantId);
  }

  /**
   * GET /pos-sync/products
   *
   * Sync products only - for incremental updates
   *
   * @param branchId Branch ID
   * @param since Optional timestamp for incremental sync
   * @returns Products with kitchenIds
   */
  @Get('products')
  async getProducts(
    @Query('branchId') branchId: string,
    @Query('since') since: string,
    @GetTenant() tenantId: string,
  ): Promise<PosSyncResponseDto<PosProductDto>> {
    if (!branchId) {
      throw new BadRequestException('branchId is required');
    }

    this.logger.log(`Products sync request for branch: ${branchId}`);
    const products = await this.posSyncService.getProducts(branchId, tenantId);

    return {
      data: products,
      total: products.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /pos-sync/kitchens
   *
   * Sync kitchens only - for kitchen configuration updates
   *
   * @param branchId Branch ID
   * @returns Kitchens for the branch
   */
  @Get('kitchens')
  async getKitchens(
    @Query('branchId') branchId: string,
    @GetTenant() tenantId: string,
  ): Promise<PosSyncResponseDto<PosKitchenDto>> {
    if (!branchId) {
      throw new BadRequestException('branchId is required');
    }

    this.logger.log(`Kitchens sync request for branch: ${branchId}`);
    const kitchens = await this.posSyncService.getKitchens(branchId, tenantId);

    return {
      data: kitchens,
      total: kitchens.length,
      timestamp: new Date().toISOString(),
    };
  }
}
