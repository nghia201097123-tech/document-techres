import { Controller, Get, Post, Body, Param, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FoodPlatformAccount, FoodPlatformStoreMapping, FoodPlatformExternalItem, FoodPlatformItemMapping, FoodOrder, FoodOrderItemEntity, FoodOrderStatus, AccountStatus } from '../../database/entities';
import { AccountsService } from '../accounts/accounts.service';
import { OrdersService } from '../orders/orders.service';

@ApiTags('public')
@Controller('public')
export class PublicController {
  private readonly logger = new Logger(PublicController.name);

  constructor(
    @InjectRepository(FoodPlatformAccount)
    private readonly accountRepo: Repository<FoodPlatformAccount>,
    @InjectRepository(FoodPlatformStoreMapping)
    private readonly storeMappingRepo: Repository<FoodPlatformStoreMapping>,
    @InjectRepository(FoodPlatformExternalItem)
    private readonly externalItemRepo: Repository<FoodPlatformExternalItem>,
    @InjectRepository(FoodPlatformItemMapping)
    private readonly itemMappingRepo: Repository<FoodPlatformItemMapping>,
    @InjectRepository(FoodOrder)
    private readonly orderRepo: Repository<FoodOrder>,
    @InjectRepository(FoodOrderItemEntity)
    private readonly orderItemRepo: Repository<FoodOrderItemEntity>,
    private readonly accountsService: AccountsService,
    private readonly ordersService: OrdersService,
  ) {}

  @Get('health-check')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Ok' },
        data: { type: 'null', example: null },
      },
    },
  })
  healthCheck() {
    return {
      status: 200,
      message: 'Ok',
      data: null,
    };
  }

  /**
   * Get food platform accounts for sync to CCB offline
   * Returns: accounts linked to this branch (via food_platform_accounts.branchId)
   */
  @Get('sync/food-platform/:branchId')
  @ApiOperation({ summary: 'Get food platform accounts for sync to CCB offline' })
  @ApiParam({ name: 'branchId', description: 'Branch ID' })
  @ApiResponse({ status: 200, description: 'Food platform sync data' })
  async getFoodPlatformSync(@Param('branchId') branchId: string) {
    this.logger.log(`[getFoodPlatformSync] branchId=${branchId}`);

    try {
      // Get accounts with this branchId
      const accounts = await this.accountRepo.find({
        where: {
          branchId: branchId,
          isActive: true,
        },
      });

      // Filter to only CONNECTED and DISCONNECTED accounts
      const validAccounts = accounts.filter(
        account => account.status === AccountStatus.CONNECTED || account.status === AccountStatus.DISCONNECTED
      );

      this.logger.log(`[getFoodPlatformSync] Found ${validAccounts.length} accounts for branch ${branchId}`);

      // Format response
      const formattedAccounts = validAccounts.map(account => ({
        account: {
          id: account.id,
          tenantId: account.tenantId,
          platform: account.platform,
          displayName: account.displayName,
          username: account.username,
          status: account.status,
          externalMerchantId: account.externalMerchantId,
          externalMerchantName: account.externalMerchantName,
          isActive: account.isActive,
          lastError: account.lastError,
          errorCount: account.errorCount,
        },
        storeMappings: [],
      }));

      return {
        status: 200,
        message: 'Ok',
        data: {
          accounts: formattedAccounts,
          itemMappings: [],
          syncedAt: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      this.logger.error(`[getFoodPlatformSync] Error: ${error.message}`);
      return {
        status: 500,
        message: error.message,
        data: null,
      };
    }
  }

  /**
   * Get food platform config by tenant
   */
  @Get('sync/food-platform')
  @ApiOperation({ summary: 'Get food platform config by tenant for sync' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiResponse({ status: 200, description: 'Food platform sync data' })
  async getFoodPlatformSyncByTenant(@Query('tenantId') tenantId: string) {
    this.logger.log(`[getFoodPlatformSyncByTenant] tenantId=${tenantId}`);

    try {
      // Get all connected accounts for this tenant
      const accounts = await this.accountRepo.find({
        where: { tenantId, status: AccountStatus.CONNECTED, isActive: true },
      });

      // Get store mappings for each account
      const accountsWithMappings = [];
      for (const account of accounts) {
        const mappings = await this.storeMappingRepo.find({
          where: { accountId: account.id, isActive: true },
        });
        accountsWithMappings.push({
          account: {
            id: account.id,
            tenantId: account.tenantId,
            branchId: account.branchId,
            platform: account.platform,
            displayName: account.displayName,
            status: account.status,
            username: account.username,
            externalMerchantId: account.externalMerchantId,
            externalMerchantName: account.externalMerchantName,
            isActive: account.isActive,
          },
          storeMappings: mappings.map(m => ({
            id: m.id,
            externalStoreId: m.externalStoreId,
            externalStoreName: m.externalStoreName,
            externalStoreAddress: m.externalStoreAddress,
            branchId: m.branchId,
            branchName: m.branchName,
            isActive: m.isActive,
          })),
        });
      }

      // Get item mappings for all accounts
      const accountIds = accounts.map(a => a.id);
      const itemMappings = accountIds.length > 0
        ? await this.itemMappingRepo
            .createQueryBuilder('m')
            .where('m.accountId IN (:...accountIds)', { accountIds })
            .andWhere('m.isActive = :isActive', { isActive: true })
            .getMany()
        : [];

      this.logger.log(`[getFoodPlatformSyncByTenant] Found ${accountsWithMappings.length} accounts, ${itemMappings.length} item mappings`);

      return {
        status: 200,
        message: 'Ok',
        data: {
          accounts: accountsWithMappings,
          itemMappings: itemMappings.map(m => ({
            id: m.id,
            accountId: m.accountId,
            externalItemId: m.externalItemId,
            externalPlatformItemId: m.externalPlatformItemId,
            externalItemName: m.externalItemName,
            techresBrandId: m.techresBrandId,
            techresItemId: m.techresItemId,
            techresItemName: m.techresItemName,
            mappingType: m.mappingType,
          })),
          syncedAt: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      this.logger.error(`[getFoodPlatformSyncByTenant] Error: ${error.message}`);
      return {
        status: 500,
        message: error.message,
        data: null,
      };
    }
  }

  /**
   * Reconnect a disconnected food platform account
   * Called by CCB offline app when it detects a disconnected account
   */
  @Post('reconnect/:accountId')
  @ApiOperation({ summary: 'Reconnect a disconnected food platform account' })
  @ApiParam({ name: 'accountId', description: 'Account ID to reconnect' })
  @ApiResponse({ status: 200, description: 'Reconnect result' })
  async reconnectAccount(@Param('accountId') accountId: string) {
    this.logger.log(`[reconnectAccount] Attempting to reconnect account ${accountId}`);

    try {
      // Check if account exists and is disconnected
      const account = await this.accountRepo.findOne({ where: { id: accountId } });
      if (!account) {
        return {
          status: 404,
          message: 'Không tìm thấy tài khoản',
          data: null,
        };
      }

      if (account.status === AccountStatus.CONNECTED) {
        this.logger.log(`[reconnectAccount] Account ${accountId} is already connected`);
        return {
          status: 200,
          message: 'Tài khoản đã được kết nối',
          data: {
            accountId: account.id,
            status: account.status,
            reconnected: false,
          },
        };
      }

      // Attempt to reconnect using stored credentials
      const reconnectedAccount = await this.accountsService.reconnect(accountId);

      this.logger.log(`[reconnectAccount] Successfully reconnected account ${accountId}`);
      return {
        status: 200,
        message: 'Kết nối lại thành công',
        data: {
          accountId: reconnectedAccount.id,
          status: reconnectedAccount.status,
          reconnected: true,
        },
      };
    } catch (error: any) {
      this.logger.error(`[reconnectAccount] Failed to reconnect account ${accountId}: ${error.message}`);
      return {
        status: 400,
        message: error.message || 'Không thể kết nối lại',
        data: {
          accountId,
          reconnected: false,
          error: error.message,
        },
      };
    }
  }

  /**
   * Xác nhận đơn hàng (CCB)
   * App gọi API này khi nhân viên nhấn "Xác nhận"
   */
  @Post('confirm-order/:orderId')
  @ApiOperation({ summary: 'Xác nhận đơn hàng' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Xác nhận thành công' })
  async confirmOrder(@Param('orderId') orderId: string) {
    this.logger.log(`[confirmOrder] orderId=${orderId}`);

    try {
      const order = await this.ordersService.confirmOrder(orderId);

      this.logger.log(`[confirmOrder] Order ${order.orderCode} confirmed successfully, status=${order.status}`);

      return {
        status: 200,
        message: 'Xác nhận đơn hàng thành công',
        data: {
          id: order.id,
          orderCode: order.orderCode,
          status: order.status,
          merchantStatus: order.merchantStatus,
          confirmedAt: order.confirmedAt,
        },
      };
    } catch (error: any) {
      this.logger.error(`[confirmOrder] Error: ${error.message}`);
      return {
        status: 400,
        message: error.message || 'Không thể xác nhận đơn hàng',
        data: null,
      };
    }
  }

  /**
   * Huỷ đơn hàng (CCB)
   * App gọi API này khi nhân viên nhấn "Huỷ"
   */
  @Post('cancel-order/:orderId')
  @ApiOperation({ summary: 'Huỷ đơn hàng' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiBody({ schema: { type: 'object', properties: { reason: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Huỷ thành công' })
  async cancelOrder(
    @Param('orderId') orderId: string,
    @Body() body: { reason?: string },
  ) {
    this.logger.log(`[cancelOrder] orderId=${orderId}, reason=${body.reason}`);

    try {
      const order = await this.ordersService.cancelOrder(orderId, body.reason || 'Huỷ bởi nhân viên');

      this.logger.log(`[cancelOrder] Order ${order.orderCode} cancelled successfully`);

      return {
        status: 200,
        message: 'Huỷ đơn hàng thành công',
        data: {
          id: order.id,
          orderCode: order.orderCode,
          status: order.status,
          cancelledAt: order.cancelledAt,
          cancelReason: order.cancelReason,
        },
      };
    } catch (error: any) {
      this.logger.error(`[cancelOrder] Error: ${error.message}`);
      return {
        status: 400,
        message: error.message || 'Không thể huỷ đơn hàng',
        data: null,
      };
    }
  }

  /**
   * Hoàn tất đơn hàng (CCB)
   * App gọi API này khi nhân viên nhấn "Hoàn tất"
   */
  @Post('complete-order/:orderId')
  @ApiOperation({ summary: 'Hoàn tất đơn hàng' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Hoàn tất thành công' })
  async completeOrder(@Param('orderId') orderId: string) {
    this.logger.log(`[completeOrder] orderId=${orderId}`);

    try {
      const order = await this.ordersService.completeOrder(orderId);

      this.logger.log(`[completeOrder] Order ${order.orderCode} completed successfully`);

      return {
        status: 200,
        message: 'Hoàn tất đơn hàng thành công',
        data: {
          id: order.id,
          orderCode: order.orderCode,
          status: order.status,
          completedAt: order.completedAt,
        },
      };
    } catch (error: any) {
      this.logger.error(`[completeOrder] Error: ${error.message}`);
      return {
        status: 400,
        message: error.message || 'Không thể hoàn tất đơn hàng',
        data: null,
      };
    }
  }

  /**
   * Get all disconnected accounts for a branch
   * CCB can use this to check which accounts need reconnection
   */
  @Get('disconnected-accounts/:branchId')
  @ApiOperation({ summary: 'Get disconnected accounts for a branch' })
  @ApiParam({ name: 'branchId', description: 'Branch ID' })
  @ApiResponse({ status: 200, description: 'List of disconnected accounts' })
  async getDisconnectedAccounts(@Param('branchId') branchId: string) {
    this.logger.log(`[getDisconnectedAccounts] branchId=${branchId}`);

    try {
      // Get all store mappings for this branch
      // branchId can be UUID string or legacy integer as string
      const storeMappings = await this.storeMappingRepo.find({
        where: { branchId: branchId, isActive: true },
        relations: ['account'],
      });

      // Filter to disconnected accounts only
      const disconnectedAccounts = storeMappings
        .filter(m => m.account && m.account.status === AccountStatus.DISCONNECTED)
        .map(m => ({
          accountId: m.account.id,
          platform: m.account.platform,
          displayName: m.account.displayName,
          username: m.account.username,
          status: m.account.status,
          lastError: m.account.lastError,
          errorCount: m.account.errorCount,
        }));

      // Remove duplicates
      const uniqueAccounts = Array.from(
        new Map(disconnectedAccounts.map(a => [a.accountId, a])).values()
      );

      this.logger.log(`[getDisconnectedAccounts] Found ${uniqueAccounts.length} disconnected accounts for branch ${branchId}`);

      return {
        status: 200,
        message: 'Ok',
        data: {
          disconnectedAccounts: uniqueAccounts,
          count: uniqueAccounts.length,
        },
      };
    } catch (error: any) {
      this.logger.error(`[getDisconnectedAccounts] Error: ${error.message}`);
      return {
        status: 500,
        message: error.message,
        data: null,
      };
    }
  }

  /**
   * Poll orders from food platforms by branch (called by CCB every 15 seconds)
   *
   * Architecture:
   * 1. CCB calls this endpoint with branchId
   * 2. api-app-food sends trigger signal to api-order-worker via Redis Pub/Sub
   * 3. api-order-worker polls merchant APIs, fetches order details, and saves to DB
   * 4. api-app-food reads orders from cache/DB and returns to CCB
   *
   * NOTE: Order fetching and saving is ONLY handled by api-order-worker!
   */
  @Get('poll-orders/:branchId')
  @ApiOperation({ summary: 'Poll orders from all food platforms for a branch' })
  @ApiParam({ name: 'branchId', description: 'Branch ID to poll orders for' })
  @ApiQuery({ name: 'pageType', required: false, description: 'Page type: New, Preparing, Ready, Delivering' })
  @ApiQuery({ name: 'lastPollAt', required: false, description: 'Last poll timestamp for incremental updates' })
  @ApiResponse({ status: 200, description: 'Orders polled and returned' })
  async pollOrders(
    @Param('branchId') branchId: string,
    @Query('pageType') pageType: string = 'Preparing',
    @Query('lastPollAt') lastPollAt?: string,
  ) {
    this.logger.log(`[pollOrders] branchId=${branchId}, pageType=${pageType}`);

    try {
      // Delegate to OrdersService which:
      // 1. Triggers api-order-worker via Redis Pub/Sub
      // 2. Reads from cache or DB
      // 3. Returns orders
      const pollResult = await this.ordersService.pollOrders({
        branchId,
        lastPollAt: lastPollAt ? parseInt(lastPollAt, 10) : undefined,
      });

      // Transform response for CCB compatibility
      const orders = pollResult.newOrders || [];

      return {
        status: 200,
        message: 'Ok',
        data: {
          branchId,
          totalOrders: orders.length,
          newOrders: pollResult.meta?.totalOrdersFetched || 0,
          newOrderIds: [],
          accounts: [],
          orders: orders.map((o: any) => this.transformOrderForResponse(o)),
          polledAt: new Date().toISOString(),
          source: pollResult.meta?.source || 'database',
        },
      };
    } catch (error: any) {
      this.logger.error(`[pollOrders] Error: ${error.message}`);
      return {
        status: 500,
        message: error.message,
        data: null,
      };
    }
  }

  /**
   * Transform order entity to response format for CCB
   *
   * Response structure for CCB Android App:
   * - Order info: id, orderCode, displayId, platform, status
   * - Customer: name, phone, address, note
   * - Driver: name, phone, avatar, licensePlate
   * - Items: array with full details (name, qty, price, note, options, modifiers)
   * - Pricing: subtotal, deliveryFee, smallOrderFee, discount, promotion, total
   * - Timestamps: createdAt, acceptedAt, preparedAt, completedAt
   */
  private transformOrderForResponse(order: any) {
    const raw = order.rawData as any;

    // Transform items for CCB display
    const transformedItems = this.transformItemsForCCB(order);

    return {
      // === Order identification ===
      id: order.id,
      externalOrderId: order.externalOrderId,
      orderCode: order.orderCode,
      displayId: raw?.displayID || order.orderCode, // "GF-495"
      platform: order.platform,

      // === Status ===
      status: order.status?.toLowerCase() || 'new', // TechRes status: new, confirmed, completed, cancelled
      merchantStatus: order.merchantStatus?.toLowerCase() || 'pending', // Platform status

      // === Customer info ===
      customer: {
        id: raw?.eater?.ID?.toString() || null,
        name: order.customerName || 'Khách hàng',
        phone: order.customerPhone || null,
        address: order.customerAddress || null,
        note: order.customerNote || null, // Ghi chú đơn hàng
      },
      // Legacy fields for backward compatibility
      customerId: raw?.eater?.ID?.toString() || null,
      customerName: order.customerName,
      customerPhone: order.customerPhone || null,
      customerAddress: order.customerAddress || null,
      customerNote: order.customerNote || null,

      // === Driver info ===
      driver: {
        id: raw?.driver?.ID?.toString() || null,
        name: order.driverName || raw?.driver?.name || null,
        phone: order.driverPhone || null,
        avatar: order.driverAvatar || raw?.driver?.avatar || null,
        licensePlate: order.driverLicensePlate || null,
      },
      // Legacy fields
      driverId: raw?.driver?.ID?.toString() || null,
      driverName: order.driverName || raw?.driver?.name || null,
      driverPhone: order.driverPhone || null,
      driverAvatar: order.driverAvatar || raw?.driver?.avatar || null,
      driverLicensePlate: order.driverLicensePlate || null,

      // === Items ===
      items: transformedItems,
      itemsCount: transformedItems.length,

      // === Pricing summary ===
      pricing: {
        subtotal: order.subtotal || 0, // Tổng tiền món
        deliveryFee: order.deliveryFee || 0, // Phí giao hàng
        smallOrderFee: order.smallOrderFee || 0, // Phí đơn nhỏ
        platformFee: order.platformFee || 0, // Phí nền tảng
        itemDiscountAmount: order.itemDiscountAmount || 0, // Giảm giá món (nhà hàng)
        promotionAmount: order.promotionAmount || 0, // Giảm giá từ Grab
        discount: order.discount || 0, // Tổng giảm giá
        totalAmount: order.totalAmount || 0, // Tổng tiền khách trả
      },
      // Legacy fields
      subtotal: order.subtotal || 0,
      deliveryFee: order.deliveryFee || 0,
      platformFee: order.platformFee || 0,
      discount: order.discount || 0,
      totalAmount: order.totalAmount || 0,
      smallOrderFee: order.smallOrderFee || 0,
      itemDiscountAmount: order.itemDiscountAmount || 0,
      promotionAmount: order.promotionAmount || 0,

      // === Payment ===
      isPaid: order.isPaid ?? true,
      paymentMethod: order.paymentMethod || 'GrabPay',

      // === Delivery ===
      estimatedDeliveryTime: order.estimatedDeliveryTime || raw?.times?.deliveredAt || null,

      // === Special order flags ===
      isScheduledOrder: order.isScheduledOrder || false,
      scheduledDeliveryTime: order.scheduledDeliveryTime || null,
      isCombinedOrder: order.isCombinedOrder || false,
      parentOrderId: order.parentOrderId || null,

      // === Additional info ===
      cutlery: raw?.cutlery || 0, // Số bộ đồ ăn
      orderContentMessage: raw?.orderContentMessage || null,

      // === Timestamps ===
      timestamps: {
        createdAt: order.createdAt,
        platformCreatedAt: order.platformCreatedAt,
        acceptedAt: order.acceptedAt,
        preparedAt: order.preparedAt,
        completedAt: order.completedAt,
        cancelledAt: order.cancelledAt,
      },
      // Legacy fields
      createdAt: order.createdAt,
      platformCreatedAt: order.platformCreatedAt,
      acceptedAt: order.acceptedAt,
      preparedAt: order.preparedAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
    };
  }

  /**
   * Transform items for CCB display
   * Ensures consistent structure with full details
   */
  private transformItemsForCCB(order: any): any[] {
    // Prefer orderItems (normalized table) over items (JSONB)
    const items = order.orderItems?.length > 0 ? order.orderItems : (order.items || []);

    return items.map((item: any, index: number) => ({
      // === Item identification ===
      id: item.id || null,
      externalProductId: item.externalProductId || item.itemID || null,
      sortOrder: item.sortOrder ?? index,

      // === Product info ===
      productName: item.productName || item.name || 'Unknown',
      quantity: item.quantity || 1,

      // === Pricing ===
      unitPrice: item.unitPrice || 0, // Giá bán
      totalPrice: item.totalPrice || 0, // Tổng thành tiền
      discountAmount: item.discountAmount || 0, // Giảm giá món

      // === Note (ghi chú món) ===
      note: item.note || item.comment || '',

      // === Options/Toppings ===
      // options: String format for simple display "Giảm Trà, Ngọt 70%, Đá chung"
      options: item.options || '',

      // modifiers: Structured array for detailed display
      // [{ groupName: "Độ ngọt", modifierName: "Ngọt 70%", price: 0 }]
      modifiers: item.modifiers || [],

      // modifierGroups: Full structure from API
      // [{ groupId, groupName, modifiers: [{ modifierId, modifierName, price }] }]
      modifierGroups: item.modifierGroups || [],

      // === Formatted display strings for CCB ===
      priceDisplay: this.formatCurrency(item.unitPrice || 0),
      totalPriceDisplay: this.formatCurrency(item.totalPrice || 0),
      discountDisplay: item.discountAmount > 0 ? `-${this.formatCurrency(item.discountAmount)}` : null,
    }));
  }

  /**
   * Format number to Vietnamese currency string
   */
  private formatCurrency(amount: number): string {
    if (!amount) return '0đ';
    return amount.toLocaleString('vi-VN') + 'đ';
  }
}
