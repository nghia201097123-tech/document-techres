import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { SyncAccountDto } from './dto/sync-account.dto';

@ApiTags('sync')
@Controller('sync')
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(private readonly syncService: SyncService) {}

  /**
   * Sync account from api-admin
   */
  @Post('account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync food platform account from api-admin' })
  @ApiResponse({ status: 200, description: 'Account synced successfully' })
  async syncAccount(@Body() dto: SyncAccountDto) {
    this.logger.log(`Received sync request for account: ${dto.name} (${dto.id})`);
    return this.syncService.syncAccount(dto);
  }
}
