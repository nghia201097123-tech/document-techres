import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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
  ) {}

  /**
   * Poll orders for a branch
   * CCB calls this endpoint every 5 seconds
   */
  async pollOrders(query: PollOrdersQueryDto): Promise<PollResponseDto> {
    const startTime = Date.now();
    const errors: { accountId: string; platform: string; message: string }[] = [];

    // 1. Get store mappings for this branch
    const mappings = await this.storesService.getActiveMappingsForBranch(
      query.branchId,
    );

    if (mappings.length === 0) {
      return {
        success: true,
        newOrders: [],
        updatedOrders: [],
        meta: {
          pollTimestamp: Date.now(),
          accountsPolled: 0,
          totalOrdersFetched: 0,
          processingTimeMs: Date.now() - startTime,
        },
        errors: [],
      };
    }

    // 2. Poll orders from each mapped store in parallel
    const sinceDate = query.lastPollAt ? new Date(query.lastPollAt) : undefined;

    const pollResults = await Promise.allSettled(
      mappings.map((mapping) => this.pollFromStore(mapping, sinceDate)),
    );

    // 3. Collect all orders and errors
    const allOrders: RawFoodOrder[] = [];

    pollResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allOrders.push(...result.value);
      } else {
        const mapping = mappings[index];
        errors.push({
          accountId: mapping.accountId,
          platform: mapping.account?.platform || 'unknown',
          message: result.reason?.message || 'Unknown error',
        });
      }
    });

    // 4. Sync orders to database
    const { newOrders, updatedOrders } = await this.syncOrdersToDb(
      allOrders,
      query.branchId,
      mappings,
    );

    // 5. Auto-confirm orders with drivers (if enabled)
    await this.processAutoConfirm(newOrders.concat(updatedOrders));

    return {
      success: true,
      newOrders,
      updatedOrders,
      meta: {
        pollTimestamp: Date.now(),
        accountsPolled: mappings.length,
        totalOrdersFetched: allOrders.length,
        processingTimeMs: Date.now() - startTime,
      },
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Poll orders from a specific store
   */
  private async pollFromStore(
    mapping: FoodPlatformStoreMapping,
    since?: Date,
  ): Promise<RawFoodOrder[]> {
    const account = mapping.account;

    if (!account || account.status !== 'connected' || !account.isActive) {
      return [];
    }

    // Refresh token if needed
    await this.accountsService.refreshTokenIfNeeded(account);

    // Get connector and poll
    const connector = this.connectorFactory.getConnector(account.platform);
    const orders = await connector.pollOrders(account, mapping.externalStoreId, since);

    // Enrich ALL orders with detail API to get full customer info, driver phone, etc.
    // Pagination API doesn't return these fields
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        // Always fetch detail to get customer_phone, customer_note, driver_phone, driver_avatar
        // Only skip if we already have full data (customer_phone is the indicator)
        const needsEnrichment = !order.customerPhone || !order.driverPhone;

        if (needsEnrichment && connector.fetchOrderDetail) {
          try {
            const detailOrder = await connector.fetchOrderDetail(
              account,
              order.externalOrderId,
              order.orderCode,
            );
            if (detailOrder) {
              this.logger.log(`Enriched order ${order.orderCode} with detail data`);
              // Merge detail data into order
              return {
                ...order,
                customerPhone: detailOrder.customerPhone || order.customerPhone,
                customerAddress: detailOrder.customerAddress || order.customerAddress,
                customerNote: detailOrder.customerNote || order.customerNote,
                driverPhone: detailOrder.driverPhone || order.driverPhone,
                driverAvatar: detailOrder.driverAvatar || order.driverAvatar,
                driverLicensePlate: detailOrder.driverLicensePlate || order.driverLicensePlate,
                items: detailOrder.items?.length > 0 ? detailOrder.items : order.items,
              };
            }
          } catch (error) {
            this.logger.warn(`Failed to fetch order detail for ${order.orderCode}: ${error.message}`);
          }
        }
        return order;
      }),
    );

    return enrichedOrders;
  }

  /**
   * Sync orders to database
   */
  private async syncOrdersToDb(
    rawOrders: RawFoodOrder[],
    branchId: string,
    mappings: FoodPlatformStoreMapping[],
  ): Promise<{ newOrders: FoodOrder[]; updatedOrders: FoodOrder[] }> {
    const newOrders: FoodOrder[] = [];
    const updatedOrders: FoodOrder[] = [];

    for (const rawOrder of rawOrders) {
      // Find mapping for this order's platform
      const mapping = mappings.find(
        (m) => m.account?.platform === rawOrder.platform,
      );

      if (!mapping) continue;

      // Check if order exists
      const existingOrder = await this.orderRepo.findOne({
        where: {
          externalOrderId: rawOrder.externalOrderId,
          platform: rawOrder.platform,
        },
      });

      if (existingOrder) {
        // Update existing order
        const hasChanges = this.detectChanges(existingOrder, rawOrder);

        if (hasChanges) {
          existingOrder.previousStatus = existingOrder.status;
          existingOrder.status = rawOrder.status as FoodOrderStatus;
          // Update customer info if available
          existingOrder.customerPhone = rawOrder.customerPhone || existingOrder.customerPhone;
          existingOrder.customerAddress = rawOrder.customerAddress || existingOrder.customerAddress;
          existingOrder.customerNote = rawOrder.customerNote || existingOrder.customerNote;
          // Update driver info
          existingOrder.driverName = rawOrder.driverName ?? existingOrder.driverName;
          existingOrder.driverPhone = rawOrder.driverPhone ?? existingOrder.driverPhone;
          existingOrder.driverAvatar = rawOrder.driverAvatar ?? existingOrder.driverAvatar;
          existingOrder.driverLicensePlate = rawOrder.driverLicensePlate ?? existingOrder.driverLicensePlate;
          existingOrder.estimatedDeliveryTime = rawOrder.estimatedDeliveryTime ?? existingOrder.estimatedDeliveryTime;
          existingOrder.platformUpdatedAt = rawOrder.updatedAt;
          existingOrder.lastSyncAt = new Date();
          existingOrder.rawData = rawOrder.rawData ?? null;

          await this.orderRepo.save(existingOrder);
          updatedOrders.push(existingOrder);
        }
      } else {
        // Create new order
        const newOrder = this.orderRepo.create({
          tenantId: mapping.tenantId,
          branchId,
          externalOrderId: rawOrder.externalOrderId,
          orderCode: rawOrder.orderCode,
          platform: rawOrder.platform,
          status: rawOrder.status as FoodOrderStatus,

          customerName: rawOrder.customerName,
          customerPhone: rawOrder.customerPhone,
          customerAddress: rawOrder.customerAddress,
          customerNote: rawOrder.customerNote,

          items: rawOrder.items, // Keep JSONB for backward compatibility

          subtotal: rawOrder.subtotal,
          deliveryFee: rawOrder.deliveryFee,
          platformFee: rawOrder.platformFee,
          discount: rawOrder.discount,
          totalAmount: rawOrder.totalAmount,

          isPaid: rawOrder.isPaid,
          paymentMethod: rawOrder.paymentMethod,

          driverName: rawOrder.driverName,
          driverPhone: rawOrder.driverPhone,
          driverAvatar: rawOrder.driverAvatar,
          driverLicensePlate: rawOrder.driverLicensePlate,
          estimatedDeliveryTime: rawOrder.estimatedDeliveryTime,

          platformCreatedAt: rawOrder.createdAt,
          platformUpdatedAt: rawOrder.updatedAt,
          lastSyncAt: new Date(),

          accountId: mapping.accountId,
          storeMappingId: mapping.id,
          rawData: rawOrder.rawData,
        });

        await this.orderRepo.save(newOrder);

        // Save items to separate table
        await this.saveOrderItems(newOrder.id, rawOrder.items);

        newOrders.push(newOrder);
      }
    }

    return { newOrders, updatedOrders };
  }

  /**
   * Save order items to the food_order_items table
   */
  private async saveOrderItems(
    orderId: string,
    items: RawFoodOrderItem[],
  ): Promise<void> {
    if (!items || items.length === 0) return;

    const orderItems = items.map((item, index) =>
      this.orderItemRepo.create({
        orderId,
        productName: item.productName,
        externalProductId: item.externalProductId || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        discountAmount: item.discountAmount || 0,
        note: item.note || null,
        options: item.options || null,
        modifiers: item.modifiers || null,
        techresProductId: item.techresProductId || null,
        status: FoodOrderItemStatus.PENDING,
        sortOrder: index,
      }),
    );

    await this.orderItemRepo.save(orderItems);
  }

  /**
   * Detect changes between existing order and raw order
   */
  private detectChanges(existing: FoodOrder, raw: RawFoodOrder): boolean {
    return (
      existing.status !== raw.status ||
      existing.driverName !== raw.driverName ||
      existing.driverPhone !== raw.driverPhone ||
      existing.driverAvatar !== raw.driverAvatar ||
      // Update if we now have customer info that was missing before
      (!existing.customerPhone && raw.customerPhone) ||
      (!existing.customerNote && raw.customerNote)
    );
  }

  /**
   * Process auto-confirm for orders with drivers
   */
  private async processAutoConfirm(orders: FoodOrder[]): Promise<void> {
    for (const order of orders) {
      // Check if order has driver and is not yet accepted
      if (
        order.driverName &&
        order.status === FoodOrderStatus.NEW &&
        !order.isAutoConfirmed
      ) {
        // Get account to check auto-confirm setting
        const account = await this.accountRepo.findOne({
          where: { id: order.accountId },
        });

        if (account?.autoConfirmEnabled) {
          try {
            await this.acceptOrder(order.id);
            this.logger.log(`Auto-confirmed order ${order.orderCode}`);
          } catch (error) {
            this.logger.error(
              `Failed to auto-confirm order ${order.orderCode}`,
              error,
            );
          }
        }
      }
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
