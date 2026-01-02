import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Lấy thống kê tổng quan' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'brandId', required: false })
  getStats(
    @Request() req,
    @Query('branchId') branchId?: string,
    @Query('brandId') brandId?: string,
  ) {
    return this.dashboardService.getStats(
      req.user.tenantId,
      req.user.companyId,
      branchId,
      brandId,
    );
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Lấy hoạt động gần đây' })
  @ApiQuery({ name: 'limit', required: false })
  getRecentActivity(@Request() req, @Query('limit') limit?: number) {
    return this.dashboardService.getRecentActivity(req.user.tenantId, limit || 10);
  }
}
