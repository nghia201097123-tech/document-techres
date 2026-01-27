import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { WorkerManagerService, RawFoodOrder, AccountData } from '../workers/worker-manager.service';
import { FoodOrder, FoodOrderStatus } from '../../database/entities/food-order.entity';
import { FoodPlatformAccount, AccountStatus } from '../../database/entities/food-platform-account.entity';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(FoodOrder)
    private orderRepo: Repository<FoodOrder>,
    @InjectRepository(FoodPlatformAccount)
    private accountRepo: Repository<FoodPlatformAccount>,
    @InjectRedis()
    private redis: Redis,
    private workerManager: WorkerManagerService,
  ) {}

  /**
   * CCB gọi endpoint này mỗi 15s
   * Chỉ đọc từ DB/Cache, không gọi platform API
   */
  async getOrdersByBranch(branchId: string, status?: string) {
    // 1. Check cache trước
    const cacheKey = `orders:branch:${branchId}:${status || 'all'}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      this.logger.debug(`[getOrders] Cache hit for branch ${branchId}`);
      return JSON.parse(cached);
    }

    // 2. Query từ DB
    const whereCondition: any = { branchId };
    if (status && status !== 'all') {
      whereCondition.status = status.toUpperCase();
    }

    const orders = await this.orderRepo.find({
      where: whereCondition,
      order: { createdAt: 'DESC' },
      take: 100,
    });

    // 3. Transform to DTO
    const ordersDto = orders.map((order) => this.transformOrderToDto(order));

    // 4. Cache kết quả (TTL 10s)
    await this.redis.setex(cacheKey, 10, JSON.stringify(ordersDto));

    return ordersDto;
  }

  /**
   * CCB gọi khi cần trigger refresh từ platforms
   * Gửi signal đến workers để poll
   */
  async triggerPoll(branchId: string): Promise<{
    success: boolean;
    newOrderIds: string[];
    totalOrders: number;
    accounts: any[];
  }> {
    // 1. Lấy tất cả accounts của branch
    const accounts = await this.accountRepo.find({
      where: { branchId, status: AccountStatus.CONNECTED },
    });

    if (accounts.length === 0) {
      this.logger.warn(`[triggerPoll] No connected accounts for branch ${branchId}`);
      return {
        success: true,
        newOrderIds: [],
        totalOrders: 0,
        accounts: [],
      };
    }

    // 2. Check lock để tránh poll trùng
    const lockKey = `poll-lock:branch:${branchId}`;
    const locked = await this.redis.set(lockKey, '1', 'EX', 10, 'NX');

    if (!locked) {
      this.logger.debug(`[triggerPoll] Poll already in progress for branch ${branchId}`);
      // Return cached data
      const orders = await this.getOrdersByBranch(branchId);
      return {
        success: true,
        newOrderIds: [],
        totalOrders: orders.length,
        accounts: accounts.map((a) => ({
          platform: a.platform,
          accountId: a.id,
          displayName: a.displayName,
          skipped: true,
        })),
      };
    }

    try {
      // 3. Prepare account data for workers
      const accountData: AccountData[] = accounts.map((acc) => ({
        id: acc.id,
        platform: acc.platform as 'grab' | 'shopee_food' | 'befood',
        accessToken: acc.accessToken,
        branchId: acc.branchId,
        tenantId: acc.tenantId,
      }));

      // 4. Poll tất cả accounts song song bằng Piscina workers
      const results = await this.workerManager.pollMultipleAccounts(accountData);

      // 5. Process kết quả
      const newOrderIds: string[] = [];
      const accountResults: any[] = [];

      for (const result of results) {
        const account = accounts.find((a) => a.id === result.accountId);

        if (result.success) {
          // Save orders and get new ones
          const saved = await this.saveOrders(result.orders, branchId, account?.tenantId || '');
          newOrderIds.push(...saved.newOrderIds);

          // Update account metadata
          await this.accountRepo.update(result.accountId, {
            lastPollAt: new Date(),
            errorCount: 0,
            lastError: null,
          });

          accountResults.push({
            platform: result.platform,
            accountId: result.accountId,
            displayName: account?.displayName,
            success: true,
            ordersCount: result.orders.length,
            newOrdersCount: saved.newOrderIds.length,
            orderStats: result.orderStats,
          });
        } else {
          // Handle errors
          if (result.isUnauthorized) {
            await this.accountRepo.update(result.accountId, {
              status: AccountStatus.DISCONNECTED,
              lastError: 'Token expired',
            });
          } else {
            await this.accountRepo.increment({ id: result.accountId }, 'errorCount', 1);
            await this.accountRepo.update(result.accountId, {
              lastError: result.error,
            });
          }

          accountResults.push({
            platform: result.platform,
            accountId: result.accountId,
            displayName: account?.displayName,
            success: false,
            error: result.error,
            isUnauthorized: result.isUnauthorized,
          });
        }
      }

      // 6. Invalidate cache
      await this.invalidateCache(branchId);

      // 7. Push notification nếu có đơn mới
      if (newOrderIds.length > 0) {
        await this.publishNewOrders(branchId, newOrderIds);
      }

      // 8. Get total orders count
      const totalOrders = await this.orderRepo.count({
        where: { branchId, status: In([FoodOrderStatus.NEW, FoodOrderStatus.PREPARING]) },
      });

      return {
        success: true,
        newOrderIds,
        totalOrders,
        accounts: accountResults,
      };
    } finally {
      // Release lock
      await this.redis.del(lockKey);
    }
  }

  /**
   * Lưu orders vào DB
   * TechRes Flow:
   * - Đơn mới luôn bắt đầu với status = NEW
   * - Chỉ sync COMPLETED/CANCELLED từ platform
   */
  private async saveOrders(
    orders: RawFoodOrder[],
    branchId: string,
    tenantId: string,
  ): Promise<{ savedOrders: FoodOrder[]; newOrderIds: string[] }> {
    const savedOrders: FoodOrder[] = [];
    const newOrderIds: string[] = [];

    for (const rawOrder of orders) {
      const existing = await this.orderRepo.findOne({
        where: {
          externalOrderId: rawOrder.externalOrderId,
          platform: rawOrder.platform as any,
        },
      });

      if (existing) {
        // Update existing order
        const platformStatus = rawOrder.status;

        // TechRes flow: Chỉ sync COMPLETED/CANCELLED từ platform
        if (platformStatus === 'COMPLETED' || platformStatus === 'CANCELLED') {
          if (existing.status !== platformStatus) {
            existing.previousStatus = existing.status;
            existing.status = platformStatus as FoodOrderStatus;
            existing.lastSyncAt = new Date();

            if (platformStatus === 'COMPLETED') {
              existing.completedAt = new Date();
            } else {
              existing.cancelledAt = new Date();
            }

            this.logger.log(
              `[saveOrders] Auto-sync status for ${existing.orderCode}: ` +
                `${existing.previousStatus} -> ${platformStatus}`,
            );
          }
        }

        // Update driver info if available
        if (rawOrder.driverName) existing.driverName = rawOrder.driverName;
        if (rawOrder.driverPhone) existing.driverPhone = rawOrder.driverPhone;
        if (rawOrder.driverAvatar) existing.driverAvatar = rawOrder.driverAvatar;
        if (rawOrder.orderContentMessage) existing.orderContentMessage = rawOrder.orderContentMessage;

        // Update customer info if missing
        if (rawOrder.customerPhone && !existing.customerPhone) {
          existing.customerPhone = rawOrder.customerPhone;
        }
        if (rawOrder.customerAddress && !existing.customerAddress) {
          existing.customerAddress = rawOrder.customerAddress;
        }
        if (rawOrder.customerNote && !existing.customerNote) {
          existing.customerNote = rawOrder.customerNote;
        }

        existing.lastSyncAt = new Date();
        await this.orderRepo.save(existing);
        savedOrders.push(existing);
      } else {
        // Create new order - TechRes flow: luôn bắt đầu với NEW
        const platformStatus = rawOrder.status;
        let initialStatus = FoodOrderStatus.NEW;

        // Ngoại lệ: nếu platform đã COMPLETED/CANCELLED
        if (platformStatus === 'COMPLETED' || platformStatus === 'CANCELLED') {
          initialStatus = platformStatus as FoodOrderStatus;
          this.logger.log(
            `[saveOrders] New order ${rawOrder.orderCode} already ${platformStatus} on platform`,
          );
        }

        const newOrder = this.orderRepo.create({
          tenantId,
          branchId,
          externalOrderId: rawOrder.externalOrderId,
          orderCode: rawOrder.orderCode,
          platform: rawOrder.platform as any,
          status: initialStatus,
          customerName: rawOrder.customerName,
          customerPhone: rawOrder.customerPhone || '',
          customerAddress: rawOrder.customerAddress || '',
          customerNote: rawOrder.customerNote || '',
          items: rawOrder.items,
          subtotal: rawOrder.subtotal,
          deliveryFee: rawOrder.deliveryFee,
          platformFee: rawOrder.platformFee,
          discount: rawOrder.discount,
          totalAmount: rawOrder.totalAmount,
          isPaid: rawOrder.isPaid,
          paymentMethod: rawOrder.paymentMethod || '',
          driverName: rawOrder.driverName || null,
          driverPhone: rawOrder.driverPhone || null,
          driverAvatar: rawOrder.driverAvatar || null,
          estimatedDeliveryTime: rawOrder.estimatedDeliveryTime || null,
          orderContentMessage: rawOrder.orderContentMessage || null,
          platformCreatedAt: rawOrder.createdAt,
        });

        const saved = await this.orderRepo.save(newOrder);
        savedOrders.push(saved);
        newOrderIds.push(saved.id);

        this.logger.log(`[saveOrders] Created new order: ${saved.orderCode}`);
      }
    }

    return { savedOrders, newOrderIds };
  }

  /**
   * Transform order entity to DTO for API response
   */
  private transformOrderToDto(order: FoodOrder) {
    return {
      id: order.id,
      externalOrderId: order.externalOrderId,
      orderCode: order.orderCode,
      platform: order.platform,
      status: order.status.toLowerCase(),
      customerId: null,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      customerNote: order.customerNote,
      items: order.items,
      itemsCount: order.items?.length || 0,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      platformFee: order.platformFee,
      discount: order.discount,
      totalAmount: order.totalAmount,
      isPaid: order.isPaid,
      paymentMethod: order.paymentMethod,
      driverId: null,
      driverName: order.driverName,
      driverPhone: order.driverPhone,
      driverAvatar: order.driverAvatar,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      orderContentMessage: order.orderContentMessage,
      createdAt: order.createdAt?.toISOString(),
      platformCreatedAt: order.platformCreatedAt?.toISOString(),
      acceptedAt: order.acceptedAt?.toISOString(),
      preparedAt: order.preparedAt?.toISOString(),
      completedAt: order.completedAt?.toISOString(),
      cancelledAt: order.cancelledAt?.toISOString(),
    };
  }

  /**
   * Invalidate cache khi có thay đổi
   */
  private async invalidateCache(branchId: string): Promise<void> {
    const pattern = `orders:branch:${branchId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
      this.logger.debug(`[invalidateCache] Deleted ${keys.length} cache keys`);
    }
  }

  /**
   * Publish new orders qua Redis Pub/Sub
   * WebSocket Gateway sẽ nhận và push đến clients
   */
  private async publishNewOrders(branchId: string, orderIds: string[]): Promise<void> {
    const orders = await this.orderRepo.find({
      where: { id: In(orderIds) },
    });

    const ordersDto = orders.map((o) => this.transformOrderToDto(o));

    const channel = `branch:${branchId}:new-orders`;
    await this.redis.publish(
      channel,
      JSON.stringify({
        type: 'NEW_ORDERS',
        branchId,
        orders: ordersDto,
        count: orders.length,
        timestamp: new Date().toISOString(),
      }),
    );

    this.logger.log(`[publishNewOrders] Published ${orders.length} new orders to ${channel}`);
  }

  /**
   * Get order counts by status
   */
  async getOrderCounts(branchId: string) {
    const counts = await this.orderRepo
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.branchId = :branchId', { branchId })
      .groupBy('order.status')
      .getRawMany();

    const result = {
      total: 0,
      new: 0,
      preparing: 0,
      completed: 0,
      cancelled: 0,
    };

    for (const row of counts) {
      const count = parseInt(row.count, 10);
      result.total += count;

      switch (row.status) {
        case FoodOrderStatus.NEW:
          result.new = count;
          break;
        case FoodOrderStatus.PREPARING:
          result.preparing = count;
          break;
        case FoodOrderStatus.COMPLETED:
          result.completed = count;
          break;
        case FoodOrderStatus.CANCELLED:
          result.cancelled = count;
          break;
      }
    }

    return result;
  }

  /**
   * Get worker pool statistics
   */
  getWorkerStats() {
    return this.workerManager.getPoolStats();
  }
}
