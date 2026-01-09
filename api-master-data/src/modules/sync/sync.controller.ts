import { Controller, Get, Query, UseGuards, Request, Param, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SyncService } from './sync.service';
import { SyncQueryDto, FullSyncResponseDto, IncrementalSyncResponseDto, StaffBranchPermissionsSyncDto } from './dto/sync.dto';

@ApiTags('Sync')
@Controller('sync')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Get('branches-brands/:staffId')
  @ApiOperation({ summary: 'Lấy danh sách thương hiệu và chi nhánh theo quyền nhân viên' })
  @ApiParam({ name: 'staffId', description: 'ID nhân viên (hoặc OAuth user ID)' })
  @ApiResponse({ status: 200, type: StaffBranchPermissionsSyncDto })
  async getStaffBranchPermissions(
    @Param('staffId') staffId: string,
    @Request() req,
  ): Promise<StaffBranchPermissionsSyncDto> {
    // Pass email and role from JWT
    // If role is 'owner', returns all brands/branches for the tenant
    return this.syncService.getStaffBranchPermissions(
      staffId,
      req.user?.tenantId,
      req.user?.email,
      req.user?.role,
    );
  }

  @Get('full')
  @ApiOperation({ summary: 'Lấy toàn bộ master data (full sync)' })
  @ApiQuery({ name: 'branchId', required: true, description: 'ID chi nhánh' })
  @ApiResponse({ status: 200, type: FullSyncResponseDto })
  async getFullSync(
    @Request() req,
    @Query('branchId') branchId: string,
  ): Promise<FullSyncResponseDto> {
    // Use branchId from query param (required for mobile app sync)
    const targetBranchId = branchId || req.user?.branchId;
    if (!targetBranchId) {
      throw new BadRequestException('branchId is required');
    }

    const result = await this.syncService.getFullSync(targetBranchId);

    // Update device sync time if available
    if (req.user?.deviceId) {
      await this.syncService.updateDeviceSyncTime(req.user.deviceId);
    }

    return result;
  }

  @Get('incremental')
  @ApiOperation({ summary: 'Lấy dữ liệu thay đổi từ thời điểm nhất định (incremental sync)' })
  @ApiQuery({ name: 'branchId', required: true, description: 'ID chi nhánh' })
  @ApiQuery({ name: 'since', required: true, description: 'ISO date string' })
  @ApiResponse({ status: 200, type: IncrementalSyncResponseDto })
  async getIncrementalSync(
    @Request() req,
    @Query('branchId') branchId: string,
    @Query() query: SyncQueryDto,
  ): Promise<IncrementalSyncResponseDto> {
    // Use branchId from query param (required for mobile app sync)
    const targetBranchId = branchId || req.user?.branchId;
    if (!targetBranchId) {
      throw new BadRequestException('branchId is required');
    }

    const since = new Date(query.since);
    const result = await this.syncService.getIncrementalSync(targetBranchId, since);

    // Update device sync time if available
    if (req.user?.deviceId) {
      await this.syncService.updateDeviceSyncTime(req.user.deviceId);
    }

    return result;
  }
}
