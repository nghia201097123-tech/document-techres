import { Module, Global } from '@nestjs/common';
import { WorkerManagerService } from './worker-manager.service';

@Global()
@Module({
  providers: [WorkerManagerService],
  exports: [WorkerManagerService],
})
export class WorkersModule {}
