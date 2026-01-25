import { Controller, Get, Post, Param, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FoodPlatformAccount, FoodPlatformStoreMapping, FoodPlatformExternalItem, FoodPlatformItemMapping, AccountStatus } from '../../database/entities';
import { AccountsService } from '../accounts/accounts.service';

@ApiTags('public')
@Controller('api/public')
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
    private readonly accountsService: AccountsService,
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
   * Get food platform config for sync to CCB offline
   * Returns: accounts, store mappings, item mappings for a specific branch
   */
  @Get('sync/food-platform/:branchId')
  @ApiOperation({ summary: 'Get food platform config for sync to CCB offline' })
  @ApiParam({ name: 'branchId', description: 'Branch ID' })
  @ApiResponse({ status: 200, description: 'Food platform sync data' })
  async getFoodPlatformSync(@Param('branchId') branchId: string) {
    this.logger.log(`[getFoodPlatformSync] branchId=${branchId}`);

    try {
      // Get accounts linked to this branch via store mappings
      // branchId can be UUID string or legacy integer as string
      const storeMappings = await this.storeMappingRepo.find({
        where: { branchId: branchId, isActive: true },
        relations: ['account'],
      });

      // Group by account
      const accountsMap = new Map<string, {
        account: any;
        storeMappings: any[];
      }>();

      for (const mapping of storeMappings) {
        // Include both CONNECTED and DISCONNECTED accounts (CCB will reconnect disconnected ones)
        if (!mapping.account) continue;
        if (mapping.account.status !== AccountStatus.CONNECTED && mapping.account.status !== AccountStatus.DISCONNECTED) continue;

        if (!accountsMap.has(mapping.accountId)) {
          accountsMap.set(mapping.accountId, {
            account: {
              id: mapping.account.id,
              tenantId: mapping.account.tenantId,
              platform: mapping.account.platform,
              displayName: mapping.account.displayName,
              status: mapping.account.status,
              externalMerchantId: mapping.account.externalMerchantId,
              externalMerchantName: mapping.account.externalMerchantName,
              isActive: mapping.account.isActive,
            },
            storeMappings: [],
          });
        }

        accountsMap.get(mapping.accountId)!.storeMappings.push({
          id: mapping.id,
          externalStoreId: mapping.externalStoreId,
          externalStoreName: mapping.externalStoreName,
          externalStoreAddress: mapping.externalStoreAddress,
          branchId: mapping.branchId,
          branchName: mapping.branchName,
          isActive: mapping.isActive,
        });
      }

      const accountsWithMappings = Array.from(accountsMap.values());

      // Get item mappings for these accounts
      const accountIds = accountsWithMappings.map(a => a.account.id);
      const itemMappings = accountIds.length > 0
        ? await this.itemMappingRepo
            .createQueryBuilder('m')
            .where('m.accountId IN (:...accountIds)', { accountIds })
            .andWhere('m.isActive = :isActive', { isActive: true })
            .getMany()
        : [];

      this.logger.log(`[getFoodPlatformSync] Found ${accountsWithMappings.length} accounts, ${itemMappings.length} item mappings for branch ${branchId}`);

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
}
