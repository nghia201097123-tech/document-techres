import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FoodPlatformAccount,
  AccountStatus,
  AuthType,
  FoodPlatformType,
} from '../../database/entities';
import { SyncAccountDto } from './dto/sync-account.dto';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(FoodPlatformAccount)
    private readonly accountRepo: Repository<FoodPlatformAccount>,
  ) {}

  /**
   * Sync account from api-admin
   * Create or update account based on ID
   */
  async syncAccount(dto: SyncAccountDto): Promise<{ success: boolean; message: string }> {
    try {
      // Handle delete
      if (dto.isDeleted) {
        const existing = await this.accountRepo.findOne({ where: { id: dto.id } });
        if (existing) {
          await this.accountRepo.remove(existing);
          this.logger.log(`Deleted account: ${dto.id}`);
        }
        return { success: true, message: 'Account deleted successfully' };
      }

      // Check if account exists
      const existing = await this.accountRepo.findOne({ where: { id: dto.id } });

      if (existing) {
        // Update existing account
        existing.tenantId = dto.tenantId;
        existing.branchId = dto.branchId;
        existing.displayName = dto.name;
        existing.platform = this.mapPlatform(dto.platform);
        existing.authType = this.mapAuthType(dto.authType);

        if (dto.status) {
          existing.status = this.mapStatus(dto.status);
        }
        if (dto.username !== undefined) {
          existing.username = dto.username;
        }
        if (dto.phoneNumber !== undefined) {
          existing.phoneNumber = dto.phoneNumber;
        }
        if (dto.externalMerchantId !== undefined) {
          existing.externalMerchantId = dto.externalMerchantId;
        }
        if (dto.externalStoreName !== undefined) {
          existing.externalMerchantName = dto.externalStoreName;
        }
        if (dto.pollIntervalSeconds !== undefined) {
          existing.pollIntervalSeconds = dto.pollIntervalSeconds;
        }
        if (dto.isActive !== undefined) {
          existing.isActive = dto.isActive;
        }

        await this.accountRepo.save(existing);
        this.logger.log(`Updated account: ${dto.name} (${dto.id})`);
        return { success: true, message: 'Account updated successfully' };
      } else {
        // Create new account
        const account = this.accountRepo.create({
          id: dto.id, // Use same ID from api-admin
          tenantId: dto.tenantId,
          branchId: dto.branchId,
          displayName: dto.name,
          platform: this.mapPlatform(dto.platform),
          authType: this.mapAuthType(dto.authType),
          status: dto.status ? this.mapStatus(dto.status) : AccountStatus.PENDING,
          username: dto.username,
          phoneNumber: dto.phoneNumber,
          externalMerchantId: dto.externalMerchantId,
          externalMerchantName: dto.externalStoreName,
          pollIntervalSeconds: dto.pollIntervalSeconds ?? 30,
          isActive: dto.isActive ?? false,
        });

        await this.accountRepo.save(account);
        this.logger.log(`Created account: ${dto.name} (${dto.id})`);
        return { success: true, message: 'Account created successfully' };
      }
    } catch (error: any) {
      this.logger.error(`Failed to sync account: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  private mapPlatform(platform: string): FoodPlatformType {
    const map: Record<string, FoodPlatformType> = {
      grab: FoodPlatformType.GRAB,
      befood: FoodPlatformType.BEFOOD,
      shopee_food: FoodPlatformType.SHOPEE_FOOD,
    };
    return map[platform] || FoodPlatformType.GRAB;
  }

  private mapAuthType(authType?: string): AuthType {
    if (authType === 'phone_otp') {
      return AuthType.PHONE_OTP;
    }
    return AuthType.USERNAME_PASSWORD;
  }

  private mapStatus(status: string): AccountStatus {
    const map: Record<string, AccountStatus> = {
      pending: AccountStatus.PENDING,
      connecting: AccountStatus.CONNECTING,
      connected: AccountStatus.CONNECTED,
      disconnected: AccountStatus.DISCONNECTED,
      error: AccountStatus.ERROR,
    };
    return map[status] || AccountStatus.PENDING;
  }
}
