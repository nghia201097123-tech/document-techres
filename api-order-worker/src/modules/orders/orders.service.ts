import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { WorkerManagerService, RawFoodOrder, AccountData } from '../workers/worker-manager.service';
import { FoodOrder, FoodOrderStatus, MerchantOrderStatus } from '../../database/entities/food-order.entity';
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

      // 8. Get total orders count (đơn mới + đơn đã xác nhận)
      const totalOrders = await this.orderRepo.count({
        where: { branchId, status: In([FoodOrderStatus.NEW, FoodOrderStatus.CONFIRMED]) },
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
   * Map platform status string to MerchantOrderStatus enum
   */
  private mapToMerchantStatus(platformStatus: string): MerchantOrderStatus {
    const statusLower = platformStatus.toLowerCase();
    const statusMap: Record<string, MerchantOrderStatus> = {
      new: MerchantOrderStatus.PENDING,
      pending: MerchantOrderStatus.PENDING,
      order_new: MerchantOrderStatus.PENDING,
      accepted: MerchantOrderStatus.ACCEPTED,
      order_accepted: MerchantOrderStatus.ACCEPTED,
      preparing: MerchantOrderStatus.PREPARING,
      order_in_prepare: MerchantOrderStatus.PREPARING,
      order_executing: MerchantOrderStatus.PREPARING,
      ready: MerchantOrderStatus.READY,
      order_ready: MerchantOrderStatus.READY,
      delivering: MerchantOrderStatus.DELIVERING,
      order_in_delivery: MerchantOrderStatus.DELIVERING,
      completed: MerchantOrderStatus.COMPLETED,
      order_delivered: MerchantOrderStatus.COMPLETED,
      cancelled: MerchantOrderStatus.CANCELLED,
      order_cancelled: MerchantOrderStatus.CANCELLED,
      cancelled_max: MerchantOrderStatus.CANCELLED,
      cancelled_passenger: MerchantOrderStatus.CANCELLED,
      cancelled_operator: MerchantOrderStatus.CANCELLED,
      cancelled_merchant: MerchantOrderStatus.CANCELLED,
      failed: MerchantOrderStatus.CANCELLED,
    };
    return statusMap[statusLower] || MerchantOrderStatus.PENDING;
  }

  /**
   * Lưu orders vào DB
   *
   * CCB Flow:
   * - Bước 1: CCB poll API -> api-app-food gửi signal -> api-order-worker poll từ merchant
   * - Bước 2: Worker lưu đơn vào DB với:
   *   + TechRes Status (status): NEW - chờ CCB xác nhận
   *   + Merchant Status (merchantStatus): Trạng thái từ platform (Grab/Shopee/BeFood)
   * - Bước 3: CCB hiển thị đơn, nhân viên xác nhận/huỷ -> cập nhật TechRes status
   * - Bước 4: Khi TechRes status = CONFIRMED và merchantStatus = COMPLETED/CANCELLED
   *           -> Tự động sync TechRes status theo merchantStatus
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

      // Map platform status to MerchantOrderStatus
      const newMerchantStatus = this.mapToMerchantStatus(rawOrder.status);

      if (existing) {
        // Update existing order
        const oldMerchantStatus = existing.merchantStatus;

        // Always update merchantStatus from platform
        if (oldMerchantStatus !== newMerchantStatus) {
          existing.previousMerchantStatus = oldMerchantStatus;
          existing.merchantStatus = newMerchantStatus;

          this.logger.log(
            `[saveOrders] Merchant status changed for ${existing.orderCode}: ` +
              `${oldMerchantStatus} -> ${newMerchantStatus}`,
          );
        }

        // Auto-sync TechRes status when:
        // 1. Đơn đã được xác nhận (CONFIRMED) bởi CCB
        // 2. Merchant status = COMPLETED hoặc CANCELLED
        if (existing.status === FoodOrderStatus.CONFIRMED) {
          if (
            newMerchantStatus === MerchantOrderStatus.COMPLETED &&
            existing.status !== FoodOrderStatus.COMPLETED
          ) {
            existing.previousStatus = existing.status;
            existing.status = FoodOrderStatus.COMPLETED;
            existing.completedAt = new Date();

            this.logger.log(
              `[saveOrders] Auto-complete TechRes order ${existing.orderCode} ` +
                `(merchant status: ${newMerchantStatus})`,
            );
          } else if (
            newMerchantStatus === MerchantOrderStatus.CANCELLED &&
            existing.status !== FoodOrderStatus.CANCELLED
          ) {
            existing.previousStatus = existing.status;
            existing.status = FoodOrderStatus.CANCELLED;
            existing.cancelledAt = new Date();

            this.logger.log(
              `[saveOrders] Auto-cancel TechRes order ${existing.orderCode} ` +
                `(merchant status: ${newMerchantStatus})`,
            );
          }
        }

        // Update driver info if available
        if (rawOrder.driverName) existing.driverName = rawOrder.driverName;
        if (rawOrder.driverPhone) existing.driverPhone = rawOrder.driverPhone;
        if (rawOrder.driverAvatar) existing.driverAvatar = rawOrder.driverAvatar;

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
        // Create new order
        // TechRes status: luôn bắt đầu với NEW (chờ CCB xác nhận)
        // Merchant status: lấy từ platform
        let initialTechResStatus = FoodOrderStatus.NEW;

        // Ngoại lệ: nếu platform đã completed/cancelled thì TechRes cũng set luôn
        if (newMerchantStatus === MerchantOrderStatus.COMPLETED) {
          initialTechResStatus = FoodOrderStatus.COMPLETED;
          this.logger.log(
            `[saveOrders] New order ${rawOrder.orderCode} already COMPLETED on platform`,
          );
        } else if (newMerchantStatus === MerchantOrderStatus.CANCELLED) {
          initialTechResStatus = FoodOrderStatus.CANCELLED;
          this.logger.log(
            `[saveOrders] New order ${rawOrder.orderCode} already CANCELLED on platform`,
          );
        }

        const newOrder = this.orderRepo.create({
          tenantId,
          branchId,
          externalOrderId: rawOrder.externalOrderId,
          orderCode: rawOrder.orderCode,
          platform: rawOrder.platform as any,
          status: initialTechResStatus,
          merchantStatus: newMerchantStatus,
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
          platformCreatedAt: rawOrder.createdAt,
        });

        const saved = await this.orderRepo.save(newOrder);
        savedOrders.push(saved);
        newOrderIds.push(saved.id);

        this.logger.log(
          `[saveOrders] Created new order: ${saved.orderCode} ` +
            `(TechRes: ${initialTechResStatus}, Merchant: ${newMerchantStatus})`,
        );
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
      // TechRes status (NEW, CONFIRMED, COMPLETED, CANCELLED)
      status: order.status?.toLowerCase() || 'new',
      // Merchant status from platform (pending, accepted, preparing, ready, delivering, completed, cancelled)
      merchantStatus: order.merchantStatus?.toLowerCase() || 'pending',
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
   * Get order counts by TechRes status
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
      new: 0, // Đơn mới, chờ xác nhận
      confirmed: 0, // Đã xác nhận bởi CCB
      completed: 0, // Hoàn tất
      cancelled: 0, // Đã huỷ
    };

    for (const row of counts) {
      const count = parseInt(row.count, 10);
      result.total += count;

      switch (row.status) {
        case FoodOrderStatus.NEW:
          result.new = count;
          break;
        case FoodOrderStatus.CONFIRMED:
          result.confirmed = count;
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
