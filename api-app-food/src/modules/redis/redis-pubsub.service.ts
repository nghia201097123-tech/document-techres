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
      host: process.env.CONFIG_REDIS_HOST || '172.16.10.71',
      port: parseInt(process.env.CONFIG_REDIS_PORT || '6379', 10),
      password: process.env.CONFIG_REDIS_PASSWORD || undefined,
      db: parseInt(process.env.CONFIG_REDIS_DB || '6', 10),
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

    this.publisher.on('error', (err: Error) => {
      this.logger.error('Redis Publisher error:', err);
    });

    this.subscriber.on('error', (err: Error) => {
      this.logger.error('Redis Subscriber error:', err);
    });
  }

  async onModuleDestroy() {
    await this.publisher?.quit();
    await this.subscriber?.quit();
    this.logger.log('Redis connections closed');
  }

  /**
   * Gửi trigger poll cho api-order-worker (với deduplication)
   *
   * Deduplication: Chỉ trigger 1 lần mỗi 10 giây cho mỗi branch
   * Tránh trường hợp 100 users cùng branch gọi endpoint → 100 triggers trùng lặp
   */
  async triggerPoll(branchId: string, accounts: any[]): Promise<void> {
    const lockKey = `poll-lock:${branchId}`;
    const LOCK_TTL_SECONDS = 10; // Chỉ trigger 1 lần mỗi 10 giây

    // Try to acquire lock (NX = only set if not exists)
    const acquired = await this.publisher.set(lockKey, Date.now().toString(), 'EX', LOCK_TTL_SECONDS, 'NX');

    if (!acquired) {
      // Lock exists = recently triggered, skip
      this.logger.log(`[Dedupe] Skip trigger for branch ${branchId} - triggered within last ${LOCK_TTL_SECONDS}s`);
      return;
    }

    // Lock acquired, proceed with trigger
    const channel = `trigger-poll:branch:${branchId}`;
    const message = JSON.stringify({
      branchId,
      accounts,
      timestamp: Date.now(),
    });

    this.logger.log('═══════════════════════════════════════════════════════════');
    this.logger.log(`📤 PUBLISHING to Redis Pub/Sub`);
    this.logger.log(`   Channel: ${channel}`);
    this.logger.log(`   Accounts: ${accounts.length}`);
    this.logger.log(`   Redis Connected: ${this.isConnected}`);
    this.logger.log(`   Deduplication: Lock acquired for ${LOCK_TTL_SECONDS}s`);

    const result = await this.publisher.publish(channel, message);

    this.logger.log(`   Subscribers received: ${result}`);
    this.logger.log('═══════════════════════════════════════════════════════════');
  }

  /**
   * Force trigger poll (bỏ qua deduplication)
   * Dùng khi cần trigger ngay lập tức (vd: sau khi xác nhận đơn)
   */
  async forceTriggerPoll(branchId: string, accounts: any[]): Promise<void> {
    const lockKey = `poll-lock:${branchId}`;

    // Remove lock first
    await this.publisher.del(lockKey);

    // Then trigger
    await this.triggerPoll(branchId, accounts);
  }

  /**
   * Subscribe nhận đơn mới từ api-order-worker
   */
  async subscribeNewOrders(
    callback: (branchId: string, data: { orders: any[]; count: number }) => void,
  ): Promise<void> {
    await this.subscriber.psubscribe('new-orders:branch:*');

    this.subscriber.on('pmessage', (pattern: string, channel: string, message: string) => {
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
