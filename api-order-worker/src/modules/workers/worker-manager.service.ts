import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Piscina from 'piscina';
import * as path from 'path';

export interface AccountData {
  id: string;
  platform: 'grab' | 'shopee_food' | 'befood';
  accessToken: string;
  branchId: string;
  tenantId: string;
}

export interface PollResult {
  success: boolean;
  accountId: string;
  platform: string;
  orders: RawFoodOrder[];
  orderStats?: {
    newCount: number;
    preparingCount: number;
    readyCount: number;
    deliveringCount: number;
  };
  pollInterval?: number;
  error?: string;
  isUnauthorized?: boolean;
  duration: number;
}

export interface RawFoodOrder {
  externalOrderId: string;
  orderCode: string;
  platform: string;
  status: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerNote?: string;
  driverName?: string;
  driverPhone?: string;
  driverAvatar?: string;
  driverLicensePlate?: string;
  items: any[];
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  discount: number;
  totalAmount: number;
  isPaid: boolean;
  paymentMethod?: string;
  estimatedDeliveryTime?: string;
  orderContentMessage?: string;
  createdAt?: Date;
  rawData?: any;
}

@Injectable()
export class WorkerManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerManagerService.name);

  private grabPool: Piscina;
  private shopeePool: Piscina;
  private beFoodPool: Piscina;

  async onModuleInit() {
    this.logger.log('Initializing Piscina worker pools...');

    const workerDir = path.resolve(__dirname, '../../workers');

    // GrabFood Worker Pool
    this.grabPool = new Piscina({
      filename: path.join(workerDir, 'grab-poll.worker.js'),
      minThreads: 2,
      maxThreads: 10,
      idleTimeout: 60000, // 1 minute
    });

    // ShopeeFood Worker Pool
    this.shopeePool = new Piscina({
      filename: path.join(workerDir, 'shopee-poll.worker.js'),
      minThreads: 2,
      maxThreads: 10,
      idleTimeout: 60000,
    });

    // BeFood Worker Pool
    this.beFoodPool = new Piscina({
      filename: path.join(workerDir, 'befood-poll.worker.js'),
      minThreads: 2,
      maxThreads: 10,
      idleTimeout: 60000,
    });

    this.logger.log('✅ Piscina worker pools initialized');
    this.logger.log(`   - Grab: ${this.grabPool.threads.length} threads`);
    this.logger.log(`   - Shopee: ${this.shopeePool.threads.length} threads`);
    this.logger.log(`   - BeFood: ${this.beFoodPool.threads.length} threads`);
  }

  async onModuleDestroy() {
    this.logger.log('Destroying Piscina worker pools...');

    await Promise.all([
      this.grabPool?.destroy(),
      this.shopeePool?.destroy(),
      this.beFoodPool?.destroy(),
    ]);

    this.logger.log('✅ Piscina worker pools destroyed');
  }

  /**
   * Poll orders from GrabFood
   */
  async pollGrabOrders(account: AccountData): Promise<PollResult> {
    try {
      return await this.grabPool.run(account);
    } catch (error: any) {
      this.logger.error(`[Grab Worker Error] ${error.message}`);
      return {
        success: false,
        accountId: account.id,
        platform: 'grab',
        orders: [],
        error: error.message,
        duration: 0,
      };
    }
  }

  /**
   * Poll orders from ShopeeFood
   */
  async pollShopeeOrders(account: AccountData): Promise<PollResult> {
    try {
      return await this.shopeePool.run(account);
    } catch (error: any) {
      this.logger.error(`[Shopee Worker Error] ${error.message}`);
      return {
        success: false,
        accountId: account.id,
        platform: 'shopee_food',
        orders: [],
        error: error.message,
        duration: 0,
      };
    }
  }

  /**
   * Poll orders from BeFood
   */
  async pollBeFoodOrders(account: AccountData): Promise<PollResult> {
    try {
      return await this.beFoodPool.run(account);
    } catch (error: any) {
      this.logger.error(`[BeFood Worker Error] ${error.message}`);
      return {
        success: false,
        accountId: account.id,
        platform: 'befood',
        orders: [],
        error: error.message,
        duration: 0,
      };
    }
  }

  /**
   * Poll multiple accounts in parallel
   * Each account is processed by its respective platform worker
   */
  async pollMultipleAccounts(accounts: AccountData[]): Promise<PollResult[]> {
    const startTime = Date.now();
    this.logger.log(`[pollMultipleAccounts] Starting poll for ${accounts.length} accounts`);

    const promises = accounts.map((account) => {
      switch (account.platform) {
        case 'grab':
          return this.pollGrabOrders(account);
        case 'shopee_food':
          return this.pollShopeeOrders(account);
        case 'befood':
          return this.pollBeFoodOrders(account);
        default:
          return Promise.resolve({
            success: false,
            accountId: account.id,
            platform: account.platform,
            orders: [],
            error: `Unknown platform: ${account.platform}`,
            duration: 0,
          } as PollResult);
      }
    });

    const results = await Promise.all(promises);

    const totalDuration = Date.now() - startTime;
    const successCount = results.filter((r) => r.success).length;
    const totalOrders = results.reduce((sum, r) => sum + r.orders.length, 0);

    this.logger.log(
      `[pollMultipleAccounts] Completed in ${totalDuration}ms: ` +
        `${successCount}/${accounts.length} accounts, ${totalOrders} orders`,
    );

    return results;
  }

  /**
   * Get worker pool statistics
   */
  getPoolStats() {
    return {
      grab: {
        completed: this.grabPool?.completed || 0,
        waiting: this.grabPool?.queueSize || 0,
        threads: this.grabPool?.threads?.length || 0,
        runTime: this.grabPool?.runTime?.average || 0,
      },
      shopee: {
        completed: this.shopeePool?.completed || 0,
        waiting: this.shopeePool?.queueSize || 0,
        threads: this.shopeePool?.threads?.length || 0,
        runTime: this.shopeePool?.runTime?.average || 0,
      },
      befood: {
        completed: this.beFoodPool?.completed || 0,
        waiting: this.beFoodPool?.queueSize || 0,
        threads: this.beFoodPool?.threads?.length || 0,
        runTime: this.beFoodPool?.runTime?.average || 0,
      },
    };
  }
}
