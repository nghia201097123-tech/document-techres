import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import axios from 'axios';
import { WorkerManagerService, RawFoodOrder, AccountData } from '../workers/worker-manager.service';
import { FoodOrder, FoodOrderStatus, MerchantOrderStatus } from '../../database/entities/food-order.entity';
import { FoodOrderItem } from '../../database/entities/food-order-item.entity';
import { FoodPlatformAccount, AccountStatus } from '../../database/entities/food-platform-account.entity';

const GRAB_API_URL = process.env.GRAB_API_BASE_URL || 'https://api.grab.com/food/merchant/v3';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(FoodOrder)
    private orderRepo: Repository<FoodOrder>,
    @InjectRepository(FoodOrderItem)
    private orderItemRepo: Repository<FoodOrderItem>,
    @InjectRepository(FoodPlatformAccount)
    private accountRepo: Repository<FoodPlatformAccount>,
    @InjectRedis()
    private redis: Redis,
    private workerManager: WorkerManagerService,
    private dataSource: DataSource,
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
    // ======================================================
    // DEBUG: Log nhận signal từ api-app-food
    // ======================================================
    console.log('');
    console.log('🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔');
    console.log(`🔔 [triggerPoll] RECEIVED SIGNAL from api-app-food`);
    console.log(`🔔 Branch: ${branchId}`);
    console.log(`🔔 Timestamp: ${new Date().toISOString()}`);
    console.log('🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔');
    console.log('');

    this.logger.log(`[triggerPoll] Starting poll for branch ${branchId}`);

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
      this.logger.log(`[triggerPoll] 📡 Calling workers for ${accountData.length} accounts...`);
      const results = await this.workerManager.pollMultipleAccounts(accountData);
      this.logger.log(`[triggerPoll] 📦 Workers returned ${results.length} results`);

      // 5. Process kết quả
      const newOrderIds: string[] = [];
      const accountResults: any[] = [];

      for (const result of results) {
        const account = accounts.find((a) => a.id === result.accountId);
        this.logger.log(
          `[triggerPoll] Processing result for ${result.platform}: success=${result.success}, orders=${result.orders?.length || 0}`,
        );

        if (result.success) {
          // Process orders: fetch detail API + save order & items atomically
          const saved = await this.processOrdersWithDetails(
            result.orders,
            branchId,
            account?.tenantId || '',
            account,
          );
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
   * Map Grab status string to MerchantOrderStatus enum
   * Lưu trực tiếp giá trị từ Grab API
   */
  private mapToMerchantStatus(platformStatus: string): MerchantOrderStatus {
    const statusUpper = platformStatus.toUpperCase();

    // Map trực tiếp các giá trị từ Grab API
    const statusMap: Record<string, MerchantOrderStatus> = {
      // Trạng thái đang xử lý
      ORDER_IN_PREPARE: MerchantOrderStatus.ORDER_IN_PREPARE,

      // Trạng thái đang giao
      ORDER_EXECUTING: MerchantOrderStatus.ORDER_EXECUTING,

      // Trạng thái hoàn tất
      COMPLETED: MerchantOrderStatus.COMPLETED,

      // Các trạng thái huỷ
      CANCELLED: MerchantOrderStatus.CANCELLED,
      CANCELLED_MAX: MerchantOrderStatus.CANCELLED_MAX,
      CANCELLED_PASSENGER: MerchantOrderStatus.CANCELLED_PASSENGER,
      CANCELLED_OPERATOR: MerchantOrderStatus.CANCELLED_OPERATOR,
      FAILED: MerchantOrderStatus.FAILED,
    };

    return statusMap[statusUpper] || MerchantOrderStatus.ORDER_IN_PREPARE;
  }

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

  /**
   * NEW FLOW: Xử lý orders với detail API
   *
   * Flow mới:
   * 1. Với mỗi order từ pagination API
   * 2. Gọi detail API để lấy đầy đủ items
   * 3. Lưu order + items CÙNG LÚC trong 1 transaction
   *
   * Đảm bảo: Order và items luôn được lưu đồng thời, không có trường hợp
   * order có mà items không có hoặc ngược lại.
   */
  private async processOrdersWithDetails(
    orders: RawFoodOrder[],
    branchId: string,
    tenantId: string,
    account: FoodPlatformAccount | undefined,
  ): Promise<{ savedOrders: FoodOrder[]; newOrderIds: string[] }> {
    this.logger.log('═══════════════════════════════════════════════════════════');
    this.logger.log(`[processOrdersWithDetails] 💾 START processing ${orders.length} orders for branch ${branchId}`);

    const savedOrders: FoodOrder[] = [];
    const newOrderIds: string[] = [];
    let skippedCount = 0;

    for (const rawOrder of orders) {
      try {
        this.logger.log(`[processOrdersWithDetails] 📋 Processing order: ${rawOrder.orderCode || rawOrder.externalOrderId}`);

        // STEP 1: Gọi detail API để lấy đầy đủ items trước
        let detailItems: any[] = [];
        let detailSource = 'unknown';

        if (!account) {
          this.logger.warn(`[processOrdersWithDetails] ⚠️ No account for ${rawOrder.orderCode} - SKIP`);
          skippedCount++;
          continue; // Skip order without account
        }

        this.logger.log(`📡 [processOrdersWithDetails] Calling detail API for ${rawOrder.orderCode}...`);
        this.logger.log(`   External Order ID: ${rawOrder.externalOrderId}`);

        // Call detail API with retry
        const detailResponse = await this.callGrabDetailApi(rawOrder.externalOrderId, account.accessToken);

        if (!detailResponse) {
          this.logger.warn(`[processOrdersWithDetails] ⚠️ Detail API FAILED for ${rawOrder.orderCode} - SKIP`);
          this.logger.warn(`   Order will be processed in next poll when detail API succeeds`);
          skippedCount++;
          continue; // Skip order without detail - DO NOT fallback to pagination (no prices!)
        }

        this.logger.log(`✅ [processOrdersWithDetails] Detail API SUCCESS for ${rawOrder.orderCode}`);
        detailItems = this.parseDetailItems(detailResponse);
        detailSource = 'detail_api';

        // Validate items have prices
        const hasValidPrices = detailItems.some((item: any) => item.unitPrice > 0 || item.totalPrice > 0);
        if (!hasValidPrices && detailItems.length > 0) {
          this.logger.warn(`[processOrdersWithDetails] ⚠️ Items have no prices for ${rawOrder.orderCode} - SKIP`);
          this.logger.warn(`   This should not happen if detail API returned correct data`);
          skippedCount++;
          continue; // Skip order if items have no prices
        }

        // Log first item price để verify
        if (detailItems.length > 0) {
          this.logger.log(`   First item: "${detailItems[0].productName}"`);
          this.logger.log(`   First item unitPrice: ${detailItems[0].unitPrice}đ`);
          this.logger.log(`   First item totalPrice: ${detailItems[0].totalPrice}đ`);
        }

        this.logger.log(`📦 [processOrdersWithDetails] Items source: ${detailSource}, count: ${detailItems.length}`);

        // STEP 2: Lưu order + items trong 1 transaction
        const result = await this.saveOrderWithItemsTransaction(
          rawOrder,
          detailItems,
          branchId,
          tenantId,
        );

        if (result.order) {
          savedOrders.push(result.order);
          if (result.isNew) {
            newOrderIds.push(result.order.id);
          }
        }
      } catch (error: any) {
        this.logger.error(`[processOrdersWithDetails] ❌ Error processing order ${rawOrder.orderCode}: ${error.message}`);
        // Continue with next order
      }
    }

    this.logger.log(`[processOrdersWithDetails] 🏁 DONE. Saved: ${savedOrders.length}, New: ${newOrderIds.length}, Skipped: ${skippedCount}`);
    if (skippedCount > 0) {
      this.logger.warn(`[processOrdersWithDetails] ⚠️ ${skippedCount} orders skipped due to detail API failure - will retry in next poll`);
    }
    this.logger.log('═══════════════════════════════════════════════════════════');

    return { savedOrders, newOrderIds };
  }

  /**
   * Lưu order và items trong cùng 1 transaction
   *
   * Đảm bảo tính atomic: Nếu lưu items thất bại thì order cũng rollback
   */
  private async saveOrderWithItemsTransaction(
    rawOrder: RawFoodOrder,
    items: any[],
    branchId: string,
    tenantId: string,
  ): Promise<{ order: FoodOrder | null; isNew: boolean }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check existing order
      const existing = await queryRunner.manager.findOne(FoodOrder, {
        where: {
          externalOrderId: rawOrder.externalOrderId,
          platform: rawOrder.platform as any,
        },
      });

      const newMerchantStatus = this.mapToMerchantStatus(rawOrder.status);
      let order: FoodOrder;
      let isNew = false;

      if (existing) {
        // UPDATE existing order
        order = await this.updateExistingOrder(queryRunner, existing, rawOrder, items, newMerchantStatus);
        this.logger.log(`[saveOrderWithItemsTransaction] ✅ Updated order ${order.orderCode}`);
      } else {
        // CREATE new order
        order = await this.createNewOrder(queryRunner, rawOrder, items, branchId, tenantId, newMerchantStatus);
        isNew = true;
        this.logger.log(`[saveOrderWithItemsTransaction] ✅ Created order ${order.orderCode}`);
      }

      // Save items trong cùng transaction
      if (items.length > 0) {
        await this.saveItemsInTransaction(queryRunner, order.id, items);
        this.logger.log(`[saveOrderWithItemsTransaction] ✅ Saved ${items.length} items for order ${order.orderCode}`);
      }

      // Commit transaction
      await queryRunner.commitTransaction();
      this.logger.log(`[saveOrderWithItemsTransaction] 🎉 Transaction committed for ${order.orderCode}`);

      return { order, isNew };
    } catch (error: any) {
      // Rollback on error
      await queryRunner.rollbackTransaction();
      this.logger.error(`[saveOrderWithItemsTransaction] ❌ Transaction rolled back: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update existing order trong transaction
   */
  private async updateExistingOrder(
    queryRunner: any,
    existing: FoodOrder,
    rawOrder: RawFoodOrder,
    items: any[],
    newMerchantStatus: MerchantOrderStatus,
  ): Promise<FoodOrder> {
    const oldMerchantStatus = existing.merchantStatus;

    // Update merchantStatus
    if (oldMerchantStatus !== newMerchantStatus) {
      existing.previousMerchantStatus = oldMerchantStatus;
      existing.merchantStatus = newMerchantStatus;
      this.logger.log(`[updateExistingOrder] Merchant status: ${oldMerchantStatus} -> ${newMerchantStatus}`);
    }

    // Auto-sync TechRes status
    if (existing.status === FoodOrderStatus.CONFIRMED) {
      if (this.isMerchantCompleted(newMerchantStatus)) {
        existing.previousStatus = existing.status;
        existing.status = FoodOrderStatus.COMPLETED;
        existing.completedAt = new Date();
        this.logger.log(`[updateExistingOrder] Auto-complete TechRes order`);
      } else if (this.isMerchantCancelled(newMerchantStatus)) {
        existing.previousStatus = existing.status;
        existing.status = FoodOrderStatus.CANCELLED;
        existing.cancelledAt = new Date();
        this.logger.log(`[updateExistingOrder] Auto-cancel TechRes order`);
      }
    }

    // Update driver info
    if (rawOrder.driverName) existing.driverName = rawOrder.driverName;
    if (rawOrder.driverPhone) existing.driverPhone = rawOrder.driverPhone;
    if (rawOrder.driverAvatar) existing.driverAvatar = rawOrder.driverAvatar;

    // Update customer info if missing
    if (rawOrder.customerPhone && !existing.customerPhone) existing.customerPhone = rawOrder.customerPhone;
    if (rawOrder.customerAddress && !existing.customerAddress) existing.customerAddress = rawOrder.customerAddress;
    if (rawOrder.customerNote && !existing.customerNote) existing.customerNote = rawOrder.customerNote;

    // Update items in order entity
    existing.items = items;
    existing.lastSyncAt = new Date();

    return await queryRunner.manager.save(FoodOrder, existing);
  }

  /**
   * Create new order trong transaction
   */
  private async createNewOrder(
    queryRunner: any,
    rawOrder: RawFoodOrder,
    items: any[],
    branchId: string,
    tenantId: string,
    newMerchantStatus: MerchantOrderStatus,
  ): Promise<FoodOrder> {
    // Determine initial TechRes status
    let initialTechResStatus = FoodOrderStatus.NEW;
    if (this.isMerchantCompleted(newMerchantStatus)) {
      initialTechResStatus = FoodOrderStatus.COMPLETED;
    } else if (this.isMerchantCancelled(newMerchantStatus)) {
      initialTechResStatus = FoodOrderStatus.CANCELLED;
    }

    const newOrder = queryRunner.manager.create(FoodOrder, {
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
      items: items, // Items đã được enrich từ detail API
      subtotal: rawOrder.subtotal,
      deliveryFee: rawOrder.deliveryFee,
      platformFee: rawOrder.platformFee,
      discount: rawOrder.discount,
      totalAmount: rawOrder.totalAmount,
      smallOrderFee: rawOrder.smallOrderFee || 0,
      itemDiscountAmount: rawOrder.itemDiscountAmount || 0,
      promotionAmount: rawOrder.promotionAmount || 0,
      isPaid: rawOrder.isPaid,
      paymentMethod: rawOrder.paymentMethod || '',
      driverName: rawOrder.driverName || null,
      driverPhone: rawOrder.driverPhone || null,
      driverAvatar: rawOrder.driverAvatar || null,
      driverLicensePlate: rawOrder.driverLicensePlate || null,
      estimatedDeliveryTime: rawOrder.estimatedDeliveryTime || null,
      isScheduledOrder: rawOrder.isScheduledOrder || false,
      scheduledDeliveryTime: rawOrder.scheduledDeliveryTime || null,
      isCombinedOrder: rawOrder.isCombinedOrder || false,
      parentOrderId: rawOrder.parentOrderId || null,
      platformCreatedAt: rawOrder.createdAt,
    });

    return await queryRunner.manager.save(FoodOrder, newOrder);
  }

  /**
   * Save items trong transaction
   */
  private async saveItemsInTransaction(
    queryRunner: any,
    orderId: string,
    items: any[],
  ): Promise<void> {
    // Delete existing items first
    await queryRunner.manager.delete(FoodOrderItem, { orderId });

    // Create new items
    const orderItems = items.map((item, index) => {
      const modifiers = this.transformModifiers(item.modifierGroups);

      return queryRunner.manager.create(FoodOrderItem, {
        orderId,
        externalProductId: item.externalProductId || item.id || null,
        productName: item.productName || item.name || 'Unknown',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || item.price || 0,
        totalPrice: item.totalPrice || (item.quantity || 1) * (item.unitPrice || item.price || 0),
        discountAmount: item.discountAmount || 0,
        note: item.note || item.specialInstruction || item.comment || null,
        options: typeof item.options === 'string' ? item.options : null,
        modifiers,
        sortOrder: index,
      });
    });

    await queryRunner.manager.save(FoodOrderItem, orderItems);
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
    this.logger.log('═══════════════════════════════════════════════════════════');
    this.logger.log(`[saveOrders] 💾 START saving ${orders.length} orders for branch ${branchId}`);

    const savedOrders: FoodOrder[] = [];
    const newOrderIds: string[] = [];

    for (const rawOrder of orders) {
      this.logger.log(`[saveOrders] 📋 Processing order: ${rawOrder.orderCode || rawOrder.externalOrderId}`);
      this.logger.log(`[saveOrders]   Items count: ${rawOrder.items?.length || 0}`);

      // Log first item details
      if (rawOrder.items && rawOrder.items.length > 0) {
        const firstItem = rawOrder.items[0];
        this.logger.log(
          `[saveOrders]   First item: "${firstItem.productName || firstItem.name}", ` +
            `price: ${firstItem.unitPrice || 0}, note: "${firstItem.note || ''}", ` +
            `options: "${firstItem.options || ''}", modifierGroups: ${firstItem.modifierGroups?.length || 0}`,
        );
      }

      const existing = await this.orderRepo.findOne({
        where: {
          externalOrderId: rawOrder.externalOrderId,
          platform: rawOrder.platform as any,
        },
      });

      // Map platform status to MerchantOrderStatus
      const newMerchantStatus = this.mapToMerchantStatus(rawOrder.status);
      this.logger.log(`[saveOrders]   Existing: ${existing ? 'YES' : 'NO'}, Status: ${newMerchantStatus}`);

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
        // 2. Merchant status = COMPLETED hoặc một trong các trạng thái huỷ
        if (existing.status === FoodOrderStatus.CONFIRMED) {
          if (this.isMerchantCompleted(newMerchantStatus)) {
            existing.previousStatus = existing.status;
            existing.status = FoodOrderStatus.COMPLETED;
            existing.completedAt = new Date();

            this.logger.log(
              `[saveOrders] Auto-complete TechRes order ${existing.orderCode} ` +
                `(merchant status: ${newMerchantStatus})`,
            );
          } else if (this.isMerchantCancelled(newMerchantStatus)) {
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

        // NOTE: Items sẽ được lưu ở Step 2 (fetchAndSaveOrderDetails)
        // Ở đây chỉ update basic info cho order
        if (rawOrder.items && rawOrder.items.length > 0) {
          // Chỉ update items trong order entity (không lưu vào food_order_items ở đây)
          existing.items = rawOrder.items;
          this.logger.log(`[saveOrders]   Basic items count: ${rawOrder.items.length} (will be updated in Step 2)`);
        }

        existing.lastSyncAt = new Date();
        await this.orderRepo.save(existing);
        savedOrders.push(existing);
        this.logger.log(`[saveOrders] ✅ Updated existing order ${existing.orderCode}`);
      } else {
        // Create new order
        // TechRes status: luôn bắt đầu với NEW (chờ CCB xác nhận)
        // Merchant status: lấy từ platform
        let initialTechResStatus = FoodOrderStatus.NEW;

        // Ngoại lệ: nếu platform đã completed/cancelled thì TechRes cũng set luôn
        if (this.isMerchantCompleted(newMerchantStatus)) {
          initialTechResStatus = FoodOrderStatus.COMPLETED;
          this.logger.log(
            `[saveOrders] New order ${rawOrder.orderCode} already COMPLETED on platform`,
          );
        } else if (this.isMerchantCancelled(newMerchantStatus)) {
          initialTechResStatus = FoodOrderStatus.CANCELLED;
          this.logger.log(
            `[saveOrders] New order ${rawOrder.orderCode} already CANCELLED on platform (${newMerchantStatus})`,
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
          // Additional fee fields
          smallOrderFee: rawOrder.smallOrderFee || 0,
          itemDiscountAmount: rawOrder.itemDiscountAmount || 0,
          promotionAmount: rawOrder.promotionAmount || 0,
          isPaid: rawOrder.isPaid,
          paymentMethod: rawOrder.paymentMethod || '',
          driverName: rawOrder.driverName || null,
          driverPhone: rawOrder.driverPhone || null,
          driverAvatar: rawOrder.driverAvatar || null,
          driverLicensePlate: rawOrder.driverLicensePlate || null,
          estimatedDeliveryTime: rawOrder.estimatedDeliveryTime || null,
          // Scheduled order
          isScheduledOrder: rawOrder.isScheduledOrder || false,
          scheduledDeliveryTime: rawOrder.scheduledDeliveryTime || null,
          // Combined order
          isCombinedOrder: rawOrder.isCombinedOrder || false,
          parentOrderId: rawOrder.parentOrderId || null,
          platformCreatedAt: rawOrder.createdAt,
        });

        const saved = await this.orderRepo.save(newOrder);
        savedOrders.push(saved);
        newOrderIds.push(saved.id);
        this.logger.log(`[saveOrders] ✅ Created new order in DB: ${saved.orderCode}, ID: ${saved.id}`);

        // NOTE: Items sẽ được lưu ở Step 2 (fetchAndSaveOrderDetails)
        // Ở đây chỉ log basic items count
        this.logger.log(
          `[saveOrders] 🎉 NEW ORDER CREATED: ${saved.orderCode} ` +
            `(TechRes: ${initialTechResStatus}, Merchant: ${newMerchantStatus}, Basic items: ${rawOrder.items?.length || 0})`,
        );
        this.logger.log(`[saveOrders]   Items will be saved in Step 2 from detail API`);
      }
    }

    this.logger.log(`[saveOrders] 🏁 DONE saving orders. Total: ${savedOrders.length}, New: ${newOrderIds.length}`);
    this.logger.log('═══════════════════════════════════════════════════════════');

    return { savedOrders, newOrderIds };
  }

  /**
   * STEP 2: Gọi detail API và lưu items vào food_order_items
   *
   * Xử lý tuần tự từng đơn hàng để tránh rate limit
   * Có retry logic khi gọi API thất bại
   */
  private async fetchAndSaveOrderDetails(
    orders: FoodOrder[],
    account: FoodPlatformAccount,
  ): Promise<void> {
    console.log('');
    console.log('🚀🚀🚀 [fetchAndSaveOrderDetails] START 🚀🚀🚀');
    console.log(`   Orders to fetch: ${orders.length}`);
    console.log(`   Account: ${account.platform} - ${account.id}`);

    for (const order of orders) {
      try {
        console.log(`   📡 Fetching detail for ${order.orderCode} (${order.externalOrderId})...`);

        // Gọi detail API với retry
        const detailResponse = await this.callGrabDetailApi(order.externalOrderId, account.accessToken);

        if (!detailResponse) {
          console.log(`   ⚠️ No detail data for ${order.orderCode}`);
          continue;
        }

        console.log(`   ✅ Got detail response for ${order.orderCode}`);

        // Parse items từ detail response
        const items = this.parseDetailItems(detailResponse);
        console.log(`   📦 Parsed ${items.length} items from detail API`);

        if (items.length > 0) {
          // Log first item for debugging
          const firstItem = items[0];
          console.log(`   🍔 First item: "${firstItem.productName}"`);
          console.log(`      - unitPrice: ${firstItem.unitPrice}`);
          console.log(`      - totalPrice: ${firstItem.totalPrice}`);
          console.log(`      - note: "${firstItem.note || ''}"`);
          console.log(`      - options: "${firstItem.options || ''}"`);

          // Lưu items vào food_order_items
          await this.saveOrderItems(order.id, items);
          console.log(`   💾 Saved ${items.length} items to food_order_items`);

          // Update items trong order entity
          order.items = items;
          await this.orderRepo.save(order);
          console.log(`   ✅ Updated order entity with items`);
        } else {
          console.log(`   ⚠️ No items parsed for ${order.orderCode}`);
        }
      } catch (error: any) {
        console.log(`   ❌ Error processing ${order.orderCode}: ${error.message}`);
        // Continue with next order
      }
    }

    console.log('🏁🏁🏁 [fetchAndSaveOrderDetails] DONE 🏁🏁🏁');
    console.log('');
  }

  /**
   * Gọi Grab detail API với retry logic
   */
  private async callGrabDetailApi(orderId: string, accessToken: string, maxRetries = 3): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`[callGrabDetailApi] Attempt ${attempt}/${maxRetries} for order ${orderId}`);

        const response = await axios.get(`${GRAB_API_URL}/orders/${orderId}`, {
          headers: {
            Authorization: accessToken,
            Accept: '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            Connection: 'keep-alive',
          },
          timeout: 30000,
        });

        this.logger.log(`[callGrabDetailApi] ✅ Success for order ${orderId}, status: ${response.status}`);
        return response.data;
      } catch (error: any) {
        const status = error.response?.status;
        const errorData = error.response?.data;

        this.logger.warn(
          `[callGrabDetailApi] Attempt ${attempt}/${maxRetries} failed for order ${orderId}`,
        );
        this.logger.warn(`   Status: ${status || 'N/A'}`);
        this.logger.warn(`   Message: ${error.message}`);
        if (errorData) {
          this.logger.warn(`   Response: ${JSON.stringify(errorData).substring(0, 200)}`);
        }

        // Check for specific error types
        if (status === 401) {
          this.logger.error(`[callGrabDetailApi] ❌ Token expired/invalid for order ${orderId}`);
          return null; // Don't retry on auth errors
        }

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          this.logger.log(`[callGrabDetailApi] Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          this.logger.error(`[callGrabDetailApi] ❌ All ${maxRetries} attempts failed for order ${orderId}`);
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Parse items từ Grab detail API response
   *
   * Grab API item structure:
   * - fare.originalItemPriceDisplay: Giá bán gốc (unit price) - VD: "59.000"
   * - fare.priceDisplay: Tổng thành tiền (total price = unit price * quantity + options) - VD: "64.000"
   * - comment: Ghi chú của khách
   * - modifierGroups[].modifiers[].priceDisplay: Giá option - VD: "5.000"
   * - discountInfo[].itemDiscountPriceDisplay: Tiền giảm giá
   */
  private parseDetailItems(detailData: any): any[] {
    // Grab order detail structure: detailData.order.itemInfo.items
    const orderData = detailData.order || detailData;
    const rawItems = orderData.itemInfo?.items || orderData.items || [];

    this.logger.log(`[parseDetailItems] Parsing ${rawItems.length} items from detail API`);

    return rawItems.map((item: any, index: number) => {
      const quantity = item.quantity || 1;

      // Unit price từ fare.originalItemPriceDisplay (giá bán gốc)
      const unitPrice = this.parseCurrency(item.fare?.originalItemPriceDisplay);
      // Total price từ fare.priceDisplay (tổng thành tiền bao gồm options)
      const totalPrice = this.parseCurrency(item.fare?.priceDisplay);

      // Parse discounts
      const discounts = (item.discountInfo || []).map((d: any) => ({
        discountName: d.discountName,
        discountFunding: d.discountFunding,
        discountAmount: this.parseCurrency(d.itemDiscountPriceDisplay),
      }));
      const discountAmount = discounts.reduce((sum: number, d: any) => sum + d.discountAmount, 0);

      // Parse modifier groups - Grab API sử dụng modifierGroupID và modifierGroupName
      const modifierGroups = (item.modifierGroups || []).map((group: any) => ({
        groupId: group.modifierGroupID,
        groupName: group.modifierGroupName,
        modifiers: (group.modifiers || []).map((mod: any) => ({
          modifierId: mod.modifierID,
          modifierName: mod.modifierName,
          price: this.parseCurrency(mod.priceDisplay),
        })),
      }));

      // Build options string with prices (e.g., "Trứng ốp la (+5.000đ), Pate thêm (+7.000đ)")
      const optionsString = modifierGroups
        .flatMap((g: any) =>
          g.modifiers.map((m: any) => {
            if (m.price > 0) {
              return `${m.modifierName} (+${m.price.toLocaleString('vi-VN')}đ)`;
            }
            return m.modifierName;
          }),
        )
        .join(', ');

      // Log item for debugging
      this.logger.log(
        `[parseDetailItems] Item ${index + 1}: "${item.name}", qty=${quantity}, ` +
          `unitPrice=${unitPrice}, totalPrice=${totalPrice}, ` +
          `note="${item.comment || ''}", options="${optionsString}", ` +
          `modifierGroups=${modifierGroups.length}, discountAmount=${discountAmount}`,
      );

      return {
        externalProductId: item.itemID || item.id || null,
        productName: item.name || 'Unknown',
        quantity,
        unitPrice,
        totalPrice,
        discountAmount,
        note: item.comment || null, // Grab dùng 'comment' cho ghi chú
        options: optionsString || null,
        modifierGroups,
        discounts,
      };
    });
  }

  /**
   * Parse Vietnamese currency string to number
   * "246.500" -> 246500
   */
  private parseCurrency(value?: string | number): number {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    return parseInt(String(value).replace(/\D/g, ''), 10) || 0;
  }

  /**
   * Save order items to food_order_items table
   * Saves full item data including discounts and modifiers
   */
  private async saveOrderItems(orderId: string, items: any[]): Promise<void> {
    try {
      // Delete existing items for this order (in case of re-sync)
      await this.orderItemRepo.delete({ orderId });

      // Create new items with full data
      const orderItems = items.map((item, index) => {
        const modifiers = this.transformModifiers(item.modifierGroups);

        // Log item details for debugging
        this.logger.log(
          `[saveOrderItems] Item ${index + 1}: ${item.productName || item.name || 'Unknown'}, ` +
            `price: ${item.unitPrice || 0}, note: "${item.note || ''}", ` +
            `options: "${item.options || ''}", modifiers: ${modifiers?.length || 0}`,
        );

        return this.orderItemRepo.create({
          orderId,
          externalProductId: item.externalProductId || item.id || null,
          productName: item.productName || item.name || 'Unknown',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || item.price || 0,
          totalPrice: item.totalPrice || (item.quantity || 1) * (item.unitPrice || item.price || 0),
          discountAmount: item.discountAmount || 0,
          note: item.note || item.specialInstruction || item.comment || null,
          options: typeof item.options === 'string' ? item.options : null,
          modifiers,
          sortOrder: index,
        });
      });

      await this.orderItemRepo.save(orderItems);
      this.logger.log(`[saveOrderItems] ✅ Saved ${orderItems.length} items for order ${orderId}`);
    } catch (error: any) {
      this.logger.error(`[saveOrderItems] ❌ Failed to save items for order ${orderId}: ${error.message}`);
    }
  }

  /**
   * Transform modifierGroups to ModifierInfo[] for storage
   */
  private transformModifiers(modifierGroups: any[] | undefined): any[] | null {
    if (!modifierGroups || modifierGroups.length === 0) return null;

    const modifiers: any[] = [];
    for (const group of modifierGroups) {
      for (const mod of group.modifiers || []) {
        modifiers.push({
          groupName: group.groupName,
          modifierName: mod.modifierName,
          price: mod.price || 0,
        });
      }
    }
    return modifiers.length > 0 ? modifiers : null;
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

    const channel = `new-orders:branch:${branchId}`;
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
