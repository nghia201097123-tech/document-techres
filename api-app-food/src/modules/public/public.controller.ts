import { Controller, Get, Post, Param, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FoodPlatformAccount, FoodPlatformStoreMapping, FoodPlatformExternalItem, FoodPlatformItemMapping, FoodOrder, FoodOrderStatus, AccountStatus, FoodPlatformType } from '../../database/entities';
import { AccountsService } from '../accounts/accounts.service';
import { GrabConnector } from '../connectors/grab.connector';

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
    private readonly accountsService: AccountsService,
    private readonly grabConnector: GrabConnector,
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
   * Flow:
   * 1. CCB calls with branchId
   * 2. Get all connected accounts (Grab, Be, Shopee) for that branch
   * 3. For each Grab account, fetch orders from GrabFood API
   * 4. Save orders to database
   */
  @Get('poll-orders/:branchId')
  @ApiOperation({ summary: 'Poll orders from all food platforms for a branch' })
  @ApiParam({ name: 'branchId', description: 'Branch ID to poll orders for' })
  @ApiQuery({ name: 'pageType', required: false, description: 'Page type: New, Preparing, Ready, Delivering' })
  @ApiResponse({ status: 200, description: 'Orders polled and saved' })
  async pollOrders(
    @Param('branchId') branchId: string,
    @Query('pageType') pageType: string = 'Preparing',
  ) {
    this.logger.log(`[pollOrders] branchId=${branchId}, pageType=${pageType}`);

    try {
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

      this.logger.log(`[pollOrders] Found ${accounts.length} connected accounts for branch ${branchId}`);

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

      // Process each account
      for (const account of accounts) {
        // Only process Grab accounts for now
        if (account.platform !== FoodPlatformType.GRAB) {
          platformResults.push({
            platform: account.platform,
            accountId: account.id,
            displayName: account.displayName || account.username || account.platform,
            success: false,
            ordersCount: 0,
            newOrdersCount: 0,
            error: 'Chưa hỗ trợ nền tảng này',
          });
          continue;
        }

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
          // Fetch orders from GrabFood
          const validPageType = ['New', 'Preparing', 'Ready', 'Delivering'].includes(pageType)
            ? pageType as 'New' | 'Preparing' | 'Ready' | 'Delivering'
            : 'Preparing';

          const result = await this.grabConnector.fetchOrdersPagination(account, validPageType);

          if (!result.success) {
            // Update account error status
            await this.accountRepo.update(account.id, {
              errorCount: account.errorCount + 1,
              lastError: result.error || 'Lấy đơn hàng thất bại',
            });

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

          // Save orders to database
          const savedOrders: FoodOrder[] = [];
          const newOrderIds: string[] = [];

          for (const grabOrder of result.orders) {
            const rawOrder = this.grabConnector.transformPaginationOrder(grabOrder);

            // Check if order already exists
            let existingOrder = await this.orderRepo.findOne({
              where: {
                externalOrderId: rawOrder.externalOrderId,
                platform: FoodPlatformType.GRAB,
              },
            });

            if (existingOrder) {
              // Update existing order
              const newStatus = this.mapGrabStatusToFoodOrderStatus(rawOrder.status);
              const statusChanged = existingOrder.status !== newStatus;

              existingOrder.status = newStatus;
              existingOrder.previousStatus = statusChanged ? existingOrder.status : existingOrder.previousStatus;
              existingOrder.driverName = rawOrder.driverName || existingOrder.driverName;
              existingOrder.lastSyncAt = new Date();
              existingOrder.rawData = rawOrder.rawData;

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
              savedOrders.push(existingOrder);
            } else {
              // Create new order
              const newOrder = this.orderRepo.create({
                tenantId: account.tenantId,
                branchId: account.branchId,
                externalOrderId: rawOrder.externalOrderId,
                orderCode: rawOrder.orderCode,
                platform: FoodPlatformType.GRAB,
                status: this.mapGrabStatusToFoodOrderStatus(rawOrder.status),
                customerName: rawOrder.customerName,
                customerPhone: rawOrder.customerPhone || '',
                customerAddress: rawOrder.customerAddress || null,
                customerNote: rawOrder.customerNote || null,
                items: rawOrder.items,
                subtotal: rawOrder.subtotal,
                deliveryFee: rawOrder.deliveryFee,
                platformFee: rawOrder.platformFee,
                discount: rawOrder.discount,
                totalAmount: rawOrder.totalAmount,
                isPaid: rawOrder.isPaid,
                paymentMethod: rawOrder.paymentMethod || null,
                driverName: rawOrder.driverName || null,
                driverPhone: rawOrder.driverPhone || null,
                driverLicensePlate: rawOrder.driverLicensePlate || null,
                estimatedDeliveryTime: rawOrder.estimatedDeliveryTime || null,
                platformCreatedAt: rawOrder.createdAt,
                acceptedAt: rawOrder.acceptedAt || null,
                preparedAt: rawOrder.readyAt || null,
                completedAt: rawOrder.completedAt || null,
                cancelledAt: rawOrder.cancelledAt || null,
                accountId: account.id,
                rawData: rawOrder.rawData,
              });

              const saved = await this.orderRepo.save(newOrder);
              savedOrders.push(saved);
              newOrderIds.push(saved.externalOrderId);
            }
          }

          // Update account last poll time
          await this.accountRepo.update(account.id, {
            lastPollAt: new Date(),
            errorCount: 0,
            lastError: null,
          });

          allSavedOrders.push(...savedOrders);
          allNewOrderIds.push(...newOrderIds);

          platformResults.push({
            platform: account.platform,
            accountId: account.id,
            displayName: account.displayName || account.username || account.platform,
            success: true,
            ordersCount: savedOrders.length,
            newOrdersCount: newOrderIds.length,
            orderStats: result.orderStats,
          });

          this.logger.log(`[pollOrders] ${account.platform}: Saved ${savedOrders.length} orders (${newOrderIds.length} new)`);

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
          orders: allSavedOrders.map(o => ({
            id: o.id,
            externalOrderId: o.externalOrderId,
            orderCode: o.orderCode,
            platform: o.platform,
            status: o.status,
            customerName: o.customerName,
            itemsCount: o.items?.length || 0,
            totalAmount: o.totalAmount,
            driverName: o.driverName,
            createdAt: o.createdAt,
            platformCreatedAt: o.platformCreatedAt,
          })),
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
   * Map Grab status to FoodOrderStatus
   */
  private mapGrabStatusToFoodOrderStatus(status: string): FoodOrderStatus {
    const statusMap: Record<string, FoodOrderStatus> = {
      'new': FoodOrderStatus.NEW,
      'accepted': FoodOrderStatus.ACCEPTED,
      'preparing': FoodOrderStatus.PREPARING,
      'ready': FoodOrderStatus.READY,
      'delivering': FoodOrderStatus.DELIVERING,
      'completed': FoodOrderStatus.COMPLETED,
      'cancelled': FoodOrderStatus.CANCELLED,
    };
    return statusMap[status] || FoodOrderStatus.NEW;
  }
}
