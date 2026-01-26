import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

/**
 * Queue Module for background job processing
 *
 * Uses Bull Queue for:
 * - Scheduled order polling
 * - Retry failed polling attempts
 * - Delayed status synchronization
 */
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'order-poll',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    BullModule.registerQueue({
      name: 'order-sync',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
