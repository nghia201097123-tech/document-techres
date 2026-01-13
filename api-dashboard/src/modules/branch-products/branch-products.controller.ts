import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BranchProductsService } from './branch-products.service';
import { UpdateBranchProductDto, BulkToggleAvailabilityDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Branch Products')
@Controller('branch-products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BranchProductsController {
  constructor(private readonly branchProductsService: BranchProductsService) {}

  /**
   * Get all products for a branch with availability status
   */
  @Get('branch/:branchId')
  @ApiOperation({ summary: 'Lấy danh sách món ăn theo chi nhánh với trạng thái bán' })
  findAllByBranch(
    @Request() req,
    @Param('branchId') branchId: string,
  ) {
    return this.branchProductsService.findAllByBranch(req.user.tenantId, branchId);
  }

  /**
   * Get only available products for a branch
   */
  @Get('branch/:branchId/available')
  @ApiOperation({ summary: 'Lấy danh sách món đang bán tại chi nhánh' })
  findAvailableByBranch(
    @Request() req,
    @Param('branchId') branchId: string,
  ) {
    return this.branchProductsService.findAvailableByBranch(req.user.tenantId, branchId);
  }

  /**
   * Get branch product statistics
   */
  @Get('branch/:branchId/stats')
  @ApiOperation({ summary: 'Lấy thống kê món ăn tại chi nhánh' })
  getStatsByBranch(
    @Request() req,
    @Param('branchId') branchId: string,
  ) {
    return this.branchProductsService.getStatsByBranch(req.user.tenantId, branchId);
  }

  /**
   * Update a branch product (availability, custom price, sort order)
   */
  @Patch('branch/:branchId/product/:productId')
  @ApiOperation({ summary: 'Cập nhật trạng thái món ăn tại chi nhánh' })
  update(
    @Request() req,
    @Param('branchId') branchId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateBranchProductDto,
  ) {
    return this.branchProductsService.update(req.user.tenantId, branchId, productId, dto);
  }

  /**
   * Toggle availability for a single product
   */
  @Post('branch/:branchId/product/:productId/toggle')
  @ApiOperation({ summary: 'Bật/tắt trạng thái bán của món tại chi nhánh' })
  toggleAvailability(
    @Request() req,
    @Param('branchId') branchId: string,
    @Param('productId') productId: string,
  ) {
    return this.branchProductsService.toggleAvailability(req.user.tenantId, branchId, productId);
  }

  /**
   * Bulk toggle availability for multiple products
   */
  @Post('branch/:branchId/bulk-toggle')
  @ApiOperation({ summary: 'Bật/tắt hàng loạt trạng thái bán của nhiều món' })
  bulkToggleAvailability(
    @Request() req,
    @Param('branchId') branchId: string,
    @Body() dto: BulkToggleAvailabilityDto,
  ) {
    return this.branchProductsService.bulkToggleAvailability(req.user.tenantId, branchId, dto);
  }

  /**
   * Sync all products to a branch (admin function)
   */
  @Post('branch/:branchId/sync')
  @ApiOperation({ summary: 'Đồng bộ tất cả món ăn xuống chi nhánh' })
  syncAllProductsToBranch(
    @Request() req,
    @Param('branchId') branchId: string,
    @Query('brandId') brandId: string,
  ) {
    return this.branchProductsService.syncAllProductsToBranch(req.user.tenantId, brandId, branchId);
  }
}
