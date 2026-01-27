import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual } from 'typeorm';
import {
  FoodOrder,
  FoodOrderStatus,
  FoodOrderItem,
  FoodPlatformAccount,
  FoodPlatformStoreMapping,
  FoodPlatformType,
  FoodOrderItemEntity,
  FoodOrderItemStatus,
} from '../../database/entities';
import { ConnectorFactory, RawFoodOrder, RawFoodOrderItem } from '../connectors';
import { StoresService } from '../stores/stores.service';
import { AccountsService } from '../accounts/accounts.service';
import { RedisPubSubService } from '../redis/redis-pubsub.service';
import { PollOrdersQueryDto, GetOrdersQueryDto, PollResponseDto } from './dto/order.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(FoodOrder)
    private readonly orderRepo: Repository<FoodOrder>,
    @InjectRepository(FoodOrderItemEntity)
    private readonly orderItemRepo: Repository<FoodOrderItemEntity>,
    @InjectRepository(FoodPlatformAccount)
    private readonly accountRepo: Repository<FoodPlatformAccount>,
    private readonly storesService: StoresService,
    private readonly accountsService: AccountsService,
    private readonly connectorFactory: ConnectorFactory,
    private readonly redisPubSub: RedisPubSubService,
  ) {}

  /**
   * Poll orders for a branch
   * CCB gọi endpoint này mỗi 15 giây
   *
   * Flow:
   * 1. Đọc đơn hàng từ DB (có cache Redis)
   * 2. Gửi signal qua Redis Pub/Sub cho api-order-worker poll merchant APIs
   * 3. Trả về danh sách đơn hàng cho CCB
   *
   * Kết quả poll từ merchant sẽ được worker lưu vào DB và push qua WebSocket
   */
  async pollOrders(query: PollOrdersQueryDto): Promise<PollResponseDto> {
    const startTime = Date.now();
    const branchId = query.branchId;

    this.logger.log(`[PollOrders] Processing poll for branch ${branchId}`);

    // 1. Trigger api-order-worker để poll merchant APIs (non-blocking)
    this.triggerWorkerPoll(branchId).catch(err => {
      this.logger.error(`[PollOrders] Error triggering worker: ${err.message}`);
    });

    // 2. Check Redis cache first
    const cachedOrders = await this.redisPubSub.getCachedOrders(branchId);
    if (cachedOrders) {
      this.logger.log(`[PollOrders] Cache hit for branch ${branchId}: ${cachedOrders.length} orders`);

      // Filter by lastPollAt if provided
      const sinceDate = query.lastPollAt ? new Date(query.lastPollAt) : null;
      const newOrders = sinceDate
        ? cachedOrders.filter(o => new Date(o.createdAt) > sinceDate)
        : cachedOrders;

      return {
        success: true,
        newOrders,
        updatedOrders: [],
        meta: {
          pollTimestamp: Date.now(),
          accountsPolled: 0,
          totalOrdersFetched: cachedOrders.length,
          processingTimeMs: Date.now() - startTime,
          source: 'cache',
        },
        errors: [],
      };
    }

    // 3. Cache miss - Query from database
    this.logger.log(`[PollOrders] Cache miss for branch ${branchId}, querying DB`);

    const whereConditions: any = { branchId };

    // Only get orders from last 24 hours by default
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    whereConditions.createdAt = MoreThanOrEqual(last24Hours);

    // Filter by lastPollAt if provided
    if (query.lastPollAt) {
      whereConditions.updatedAt = MoreThanOrEqual(new Date(query.lastPollAt));
    }

    const orders = await this.orderRepo.find({
      where: whereConditions,
      relations: ['orderItems'],
      order: { createdAt: 'DESC' },
      take: 100, // Limit to prevent huge responses
    });

    // 4. Cache the result
    await this.redisPubSub.cacheOrders(branchId, orders, 10); // 10 seconds TTL

    this.logger.log(`[PollOrders] Found ${orders.length} orders for branch ${branchId}`);

    return {
      success: true,
      newOrders: orders,
      updatedOrders: [],
      meta: {
        pollTimestamp: Date.now(),
        accountsPolled: 0,
        totalOrdersFetched: orders.length,
        processingTimeMs: Date.now() - startTime,
        source: 'database',
      },
      errors: [],
    };
  }

  /**
   * Trigger api-order-worker để poll merchant APIs
   * Gọi async, không đợi kết quả
   */
  private async triggerWorkerPoll(branchId: string): Promise<void> {
    this.logger.log(`[TriggerWorker] ══════════════════════════════════════════════`);
    this.logger.log(`[TriggerWorker] Starting trigger for branch: ${branchId}`);

    try {
      // Get all active accounts for this branch
      const mappings = await this.storesService.getActiveMappingsForBranch(branchId);

      this.logger.log(`[TriggerWorker] Found ${mappings.length} active mappings`);

      if (mappings.length === 0) {
        this.logger.warn(`[TriggerWorker] ⚠️ No active accounts for branch ${branchId}`);
        this.logger.warn(`[TriggerWorker] Skipping Redis publish - no accounts to poll`);
        this.logger.log(`[TriggerWorker] ══════════════════════════════════════════════`);
        return;
      }

      // Prepare account data to send to worker
      const accounts = mappings.map(mapping => ({
        accountId: mapping.accountId,
        platform: mapping.account?.platform,
        externalStoreId: mapping.externalStoreId,
        accessToken: mapping.account?.accessToken,
        refreshToken: mapping.account?.refreshToken,
        externalMerchantId: mapping.account?.externalMerchantId,
      }));

      this.logger.log(`[TriggerWorker] Accounts to poll:`);
      accounts.forEach((acc, idx) => {
        this.logger.log(`[TriggerWorker]   [${idx}] ${acc.platform} - ${acc.accountId}`);
      });

      // Send trigger message to api-order-worker via Redis Pub/Sub
      await this.redisPubSub.triggerPoll(branchId, accounts);

      this.logger.log(`[TriggerWorker] ✅ Signal sent successfully`);
      this.logger.log(`[TriggerWorker] ══════════════════════════════════════════════`);
    } catch (error: any) {
      this.logger.error(`[TriggerWorker] ❌ Error: ${error.message}`);
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(id: string, includeItems = true): Promise<FoodOrder> {
    const relations = ['account', 'storeMapping'];
    if (includeItems) {
      relations.push('orderItems');
    }

    const order = await this.orderRepo.findOne({
      where: { id },
      relations,
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID: ${id}`);
    }

    return order;
  }

  /**
   * Get orders with filters
   */
  async getOrders(query: GetOrdersQueryDto): Promise<{
    items: FoodOrder[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const qb = this.orderRepo.createQueryBuilder('order');

    if (query.tenantId) {
      qb.andWhere('order.tenantId = :tenantId', { tenantId: query.tenantId });
    }

    if (query.branchId) {
      qb.andWhere('order.branchId = :branchId', { branchId: query.branchId });
    }

    if (query.platform) {
      qb.andWhere('order.platform = :platform', { platform: query.platform });
    }

    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    qb.orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  /**
   * Accept/Confirm an order
   */
  async acceptOrder(orderId: string): Promise<FoodOrder> {
    const order = await this.getOrderById(orderId);

    if (order.status !== FoodOrderStatus.NEW) {
      throw new BadRequestException(
        `Đơn hàng ${order.orderCode} không ở trạng thái chờ xác nhận`,
      );
    }

    const account = await this.accountRepo.findOne({
      where: { id: order.accountId },
    });

    if (!account) {
      throw new BadRequestException('Không tìm thấy tài khoản');
    }

    // Call platform API
    const connector = this.connectorFactory.getConnector(order.platform);
    const result = await connector.acceptOrder(account, order.externalOrderId);

    if (!result.success) {
      throw new BadRequestException(result.error || 'Xác nhận đơn thất bại');
    }

    // Update order
    order.previousStatus = order.status;
    order.status = FoodOrderStatus.ACCEPTED;
    order.acceptedAt = new Date();
    order.isAutoConfirmed = true;
    order.confirmedAt = new Date();

    return this.orderRepo.save(order);
  }

  /**
   * Mark order as ready
   */
  async markReady(orderId: string): Promise<FoodOrder> {
    const order = await this.getOrderById(orderId);

    if (
      order.status !== FoodOrderStatus.ACCEPTED &&
      order.status !== FoodOrderStatus.PREPARING
    ) {
      throw new BadRequestException(
        `Đơn hàng ${order.orderCode} không thể đánh dấu sẵn sàng`,
      );
    }

    const account = await this.accountRepo.findOne({
      where: { id: order.accountId },
    });

    if (!account) {
      throw new BadRequestException('Không tìm thấy tài khoản');
    }

    const connector = this.connectorFactory.getConnector(order.platform);
    const result = await connector.markReady(account, order.externalOrderId);

    if (!result.success) {
      throw new BadRequestException(result.error || 'Đánh dấu sẵn sàng thất bại');
    }

    order.previousStatus = order.status;
    order.status = FoodOrderStatus.READY;
    order.preparedAt = new Date();

    return this.orderRepo.save(order);
  }

  /**
   * Complete an order
   */
  async completeOrder(orderId: string): Promise<FoodOrder> {
    const order = await this.getOrderById(orderId);

    const account = await this.accountRepo.findOne({
      where: { id: order.accountId },
    });

    if (!account) {
      throw new BadRequestException('Không tìm thấy tài khoản');
    }

    const connector = this.connectorFactory.getConnector(order.platform);
    const result = await connector.completeOrder(account, order.externalOrderId);

    if (!result.success) {
      throw new BadRequestException(result.error || 'Hoàn tất đơn thất bại');
    }

    order.previousStatus = order.status;
    order.status = FoodOrderStatus.COMPLETED;
    order.completedAt = new Date();

    return this.orderRepo.save(order);
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, reason: string): Promise<FoodOrder> {
    const order = await this.getOrderById(orderId);

    if (order.status === FoodOrderStatus.COMPLETED) {
      throw new BadRequestException('Không thể hủy đơn đã hoàn thành');
    }

    const account = await this.accountRepo.findOne({
      where: { id: order.accountId },
    });

    if (!account) {
      throw new BadRequestException('Không tìm thấy tài khoản');
    }

    const connector = this.connectorFactory.getConnector(order.platform);
    const result = await connector.cancelOrder(
      account,
      order.externalOrderId,
      reason,
    );

    if (!result.success) {
      throw new BadRequestException(result.error || 'Hủy đơn thất bại');
    }

    order.previousStatus = order.status;
    order.status = FoodOrderStatus.CANCELLED;
    order.cancelledAt = new Date();
    order.cancelReason = reason;

    return this.orderRepo.save(order);
  }

  /**
   * Mark order as printed
   */
  async markPrinted(orderId: string): Promise<FoodOrder> {
    const order = await this.getOrderById(orderId);
    order.isPrinted = true;
    order.printedAt = new Date();
    return this.orderRepo.save(order);
  }
}
