import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { OrdersService } from './orders.service';

/**
 * Redis Subscriber Service
 * Lắng nghe signal từ api-app-food và trigger poll đơn hàng
 */
@Injectable()
export class RedisSubscriberService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisSubscriberService.name);
  private subscriber: Redis;
  private publisher: Redis;

  constructor(
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
  ) {}

  async onModuleInit() {
    const redisConfig = {
      host: this.configService.get('CONFIG_REDIS_HOST', '172.16.10.71'),
      port: this.configService.get('CONFIG_REDIS_PORT', 6379),
      password: this.configService.get('CONFIG_REDIS_PASSWORD', '') || undefined,
      db: parseInt(this.configService.get('CONFIG_REDIS_DB', '6'), 10),
    };

    this.subscriber = new Redis(redisConfig);
    this.publisher = new Redis(redisConfig);

    // Connection events
    this.subscriber.on('connect', () => {
      this.logger.log('✅ Redis Subscriber connected');
    });

    this.subscriber.on('error', (err: Error) => {
      this.logger.error('❌ Redis Subscriber error:', err.message);
    });

    this.publisher.on('connect', () => {
      this.logger.log('✅ Redis Publisher connected');
    });

    // Subscribe to trigger-poll channel
    await this.subscribeToTriggerPoll();

    this.logger.log('🔔 Redis Subscriber Service initialized');
  }

  async onModuleDestroy() {
    await this.subscriber?.quit();
    await this.publisher?.quit();
    this.logger.log('Redis connections closed');
  }

  /**
   * Subscribe to trigger-poll channel from api-app-food
   */
  private async subscribeToTriggerPoll(): Promise<void> {
    const pattern = 'trigger-poll:branch:*';

    await this.subscriber.psubscribe(pattern);
    this.logger.log(`📡 Subscribed to pattern: ${pattern}`);

    this.subscriber.on('pmessage', async (pattern: string, channel: string, message: string) => {
      try {
        // Parse channel: trigger-poll:branch:168ae283-3efb-46cc-8657-3df86def1aed
        const parts = channel.split(':');
        const branchId = parts[2];

        this.logger.log('═══════════════════════════════════════════════════════════');
        this.logger.log(`📥 RECEIVED TRIGGER-POLL from api-app-food`);
        this.logger.log(`   Channel: ${channel}`);
        this.logger.log(`   BranchId: ${branchId}`);

        const data = JSON.parse(message);
        this.logger.log(`   Accounts: ${data.accounts?.length || 0}`);
        this.logger.log(`   Timestamp: ${new Date(data.timestamp).toISOString()}`);

        if (data.accounts && data.accounts.length > 0) {
          data.accounts.forEach((acc: any, idx: number) => {
            this.logger.log(`   Account[${idx}]: ${acc.platform} - ${acc.accountId}`);
          });
        }

        this.logger.log('═══════════════════════════════════════════════════════════');

        // Trigger poll for this branch
        this.logger.log(`🚀 Starting poll for branch ${branchId}...`);

        const result = await this.ordersService.triggerPoll(branchId);

        this.logger.log('───────────────────────────────────────────────────────────');
        this.logger.log(`✅ POLL COMPLETED for branch ${branchId}`);
        this.logger.log(`   Success: ${result.success}`);
        this.logger.log(`   New Orders: ${result.newOrderIds.length}`);
        this.logger.log(`   Total Orders: ${result.totalOrders}`);
        this.logger.log(`   Accounts Processed: ${result.accounts.length}`);
        this.logger.log('───────────────────────────────────────────────────────────');

        // Publish result back to api-app-food
        if (result.newOrderIds.length > 0) {
          await this.publishNewOrders(branchId, result);
        }

      } catch (error: any) {
        this.logger.error('═══════════════════════════════════════════════════════════');
        this.logger.error(`❌ ERROR processing trigger-poll`);
        this.logger.error(`   Channel: ${channel}`);
        this.logger.error(`   Error: ${error.message}`);
        this.logger.error('═══════════════════════════════════════════════════════════');
      }
    });
  }

  /**
   * Publish new orders to api-app-food via Redis
   */
  private async publishNewOrders(branchId: string, result: any): Promise<void> {
    const channel = `new-orders:branch:${branchId}`;

    const message = JSON.stringify({
      branchId,
      orders: result.newOrderIds,
      count: result.newOrderIds.length,
      timestamp: Date.now(),
    });

    await this.publisher.publish(channel, message);

    this.logger.log(`📤 Published ${result.newOrderIds.length} new orders to channel: ${channel}`);
  }
}
