import { Injectable, NotFoundException } from '@nestjs/common';
import { FoodPlatformType } from '../../database/entities';
import { GrabConnector } from './grab.connector';
import { ShopeeConnector } from './shopee.connector';
import { BeFoodConnector } from './befood.connector';
import { IPlatformConnector } from './interfaces/connector.interface';

/**
 * Connector Factory
 * Returns the appropriate platform connector based on platform type
 */
@Injectable()
export class ConnectorFactory {
  constructor(
    private readonly grabConnector: GrabConnector,
    private readonly shopeeConnector: ShopeeConnector,
    private readonly beFoodConnector: BeFoodConnector,
  ) {}

  /**
   * Get connector for a specific platform
   */
  getConnector(platform: FoodPlatformType): IPlatformConnector {
    switch (platform) {
      case FoodPlatformType.GRAB:
        return this.grabConnector;
      case FoodPlatformType.SHOPEE_FOOD:
        return this.shopeeConnector;
      case FoodPlatformType.BEFOOD:
        return this.beFoodConnector;
      default:
        throw new NotFoundException(`Platform ${platform} không được hỗ trợ`);
    }
  }

  /**
   * Get all available connectors
   */
  getAllConnectors(): IPlatformConnector[] {
    return [this.grabConnector, this.shopeeConnector, this.beFoodConnector];
  }

  /**
   * Check if platform is supported
   */
  isSupported(platform: FoodPlatformType): boolean {
    return Object.values(FoodPlatformType).includes(platform);
  }
}
