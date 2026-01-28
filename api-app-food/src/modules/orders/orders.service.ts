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
  MerchantOrderStatus,
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

  /**
   * Kiểm tra merchantStatus có phải trạng thái hoàn tất không
   */
  private isMerchantCompleted(status: MerchantOrderStatus): boolean {
    return status === MerchantOrderStatus.COMPLETED;
  }

  /**
   * Kiểm tra merchantStatus có phải trạng thái huỷ không
   */
  private isMerchantCancelled(status: MerchantOrderStatus): boolean {
    return [
      MerchantOrderStatus.CANCELLED,
      MerchantOrderStatus.CANCELLED_MAX,
      MerchantOrderStatus.CANCELLED_PASSENGER,
      MerchantOrderStatus.CANCELLED_OPERATOR,
      MerchantOrderStatus.FAILED,
    ].includes(status);
  }

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

    if (query.merchantStatus) {
      qb.andWhere('order.merchantStatus = :merchantStatus', {
        merchantStatus: query.merchantStatus,
      });
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
   * Xác nhận đơn hàng (CCB)
   *
   * CCB Flow - Bước 3:
   * - Nhân viên CCB nhấn "Xác nhận" để xác nhận đơn hàng
   * - Cập nhật TechRes status: NEW -> CONFIRMED
   * - Nếu merchantStatus đã COMPLETED -> auto-complete TechRes
   * - Nếu merchantStatus đã CANCELLED -> auto-cancel TechRes
   * - Nếu merchantStatus chưa kết thúc -> chờ worker auto-sync sau
   */
  async confirmOrder(orderId: string): Promise<FoodOrder> {
    const order = await this.getOrderById(orderId);

    if (order.status !== FoodOrderStatus.NEW) {
      throw new BadRequestException(
        `Đơn hàng ${order.orderCode} không ở trạng thái chờ xác nhận (hiện tại: ${order.status})`,
      );
    }

    // Cập nhật TechRes status
    order.previousStatus = order.status;
    order.status = FoodOrderStatus.CONFIRMED;
    order.confirmedAt = new Date();

    this.logger.log(
      `[ConfirmOrder] ${order.orderCode}: TechRes status: NEW -> CONFIRMED, ` +
        `merchantStatus: ${order.merchantStatus}`,
    );

    // Auto-sync nếu merchantStatus đã kết thúc
    if (this.isMerchantCompleted(order.merchantStatus)) {
      order.status = FoodOrderStatus.COMPLETED;
      order.completedAt = new Date();
      this.logger.log(
        `[ConfirmOrder] ${order.orderCode}: Auto-complete vì merchantStatus = COMPLETED`,
      );
    } else if (this.isMerchantCancelled(order.merchantStatus)) {
      order.status = FoodOrderStatus.CANCELLED;
      order.cancelledAt = new Date();
      this.logger.log(
        `[ConfirmOrder] ${order.orderCode}: Auto-cancel vì merchantStatus = ${order.merchantStatus}`,
      );
    }

    return this.orderRepo.save(order);
  }

  /**
   * Accept order on merchant platform (optional)
   * Gọi platform API để accept đơn nếu merchant chưa auto-accept
   */
  async acceptOrder(orderId: string): Promise<FoodOrder> {
    const order = await this.getOrderById(orderId);

    // Chỉ gọi platform API nếu merchant chưa accept
    if (
      order.merchantStatus !== MerchantOrderStatus.PENDING &&
      order.merchantStatus !== MerchantOrderStatus.ACCEPTED
    ) {
      this.logger.log(
        `[AcceptOrder] ${order.orderCode}: Skipping platform API call, ` +
          `merchantStatus already: ${order.merchantStatus}`,
      );
      return order;
    }

    const account = await this.accountRepo.findOne({
      where: { id: order.accountId },
    });

    if (!account) {
      throw new BadRequestException('Không tìm thấy tài khoản');
    }

    try {
      // Call platform API
      const connector = this.connectorFactory.getConnector(order.platform);
      const result = await connector.acceptOrder(account, order.externalOrderId);

      if (!result.success) {
        this.logger.warn(
          `[AcceptOrder] ${order.orderCode}: Platform API failed: ${result.error}`,
        );
        // Không throw error, vì merchant có thể đã tự accept
      } else {
        this.logger.log(
          `[AcceptOrder] ${order.orderCode}: Platform API accepted successfully`,
        );
      }
    } catch (error: any) {
      this.logger.warn(
        `[AcceptOrder] ${order.orderCode}: Platform API error: ${error.message}`,
      );
    }

    // Nếu chưa confirm thì confirm luôn
    if (order.status === FoodOrderStatus.NEW) {
      order.previousStatus = order.status;
      order.status = FoodOrderStatus.CONFIRMED;
      order.confirmedAt = new Date();
      order.acceptedAt = new Date();
    }

    return this.orderRepo.save(order);
  }

  /**
   * Mark order as ready on merchant platform (optional)
   */
  async markReady(orderId: string): Promise<FoodOrder> {
    const order = await this.getOrderById(orderId);

    if (order.status === FoodOrderStatus.COMPLETED || order.status === FoodOrderStatus.CANCELLED) {
      throw new BadRequestException(
        `Đơn hàng ${order.orderCode} đã kết thúc, không thể đánh dấu sẵn sàng`,
      );
    }

    const account = await this.accountRepo.findOne({
      where: { id: order.accountId },
    });

    if (!account) {
      throw new BadRequestException('Không tìm thấy tài khoản');
    }

    try {
      const connector = this.connectorFactory.getConnector(order.platform);
      const result = await connector.markReady(account, order.externalOrderId);

      if (!result.success) {
        this.logger.warn(
          `[MarkReady] ${order.orderCode}: Platform API failed: ${result.error}`,
        );
      }
    } catch (error: any) {
      this.logger.warn(
        `[MarkReady] ${order.orderCode}: Platform API error: ${error.message}`,
      );
    }

    order.preparedAt = new Date();

    return this.orderRepo.save(order);
  }

  /**
   * Complete order on merchant platform
   */
  async completeOrder(orderId: string): Promise<FoodOrder> {
    const order = await this.getOrderById(orderId);

    if (order.status === FoodOrderStatus.COMPLETED) {
      return order; // Already completed
    }

    if (order.status === FoodOrderStatus.CANCELLED) {
      throw new BadRequestException('Không thể hoàn tất đơn đã hủy');
    }

    const account = await this.accountRepo.findOne({
      where: { id: order.accountId },
    });

    if (!account) {
      throw new BadRequestException('Không tìm thấy tài khoản');
    }

    try {
      const connector = this.connectorFactory.getConnector(order.platform);
      const result = await connector.completeOrder(account, order.externalOrderId);

      if (!result.success) {
        this.logger.warn(
          `[CompleteOrder] ${order.orderCode}: Platform API failed: ${result.error}`,
        );
      }
    } catch (error: any) {
      this.logger.warn(
        `[CompleteOrder] ${order.orderCode}: Platform API error: ${error.message}`,
      );
    }

    order.previousStatus = order.status;
    order.status = FoodOrderStatus.COMPLETED;
    order.completedAt = new Date();

    return this.orderRepo.save(order);
  }

  /**
   * Huỷ đơn hàng (CCB)
   *
   * CCB Flow - Bước 3:
   * - Nhân viên CCB nhấn "Huỷ" để huỷ đơn hàng
   * - Cập nhật TechRes status: * -> CANCELLED
   * - Gọi platform API để cancel đơn trên merchant (nếu có thể)
   */
  async cancelOrder(orderId: string, reason: string): Promise<FoodOrder> {
    const order = await this.getOrderById(orderId);

    if (order.status === FoodOrderStatus.COMPLETED) {
      throw new BadRequestException('Không thể hủy đơn đã hoàn thành');
    }

    if (order.status === FoodOrderStatus.CANCELLED) {
      return order; // Already cancelled
    }

    const account = await this.accountRepo.findOne({
      where: { id: order.accountId },
    });

    // Gọi platform API để cancel nếu merchant chưa kết thúc (chưa completed/cancelled)
    if (
      account &&
      !this.isMerchantCancelled(order.merchantStatus) &&
      !this.isMerchantCompleted(order.merchantStatus)
    ) {
      try {
        const connector = this.connectorFactory.getConnector(order.platform);
        const result = await connector.cancelOrder(
          account,
          order.externalOrderId,
          reason,
        );

        if (!result.success) {
          this.logger.warn(
            `[CancelOrder] ${order.orderCode}: Platform API failed: ${result.error}`,
          );
        } else {
          this.logger.log(
            `[CancelOrder] ${order.orderCode}: Platform API cancelled successfully`,
          );
        }
      } catch (error: any) {
        this.logger.warn(
          `[CancelOrder] ${order.orderCode}: Platform API error: ${error.message}`,
        );
      }
    }

    order.previousStatus = order.status;
    order.status = FoodOrderStatus.CANCELLED;
    order.cancelledAt = new Date();
    order.cancelReason = reason;

    this.logger.log(
      `[CancelOrder] ${order.orderCode}: TechRes status: ${order.previousStatus} -> CANCELLED, ` +
        `reason: ${reason}`,
    );

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
