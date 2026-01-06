import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SyncService } from './sync.service';
import { SyncQueryDto, FullSyncResponseDto, IncrementalSyncResponseDto } from './dto/sync.dto';

@ApiTags('Sync')
@Controller('sync')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class SyncController {
  constructor(private syncService: SyncService) {}

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
