import { Controller, Get, Post, Body, Param, Query, Logger, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FoodPlatformAccount, FoodPlatformStoreMapping, FoodPlatformExternalItem, FoodPlatformItemMapping, FoodOrder, FoodOrderItemEntity, FoodOrderStatus, AccountStatus, FoodPlatformType } from '../../database/entities';
import { AccountsService } from '../accounts/accounts.service';
import { OrdersService } from '../orders/orders.service';
import { ConnectorFactory } from '../connectors/connector.factory';
import { GrabConnector } from '../connectors/grab.connector';
import { ShopeeConnector } from '../connectors/shopee.connector';
import { BeFoodConnector } from '../connectors/befood.connector';
import { RawFoodOrder } from '../connectors/interfaces/connector.interface';

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
    private readonly connectorFactory: ConnectorFactory,
    // Platform-specific connectors for direct access when needed
    private readonly grabConnector: GrabConnector,
    private readonly shopeeConnector: ShopeeConnector,
    private readonly beFoodConnector: BeFoodConnector,
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
   * Poll orders from food platforms by branch (called by CCB every 5 seconds)
   *
   * Flow (Correct Architecture):
   * 1. CCB calls with branchId
   * 2. api-app-food sends trigger signal to api-order-worker via Redis Pub/Sub
   * 3. api-order-worker polls merchant APIs and saves to DB
   * 4. api-app-food reads orders from cache/DB and returns to CCB
   *
   * NOTE: Direct DB save is handled by api-order-worker, NOT here!
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
      // Delegate to OrdersService which has correct flow:
      // 1. Trigger api-order-worker via Redis Pub/Sub
      // 2. Read from cache or DB
      // 3. Return orders
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

  /**
   * Legacy poll endpoint - kept for backward compatibility
   * Redirects to the new flow via OrdersService
   *
   * @deprecated Use GET /poll-orders/:branchId instead
   */
  @Get('poll-orders-legacy/:branchId')
  @ApiOperation({ summary: '[DEPRECATED] Legacy poll - use poll-orders instead' })
  async pollOrdersLegacy(
    @Param('branchId') branchId: string,
    @Query('pageType') pageType: string = 'Preparing',
  ) {
    try {
      this.logger.warn(`[pollOrdersLegacy] DEPRECATED endpoint called for branch ${branchId}`);

    // Get all connected accounts for this branch
    const accounts = await this.accountRepo.find({
      where: {
        branchId: branchId,
        status: AccountStatus.CONNECTED,
        isActive: true,
      },
    });

    if (accounts.length === 0) {
      return {
        status: 200,
        message: 'Không có cổng kết nối nào cho chi nhánh này',
        data: {
          branchId,
          accounts: [],
          totalOrders: 0,
          newOrders: 0,
        },
      };
    }

    this.logger.log(`[pollOrdersLegacy] Found ${accounts.length} connected accounts for branch ${branchId}`);

    // Results for each platform
    const platformResults: {
      platform: string;
      accountId: string;
      displayName: string;
      success: boolean;
      ordersCount: number;
      newOrdersCount: number;
      error?: string;
      orderStats?: any;
    }[] = [];

    const allSavedOrders: FoodOrder[] = [];
    const allNewOrderIds: string[] = [];

    // Process each account - supports all platforms (Grab, Shopee, BeFood)
    for (const account of accounts) {
      // Check access token
      if (!account.accessToken) {
        platformResults.push({
          platform: account.platform,
          accountId: account.id,
          displayName: account.displayName || account.username || account.platform,
          success: false,
          ordersCount: 0,
          newOrdersCount: 0,
          error: 'Tài khoản chưa có token',
        });
        continue;
      }

      try {
        // Process orders based on platform
        const result = await this.processAccountOrders(account, pageType);

          if (!result.success) {
            platformResults.push({
              platform: account.platform,
              accountId: account.id,
              displayName: account.displayName || account.username || account.platform,
              success: false,
              ordersCount: 0,
              newOrdersCount: 0,
              error: result.error || 'Lấy đơn hàng thất bại',
            });
            continue;
          }

          allSavedOrders.push(...result.savedOrders);
          allNewOrderIds.push(...result.newOrderIds);

          platformResults.push({
            platform: account.platform,
            accountId: account.id,
            displayName: account.displayName || account.username || account.platform,
            success: true,
            ordersCount: result.savedOrders.length,
            newOrdersCount: result.newOrderIds.length,
            orderStats: result.orderStats,
          });

          this.logger.log(`[pollOrders] ${account.platform}: Saved ${result.savedOrders.length} orders (${result.newOrderIds.length} new)`);

        } catch (accountError: any) {
          this.logger.error(`[pollOrders] Error processing account ${account.id}: ${accountError.message}`);

          // Update account error status
          await this.accountRepo.update(account.id, {
            errorCount: account.errorCount + 1,
            lastError: accountError.message,
          });

          platformResults.push({
            platform: account.platform,
            accountId: account.id,
            displayName: account.displayName || account.username || account.platform,
            success: false,
            ordersCount: 0,
            newOrdersCount: 0,
            error: accountError.message,
          });
        }
      }

      this.logger.log(`[pollOrders] Total: ${allSavedOrders.length} orders (${allNewOrderIds.length} new) for branch ${branchId}`);

      return {
        status: 200,
        message: 'Ok',
        data: {
          branchId,
          totalOrders: allSavedOrders.length,
          newOrders: allNewOrderIds.length,
          newOrderIds: allNewOrderIds,
          accounts: platformResults,
          orders: allSavedOrders.map(o => {
            // Extract customer/driver info from rawData (original Grab response)
            const raw = o.rawData as any;
            return {
              id: o.id,
              externalOrderId: o.externalOrderId,
              orderCode: o.orderCode,
              platform: o.platform,
              status: o.status,
              // Customer info
              customerId: raw?.eater?.ID?.toString() || null,
              customerName: o.customerName,
              customerPhone: o.customerPhone || null,
              customerAddress: o.customerAddress || null,
              customerNote: o.customerNote || null,
              // Items
              items: o.items,
              itemsCount: o.items?.length || 0,
              // Payment
              subtotal: o.subtotal,
              deliveryFee: o.deliveryFee,
              platformFee: o.platformFee,
              discount: o.discount,
              totalAmount: o.totalAmount,
              isPaid: o.isPaid,
              paymentMethod: o.paymentMethod,
              // Driver info
              driverId: raw?.driver?.ID?.toString() || null,
              driverName: o.driverName || raw?.driver?.name || null,
              driverPhone: o.driverPhone || null,
              driverAvatar: raw?.driver?.avatar || null,
              driverLicensePlate: o.driverLicensePlate || null,
              estimatedDeliveryTime: o.estimatedDeliveryTime || raw?.times?.deliveredAt || null,
              // Order status message
              orderContentMessage: raw?.orderContentMessage || null,
              // Timestamps
              createdAt: o.createdAt,
              platformCreatedAt: o.platformCreatedAt,
              acceptedAt: o.acceptedAt,
              preparedAt: o.preparedAt,
              completedAt: o.completedAt,
              cancelledAt: o.cancelledAt,
            };
          }),
          polledAt: new Date().toISOString(),
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
   * Map status string to FoodOrderStatus - TechRes simplified flow
   * Đơn mới (NEW) -> Đã xác nhận (CONFIRMED) -> Hoàn tất (COMPLETED) / Huỷ (CANCELLED)
   */
  private mapStatusToFoodOrderStatus(status: string): FoodOrderStatus {
    const statusMap: Record<string, FoodOrderStatus> = {
      'new': FoodOrderStatus.NEW,
      'confirmed': FoodOrderStatus.CONFIRMED,
      // Backward compatibility for old 'preparing' status
      'preparing': FoodOrderStatus.CONFIRMED,
      'completed': FoodOrderStatus.COMPLETED,
      'cancelled': FoodOrderStatus.CANCELLED,
    };
    return statusMap[status?.toLowerCase()] || FoodOrderStatus.NEW;
  }

  /**
   * Process orders for a single account
   * Supports all platforms: GrabFood, ShopeeFood, BeFood
   */
  private async processAccountOrders(
    account: FoodPlatformAccount,
    pageType: string,
  ): Promise<{
    success: boolean;
    savedOrders: FoodOrder[];
    newOrderIds: string[];
    orderStats?: any;
    error?: string;
  }> {
    let currentAccount = account;

    try {
      // Fetch orders based on platform
      let result;

      switch (account.platform) {
        case FoodPlatformType.GRAB:
          result = await this.processGrabOrders(currentAccount, pageType);
          break;

        case FoodPlatformType.SHOPEE_FOOD:
          result = await this.processShopeeOrders(currentAccount);
          break;

        case FoodPlatformType.BEFOOD:
          result = await this.processBeFoodOrders(currentAccount);
          break;

        default:
          return {
            success: false,
            savedOrders: [],
            newOrderIds: [],
            error: `Chưa hỗ trợ nền tảng ${account.platform}`,
          };
      }

      return result;

    } catch (error: any) {
      this.logger.error(`[processAccountOrders] Error for ${account.platform}: ${error.message}`);
      return {
        success: false,
        savedOrders: [],
        newOrderIds: [],
        error: error.message,
      };
    }
  }

  /**
   * Process GrabFood orders
   * Uses fetchGrabOrdersPagination and fetchOrderDetail for enrichment
   * XỬ LÝ ĐỒNG BỘ: Chỉ lưu order khi có detail đầy đủ (giá, note, modifiers)
   */
  private async processGrabOrders(
    account: FoodPlatformAccount,
    pageType: string,
  ): Promise<{
    success: boolean;
    savedOrders: FoodOrder[];
    newOrderIds: string[];
    orderStats?: any;
    error?: string;
  }> {
    const validPageType = ['New', 'Preparing', 'Ready', 'Delivering'].includes(pageType)
      ? pageType as 'New' | 'Preparing' | 'Ready' | 'Delivering'
      : 'Preparing';

    let currentAccount = account;
    let result;

    try {
      result = await this.grabConnector.fetchGrabOrdersPagination(currentAccount, validPageType);
    } catch (fetchError: any) {
      // Check if it's a token expiry error
      const isUnauthorized = fetchError instanceof UnauthorizedException ||
        fetchError?.status === 401 ||
        fetchError?.message?.includes('Token hết hạn');

      if (isUnauthorized) {
        this.logger.log(`[processGrabOrders] Token expired, attempting reconnect...`);
        try {
          currentAccount = await this.accountsService.reconnect(account.id);
          result = await this.grabConnector.fetchGrabOrdersPagination(currentAccount, validPageType);
        } catch (reconnectError: any) {
          throw new Error(`Token hết hạn và không thể kết nối lại: ${reconnectError?.message}`);
        }
      } else {
        throw fetchError;
      }
    }

    if (!result?.success) {
      await this.accountRepo.update(currentAccount.id, {
        errorCount: currentAccount.errorCount + 1,
        lastError: result?.error || 'Lấy đơn hàng thất bại',
      });
      return {
        success: false,
        savedOrders: [],
        newOrderIds: [],
        error: result?.error || 'Lấy đơn hàng thất bại',
      };
    }

    // Process orders ĐỒNG BỘ - từng order một
    const savedOrders: FoodOrder[] = [];
    const newOrderIds: string[] = [];
    let skippedCount = 0;

    for (const grabOrder of result.orders) {
      const basicOrder = this.grabConnector.transformPaginationOrder(grabOrder);
      const orderCode = basicOrder.orderCode;

      this.logger.log(`[processGrabOrders] Processing order ${orderCode}...`);

      // Fetch detail với retry (3 lần)
      let detailOrder = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          this.logger.log(`[processGrabOrders] ${orderCode}: Attempt ${attempt}/3 fetching detail...`);
          detailOrder = await this.grabConnector.fetchOrderDetail(
            currentAccount,
            basicOrder.externalOrderId,
            orderCode,
          );
          if (detailOrder) break;
        } catch (error: any) {
          this.logger.warn(`[processGrabOrders] ${orderCode}: Attempt ${attempt}/3 failed: ${error.message}`);
          if (attempt < 3) {
            // Exponential backoff: 500ms, 1000ms
            await this.sleep(500 * attempt);
          }
        }
      }

      // Kiểm tra có detail đầy đủ không
      if (!detailOrder) {
        this.logger.warn(`[processGrabOrders] ${orderCode}: Không lấy được detail sau 3 lần, SKIP`);
        skippedCount++;
        continue;
      }

      // Validate items có giá
      const hasValidItems = detailOrder.items?.some(
        (item: any) => item.unitPrice > 0 || item.totalPrice > 0,
      );

      if (!hasValidItems) {
        this.logger.warn(`[processGrabOrders] ${orderCode}: Items không có giá, SKIP`);
        skippedCount++;
        continue;
      }

      // Merge detail vào order
      const rawOrder = {
        ...basicOrder,
        // Customer info
        customerPhone: detailOrder.customerPhone || basicOrder.customerPhone,
        customerAddress: detailOrder.customerAddress || basicOrder.customerAddress,
        customerNote: detailOrder.customerNote || basicOrder.customerNote,
        // Driver info
        driverPhone: detailOrder.driverPhone || basicOrder.driverPhone,
        driverAvatar: detailOrder.driverAvatar || basicOrder.driverAvatar,
        driverLicensePlate: detailOrder.driverLicensePlate || basicOrder.driverLicensePlate,
        // Items với full details (note, modifiers, prices)
        items: detailOrder.items,
        // Pricing
        subtotal: detailOrder.subtotal || basicOrder.subtotal,
        deliveryFee: detailOrder.deliveryFee || basicOrder.deliveryFee,
        smallOrderFee: detailOrder.smallOrderFee || 0,
        itemDiscountAmount: detailOrder.itemDiscountAmount || 0,
        promotionAmount: detailOrder.promotionAmount || 0,
        discount: detailOrder.discount || basicOrder.discount,
        totalAmount: detailOrder.totalAmount || basicOrder.totalAmount,
        // Scheduled order
        isScheduledOrder: detailOrder.isScheduledOrder || false,
        scheduledDeliveryTime: detailOrder.scheduledDeliveryTime || undefined,
        // Combined order
        isCombinedOrder: detailOrder.isCombinedOrder || false,
      };

      // Log item đầu tiên để debug
      if (rawOrder.items?.length > 0) {
        const firstItem = rawOrder.items[0];
        this.logger.log(
          `[processGrabOrders] ${orderCode}: Item 1: "${firstItem.productName}", ` +
            `giá: ${firstItem.unitPrice}đ, note: "${firstItem.note || ''}"`,
        );
      }

      // Save order với đầy đủ detail
      const savedOrder = await this.saveOrder(currentAccount, rawOrder, FoodPlatformType.GRAB);
      savedOrders.push(savedOrder.order);
      if (savedOrder.isNew) {
        newOrderIds.push(savedOrder.order.externalOrderId);
      }

      this.logger.log(`[processGrabOrders] ✅ ${orderCode}: Saved với ${rawOrder.items?.length || 0} items`);
    }

    this.logger.log(`[processGrabOrders] DONE: ${savedOrders.length} saved, ${skippedCount} skipped`);

    // Sync status for active orders not in pagination
    await this.syncActiveOrdersStatus(currentAccount, result.orders.map((o: any) => o.orderID));

    // Update account last poll time
    await this.accountRepo.update(currentAccount.id, {
      lastPollAt: new Date(),
      errorCount: 0,
      lastError: null,
    });

    return {
      success: true,
      savedOrders,
      newOrderIds,
      orderStats: result.orderStats,
    };
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Process ShopeeFood orders
   */
  private async processShopeeOrders(
    account: FoodPlatformAccount,
  ): Promise<{
    success: boolean;
    savedOrders: FoodOrder[];
    newOrderIds: string[];
    orderStats?: any;
    error?: string;
  }> {
    try {
      const result = await this.shopeeConnector.fetchOrdersPaginationStandard(account);

      if (!result.success) {
        return {
          success: false,
          savedOrders: [],
          newOrderIds: [],
          error: result.error || 'Lấy đơn hàng thất bại',
        };
      }

      const savedOrders: FoodOrder[] = [];
      const newOrderIds: string[] = [];

      for (const rawOrder of result.orders) {
        const savedOrder = await this.saveOrder(account, rawOrder, FoodPlatformType.SHOPEE_FOOD);
        savedOrders.push(savedOrder.order);
        if (savedOrder.isNew) {
          newOrderIds.push(savedOrder.order.externalOrderId);
        }
      }

      // Update account last poll time
      await this.accountRepo.update(account.id, {
        lastPollAt: new Date(),
        errorCount: 0,
        lastError: null,
      });

      return {
        success: true,
        savedOrders,
        newOrderIds,
        orderStats: result.orderStats,
      };
    } catch (error: any) {
      this.logger.error(`[processShopeeOrders] Error: ${error.message}`);
      return {
        success: false,
        savedOrders: [],
        newOrderIds: [],
        error: error.message,
      };
    }
  }

  /**
   * Process BeFood orders
   */
  private async processBeFoodOrders(
    account: FoodPlatformAccount,
  ): Promise<{
    success: boolean;
    savedOrders: FoodOrder[];
    newOrderIds: string[];
    orderStats?: any;
    error?: string;
  }> {
    try {
      const result = await this.beFoodConnector.fetchOrdersPaginationStandard(account);

      if (!result.success) {
        return {
          success: false,
          savedOrders: [],
          newOrderIds: [],
          error: result.error || 'Lấy đơn hàng thất bại',
        };
      }

      const savedOrders: FoodOrder[] = [];
      const newOrderIds: string[] = [];

      for (const rawOrder of result.orders) {
        const savedOrder = await this.saveOrder(account, rawOrder, FoodPlatformType.BEFOOD);
        savedOrders.push(savedOrder.order);
        if (savedOrder.isNew) {
          newOrderIds.push(savedOrder.order.externalOrderId);
        }
      }

      // Update account last poll time
      await this.accountRepo.update(account.id, {
        lastPollAt: new Date(),
        errorCount: 0,
        lastError: null,
      });

      return {
        success: true,
        savedOrders,
        newOrderIds,
        orderStats: result.orderStats,
      };
    } catch (error: any) {
      this.logger.error(`[processBeFoodOrders] Error: ${error.message}`);
      return {
        success: false,
        savedOrders: [],
        newOrderIds: [],
        error: error.message,
      };
    }
  }

  /**
   * Save order to database (create or update)
   * Generic method for all platforms
   *
   * TechRes Flow:
   * - Đơn mới (NEW): Tất cả đơn lấy về đều vào đây
   * - Đang xử lý (PREPARING): Sau khi TechRes xác nhận
   * - Hoàn tất (COMPLETED) / Đã huỷ (CANCELLED): Trạng thái cuối
   *
   * Chỉ tự động sync COMPLETED/CANCELLED từ platform, không sync các trạng thái khác
   */
  private async saveOrder(
    account: FoodPlatformAccount,
    rawOrder: any,
    platform: FoodPlatformType,
  ): Promise<{ order: FoodOrder; isNew: boolean }> {
    // Check if order already exists
    let existingOrder = await this.orderRepo.findOne({
      where: {
        externalOrderId: rawOrder.externalOrderId,
        platform,
      },
    });

    if (existingOrder) {
      // Update existing order - TechRes flow
      const platformStatus = this.mapStatusToFoodOrderStatus(rawOrder.status);

      // Only auto-sync COMPLETED/CANCELLED from platform
      // Don't change TechRes status based on platform's intermediate states
      let shouldUpdateStatus = false;
      if (platformStatus === FoodOrderStatus.COMPLETED || platformStatus === FoodOrderStatus.CANCELLED) {
        // Auto sync final states from platform
        if (existingOrder.status !== platformStatus) {
          shouldUpdateStatus = true;
          existingOrder.previousStatus = existingOrder.status;
          existingOrder.status = platformStatus;
          this.logger.log(`[saveOrder] Auto-sync status for ${existingOrder.orderCode}: ${existingOrder.previousStatus} -> ${platformStatus}`);
        }
      }
      // Keep TechRes status as-is for intermediate states
      existingOrder.driverName = rawOrder.driverName || existingOrder.driverName;
      existingOrder.lastSyncAt = new Date();
      existingOrder.rawData = rawOrder.rawData || null;

      // Update customer info
      if (rawOrder.customerPhone && !existingOrder.customerPhone) {
        existingOrder.customerPhone = rawOrder.customerPhone;
      }
      if (rawOrder.customerAddress && !existingOrder.customerAddress) {
        existingOrder.customerAddress = rawOrder.customerAddress;
      }
      if (rawOrder.customerNote && !existingOrder.customerNote) {
        existingOrder.customerNote = rawOrder.customerNote;
      }

      // Update driver info
      if (rawOrder.driverPhone && !existingOrder.driverPhone) {
        existingOrder.driverPhone = rawOrder.driverPhone;
      }
      if (rawOrder.driverAvatar && !existingOrder.driverAvatar) {
        existingOrder.driverAvatar = rawOrder.driverAvatar;
      }
      if (rawOrder.driverLicensePlate && !existingOrder.driverLicensePlate) {
        existingOrder.driverLicensePlate = rawOrder.driverLicensePlate;
      }

      // Update timestamps
      if (rawOrder.acceptedAt && !existingOrder.acceptedAt) {
        existingOrder.acceptedAt = rawOrder.acceptedAt;
      }
      if (rawOrder.readyAt && !existingOrder.preparedAt) {
        existingOrder.preparedAt = rawOrder.readyAt;
      }
      if (rawOrder.completedAt && !existingOrder.completedAt) {
        existingOrder.completedAt = rawOrder.completedAt;
      }
      if (rawOrder.cancelledAt && !existingOrder.cancelledAt) {
        existingOrder.cancelledAt = rawOrder.cancelledAt;
      }

      await this.orderRepo.save(existingOrder);
      return { order: existingOrder, isNew: false };
    } else {
      // Create new order - TechRes flow: always start as NEW
      // Unless platform already says COMPLETED/CANCELLED
      const platformStatus = this.mapStatusToFoodOrderStatus(rawOrder.status);
      let initialStatus = FoodOrderStatus.NEW;

      // If platform already marked as final state, use that
      if (platformStatus === FoodOrderStatus.COMPLETED || platformStatus === FoodOrderStatus.CANCELLED) {
        initialStatus = platformStatus;
        this.logger.log(`[saveOrder] New order ${rawOrder.orderCode} already ${platformStatus} on platform`);
      }

      const newOrder = new FoodOrder();
      newOrder.tenantId = account.tenantId;
      newOrder.branchId = account.branchId;
      newOrder.externalOrderId = rawOrder.externalOrderId;
      newOrder.orderCode = rawOrder.orderCode;
      newOrder.platform = platform;
      newOrder.status = initialStatus;
      newOrder.customerName = rawOrder.customerName;
      newOrder.customerPhone = rawOrder.customerPhone || '';
      newOrder.customerAddress = rawOrder.customerAddress || '';
      newOrder.customerNote = rawOrder.customerNote || '';
      newOrder.items = rawOrder.items;
      newOrder.subtotal = rawOrder.subtotal;
      newOrder.deliveryFee = rawOrder.deliveryFee;
      newOrder.platformFee = rawOrder.platformFee;
      newOrder.discount = rawOrder.discount;
      newOrder.totalAmount = rawOrder.totalAmount;
      newOrder.isPaid = rawOrder.isPaid;
      newOrder.paymentMethod = rawOrder.paymentMethod || '';
      newOrder.driverName = rawOrder.driverName || null;
      newOrder.driverPhone = rawOrder.driverPhone || null;
      newOrder.driverAvatar = rawOrder.driverAvatar || null;
      newOrder.driverLicensePlate = rawOrder.driverLicensePlate || null;
      newOrder.estimatedDeliveryTime = rawOrder.estimatedDeliveryTime || null;
      newOrder.platformCreatedAt = rawOrder.createdAt;
      if (rawOrder.acceptedAt) newOrder.acceptedAt = rawOrder.acceptedAt;
      if (rawOrder.readyAt) newOrder.preparedAt = rawOrder.readyAt;
      if (rawOrder.completedAt) newOrder.completedAt = rawOrder.completedAt;
      if (rawOrder.cancelledAt) newOrder.cancelledAt = rawOrder.cancelledAt;
      newOrder.accountId = account.id;
      newOrder.rawData = rawOrder.rawData || null;

      const saved = await this.orderRepo.save(newOrder);

      // Save order items to food_order_items table
      // Luôn lưu items nếu có - processGrabOrders đã validate trước khi gọi saveOrder
      if (rawOrder.items && rawOrder.items.length > 0) {
        await this.saveOrderItems(saved.id, rawOrder.items);
        this.logger.log(`[saveOrder] Saved ${rawOrder.items.length} items for new order ${saved.orderCode}`);
      }

      return { order: saved, isNew: true };
    }
  }

  /**
   * Save order items to food_order_items table
   * Includes full item details: note, options, modifiers, discountAmount
   */
  private async saveOrderItems(orderId: string, items: any[]): Promise<void> {
    try {
      // Delete existing items for this order (in case of re-sync)
      await this.orderItemRepo.delete({ orderId });

      // Create new items with full details
      const orderItems = items.map((item, index) =>
        this.orderItemRepo.create({
          orderId,
          externalProductId: item.externalProductId || item.grabItemID || item.id || null,
          productName: item.name || item.productName || 'Unknown',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || item.price || 0,
          totalPrice: item.totalPrice || (item.quantity || 1) * (item.unitPrice || item.price || 0),
          discountAmount: item.discountAmount || 0,
          note: item.note || item.comment || item.specialInstruction || null,
          options: typeof item.options === 'string' ? item.options : null,
          modifiers: this.transformModifiersForSave(item.modifierGroups),
          sortOrder: index,
        }),
      );

      await this.orderItemRepo.save(orderItems);
      this.logger.log(`[saveOrderItems] Saved ${orderItems.length} items for order ${orderId}`);
    } catch (error: any) {
      this.logger.error(`[saveOrderItems] Failed to save items for order ${orderId}: ${error.message}`);
    }
  }

  /**
   * Transform modifierGroups to ModifierInfo[] for storage
   */
  private transformModifiersForSave(modifierGroups: any[] | undefined): any[] | null {
    if (!modifierGroups || modifierGroups.length === 0) return null;

    const modifiers: any[] = [];
    for (const group of modifierGroups) {
      for (const mod of group.modifiers || []) {
        modifiers.push({
          groupName: group.groupName,
          modifierName: mod.modifierName,
          price: mod.price || 0,
          quantity: mod.quantity || 1,
        });
      }
    }
    return modifiers.length > 0 ? modifiers : null;
  }

  /**
   * Sync status for active orders not in pagination response
   * For GrabFood: uses fetchOrderDetail to check if COMPLETED/CANCELLED
   */
  private async syncActiveOrdersStatus(
    account: FoodPlatformAccount,
    paginationOrderIds: string[],
  ): Promise<void> {
    const activeStatuses = [
      FoodOrderStatus.NEW,
      FoodOrderStatus.CONFIRMED,
    ];

    const activeOrdersInDb = await this.orderRepo.find({
      where: {
        accountId: account.id,
        status: In(activeStatuses),
      },
    });

    const paginationOrderIdSet = new Set(paginationOrderIds);
    const ordersToSync = activeOrdersInDb.filter(
      (o) => !paginationOrderIdSet.has(o.externalOrderId),
    );

    if (ordersToSync.length === 0) return;

    this.logger.log(`[syncActiveOrdersStatus] Found ${ordersToSync.length} active orders to sync`);

    for (const order of ordersToSync) {
      try {
        // Only GrabFood has fetchOrderDetail support currently
        if (order.platform === FoodPlatformType.GRAB) {
          const detailOrder = await this.grabConnector.fetchOrderDetail(
            account,
            order.externalOrderId,
            order.orderCode,
          );

          if (detailOrder) {
            const platformStatus = this.mapStatusToFoodOrderStatus(detailOrder.status);

            // TechRes flow: Only auto-sync COMPLETED/CANCELLED from platform
            // Don't change TechRes status based on platform's intermediate states
            if (
              (platformStatus === FoodOrderStatus.COMPLETED || platformStatus === FoodOrderStatus.CANCELLED) &&
              platformStatus !== order.status
            ) {
              this.logger.log(`[syncActiveOrdersStatus] Order ${order.orderCode}: ${order.status} -> ${platformStatus} (platform sync)`);

              order.previousStatus = order.status;
              order.status = platformStatus;
              order.lastSyncAt = new Date();

              if (platformStatus === FoodOrderStatus.COMPLETED && !order.completedAt) {
                order.completedAt = new Date();
              }
              if (platformStatus === FoodOrderStatus.CANCELLED && !order.cancelledAt) {
                order.cancelledAt = new Date();
              }

              await this.orderRepo.save(order);
            }
          }
        }
      } catch (syncError: any) {
        this.logger.warn(`[syncActiveOrdersStatus] Failed for ${order.orderCode}: ${syncError.message}`);
      }
    }
  }
}
