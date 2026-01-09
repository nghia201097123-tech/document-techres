import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SyncBranchDto {
  id: string;
  tenantId: string;
  brandId: string;
  name: string;
  code: string;
  logoUrl?: string;
  addressDetail?: string;
  provinceCode?: string;
  wardCode?: string;
  phone?: string;
  email?: string;
  manager?: string;
  openTime?: string;
  closeTime?: string;
  businessModel?: string;
  isActive: boolean;
}

export interface SyncBrandDto {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  code: string;
  logoUrl?: string;
  description?: string;
  businessModel?: string;
  isActive: boolean;
}

@Injectable()
export class DashboardSyncService {
  private readonly logger = new Logger(DashboardSyncService.name);
  private readonly dashboardApiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.dashboardApiUrl = this.configService.get<string>(
      'DASHBOARD_API_URL',
      'http://localhost:4002',
    );
  }

  /**
   * Sync a branch to dashboard API
   */
  async syncBranch(branch: SyncBranchDto): Promise<boolean> {
    try {
      this.logger.log(`Syncing branch: ${branch.name} (${branch.code})`);

      const response = await fetch(`${this.dashboardApiUrl}/api/sync/branch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(branch),
      });

      if (response.ok) {
        this.logger.log(`✅ Branch synced successfully: ${branch.code}`);
        return true;
      } else {
        const error = await response.text();
        this.logger.error(`❌ Branch sync failed: ${response.status} - ${error}`);
        return false;
      }
    } catch (error: any) {
      this.logger.error(`❌ Branch sync error: ${error.message}`);
      // Don't throw - sync failure should not block the main operation
      return false;
    }
  }

  /**
   * Sync a brand to dashboard API
   */
  async syncBrand(brand: SyncBrandDto): Promise<boolean> {
    try {
      this.logger.log(`Syncing brand: ${brand.name} (${brand.code})`);

      const response = await fetch(`${this.dashboardApiUrl}/api/sync/brand`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(brand),
      });

      if (response.ok) {
        this.logger.log(`✅ Brand synced successfully: ${brand.code}`);
        return true;
      } else {
        const error = await response.text();
        this.logger.error(`❌ Brand sync failed: ${response.status} - ${error}`);
        return false;
      }
    } catch (error: any) {
      this.logger.error(`❌ Brand sync error: ${error.message}`);
      return false;
    }
  }
}
