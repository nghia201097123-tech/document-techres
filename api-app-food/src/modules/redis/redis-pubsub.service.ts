import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisPubSubService.name);
  private publisher: Redis;
  private subscriber: Redis;
  private isConnected = false;

  async onModuleInit() {
    const redisConfig = {
      host: process.env.CONFIG_REDIS_HOST || '172.16.10.146',
      port: parseInt(process.env.CONFIG_REDIS_PORT || '6379', 10),
      password: process.env.CONFIG_REDIS_PASSWORD || undefined,
      db: parseInt(process.env.CONFIG_REDIS_DB || '0', 10),
    };

    this.publisher = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);

    this.publisher.on('connect', () => {
      this.isConnected = true;
      this.logger.log('✅ Redis Publisher connected');
    });

    this.subscriber.on('connect', () => {
      this.logger.log('✅ Redis Subscriber connected');
    });

    this.publisher.on('error', (err) => {
      this.logger.error('Redis Publisher error:', err);
    });

    this.subscriber.on('error', (err) => {
      this.logger.error('Redis Subscriber error:', err);
    });
  }

  async onModuleDestroy() {
    await this.publisher?.quit();
    await this.subscriber?.quit();
    this.logger.log('Redis connections closed');
  }

  /**
   * Gửi trigger poll cho api-order-worker
   */
  async triggerPoll(branchId: string, accounts: any[]): Promise<void> {
    const channel = `trigger-poll:branch:${branchId}`;
    const message = JSON.stringify({
      branchId,
      accounts,
      timestamp: Date.now(),
    });

    await this.publisher.publish(channel, message);
    this.logger.log(`📤 Published trigger-poll for branch ${branchId} with ${accounts.length} accounts`);
  }

  /**
   * Subscribe nhận đơn mới từ api-order-worker
   */
  async subscribeNewOrders(
    callback: (branchId: string, data: { orders: any[]; count: number }) => void,
  ): Promise<void> {
    await this.subscriber.psubscribe('new-orders:branch:*');

    this.subscriber.on('pmessage', (pattern, channel, message) => {
      try {
        // Channel format: new-orders:branch:123
        const parts = channel.split(':');
        const branchId = parts[2];
        const data = JSON.parse(message);

        this.logger.log(`📥 Received new-orders for branch ${branchId}: ${data.count} orders`);
        callback(branchId, data);
      } catch (error) {
        this.logger.error('Error processing new-orders message:', error);
      }
    });

    this.logger.log('🔔 Subscribed to new-orders:branch:*');
  }

  /**
   * Cache orders trong Redis
   */
  async cacheOrders(branchId: string, orders: any[], ttlSeconds = 10): Promise<void> {
    const key = `orders:branch:${branchId}`;
    await this.publisher.setex(key, ttlSeconds, JSON.stringify(orders));
  }

  /**
   * Get cached orders
   */
  async getCachedOrders(branchId: string): Promise<any[] | null> {
    const key = `orders:branch:${branchId}`;
    const cached = await this.publisher.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Invalidate cache
   */
  async invalidateCache(branchId: string): Promise<void> {
    const key = `orders:branch:${branchId}`;
    await this.publisher.del(key);
  }

  get connected(): boolean {
    return this.isConnected;
  }
}
