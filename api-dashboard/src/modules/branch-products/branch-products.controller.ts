import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BranchProductsService } from './branch-products.service';
import { UpdateBranchProductDto, BulkToggleAvailabilityDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

@Controller('branch-products')
@UseGuards(JwtAuthGuard)
export class BranchProductsController {
  constructor(private readonly branchProductsService: BranchProductsService) {}

  /**
   * Get all products for a branch with availability status
   */
  @Get('branch/:branchId')
  findAllByBranch(
    @CurrentTenant() tenantId: string,
    @Param('branchId') branchId: string,
  ) {
    return this.branchProductsService.findAllByBranch(tenantId, branchId);
  }

  /**
   * Get only available products for a branch
   */
  @Get('branch/:branchId/available')
  findAvailableByBranch(
    @CurrentTenant() tenantId: string,
    @Param('branchId') branchId: string,
  ) {
    return this.branchProductsService.findAvailableByBranch(tenantId, branchId);
  }

  /**
   * Get branch product statistics
   */
  @Get('branch/:branchId/stats')
  getStatsByBranch(
    @CurrentTenant() tenantId: string,
    @Param('branchId') branchId: string,
  ) {
    return this.branchProductsService.getStatsByBranch(tenantId, branchId);
  }

  /**
   * Update a branch product (availability, custom price, sort order)
   */
  @Patch('branch/:branchId/product/:productId')
  update(
    @CurrentTenant() tenantId: string,
    @Param('branchId') branchId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateBranchProductDto,
  ) {
    return this.branchProductsService.update(tenantId, branchId, productId, dto);
  }

  /**
   * Toggle availability for a single product
   */
  @Post('branch/:branchId/product/:productId/toggle')
  toggleAvailability(
    @CurrentTenant() tenantId: string,
    @Param('branchId') branchId: string,
    @Param('productId') productId: string,
  ) {
    return this.branchProductsService.toggleAvailability(tenantId, branchId, productId);
  }

  /**
   * Bulk toggle availability for multiple products
   */
  @Post('branch/:branchId/bulk-toggle')
  bulkToggleAvailability(
    @CurrentTenant() tenantId: string,
    @Param('branchId') branchId: string,
    @Body() dto: BulkToggleAvailabilityDto,
  ) {
    return this.branchProductsService.bulkToggleAvailability(tenantId, branchId, dto);
  }

  /**
   * Sync all products to a branch (admin function)
   */
  @Post('branch/:branchId/sync')
  syncAllProductsToBranch(
    @CurrentTenant() tenantId: string,
    @Param('branchId') branchId: string,
    @Query('brandId') brandId: string,
  ) {
    return this.branchProductsService.syncAllProductsToBranch(tenantId, brandId, branchId);
  }
}
