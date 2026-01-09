import { Module, Global } from '@nestjs/common';
import { DashboardSyncService } from './services/dashboard-sync.service';

@Global()
@Module({
  providers: [DashboardSyncService],
  exports: [DashboardSyncService],
})
export class CommonModule {}
