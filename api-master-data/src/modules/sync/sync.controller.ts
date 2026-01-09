import { Controller, Get, Query, UseGuards, Request, Param } from '@nestjs/common';
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
  @ApiResponse({ status: 200, type: FullSyncResponseDto })
  async getFullSync(@Request() req): Promise<FullSyncResponseDto> {
    const result = await this.syncService.getFullSync(req.user.branchId);

    // Update device sync time
    await this.syncService.updateDeviceSyncTime(req.user.deviceId);

    return result;
  }

  @Get('incremental')
  @ApiOperation({ summary: 'Lấy dữ liệu thay đổi từ thời điểm nhất định (incremental sync)' })
  @ApiQuery({ name: 'since', required: true, description: 'ISO date string' })
  @ApiResponse({ status: 200, type: IncrementalSyncResponseDto })
  async getIncrementalSync(
    @Request() req,
    @Query() query: SyncQueryDto,
  ): Promise<IncrementalSyncResponseDto> {
    const since = new Date(query.since);
    const result = await this.syncService.getIncrementalSync(req.user.branchId, since);

    // Update device sync time
    await this.syncService.updateDeviceSyncTime(req.user.deviceId);

    return result;
  }
}
