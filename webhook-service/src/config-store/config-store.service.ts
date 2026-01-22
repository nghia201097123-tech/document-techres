import { Injectable, Logger } from '@nestjs/common';

export interface PayOSConfig {
  orderCode: number;
  checksumKey: string;
  branchId: string;
  brandId?: string;
  registeredAt: Date;
  expiresAt: Date;
}

export interface RegisterConfigDto {
  orderCode: number;
  checksumKey: string;
  branchId: string;
  brandId?: string;
  ttlMinutes?: number; // Time to live in minutes, default 60
}

@Injectable()
export class ConfigStoreService {
  private readonly logger = new Logger(ConfigStoreService.name);
  private readonly configMap = new Map<number, PayOSConfig>();
  private readonly DEFAULT_TTL_MINUTES = 60;
  private readonly CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.startCleanupJob();
    this.logger.log('ConfigStoreService initialized for multi-tenant PayOS webhook');
  }

  /**
   * Register PayOS config for a specific orderCode
   * Called by api-dashboard when creating a payment
   */
  registerConfig(dto: RegisterConfigDto): { success: boolean; message: string } {
    const ttlMinutes = dto.ttlMinutes || this.DEFAULT_TTL_MINUTES;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    const config: PayOSConfig = {
      orderCode: dto.orderCode,
      checksumKey: dto.checksumKey,
      branchId: dto.branchId,
      brandId: dto.brandId,
      registeredAt: now,
      expiresAt,
    };

    this.configMap.set(dto.orderCode, config);

    this.logger.log(
      `Registered PayOS config for orderCode=${dto.orderCode}, branchId=${dto.branchId}, expires=${expiresAt.toISOString()}`,
    );

    return {
      success: true,
      message: `Config registered for orderCode ${dto.orderCode}`,
    };
  }

  /**
   * Get checksumKey for a specific orderCode
   * Returns undefined if not found or expired
   */
  getChecksumKey(orderCode: number): string | undefined {
    const config = this.configMap.get(orderCode);

    if (!config) {
      this.logger.debug(`No config found for orderCode=${orderCode}`);
      return undefined;
    }

    // Check if expired
    if (new Date() > config.expiresAt) {
      this.logger.debug(`Config expired for orderCode=${orderCode}`);
      this.configMap.delete(orderCode);
      return undefined;
    }

    return config.checksumKey;
  }

  /**
   * Get full config for a specific orderCode
   */
  getConfig(orderCode: number): PayOSConfig | undefined {
    const config = this.configMap.get(orderCode);

    if (!config) {
      return undefined;
    }

    // Check if expired
    if (new Date() > config.expiresAt) {
      this.configMap.delete(orderCode);
      return undefined;
    }

    return config;
  }

  /**
   * Remove config after payment is processed
   */
  removeConfig(orderCode: number): boolean {
    const deleted = this.configMap.delete(orderCode);
    if (deleted) {
      this.logger.debug(`Removed config for orderCode=${orderCode}`);
    }
    return deleted;
  }

  /**
   * Get stats for monitoring
   */
  getStats(): { totalConfigs: number; oldestConfigAge?: number } {
    const now = new Date();
    let oldestAge: number | undefined;

    for (const config of this.configMap.values()) {
      const age = now.getTime() - config.registeredAt.getTime();
      if (oldestAge === undefined || age > oldestAge) {
        oldestAge = age;
      }
    }

    return {
      totalConfigs: this.configMap.size,
      oldestConfigAge: oldestAge ? Math.floor(oldestAge / 1000 / 60) : undefined, // in minutes
    };
  }

  /**
   * Cleanup expired configs periodically
   */
  private startCleanupJob() {
    setInterval(() => {
      const now = new Date();
      let cleanedCount = 0;

      for (const [orderCode, config] of this.configMap.entries()) {
        if (now > config.expiresAt) {
          this.configMap.delete(orderCode);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.log(`Cleaned up ${cleanedCount} expired PayOS configs`);
      }
    }, this.CLEANUP_INTERVAL_MS);
  }
}
