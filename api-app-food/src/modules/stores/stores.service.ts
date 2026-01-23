import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  FoodPlatformStoreMapping,
  FoodPlatformAccount,
  FoodPlatformType,
} from '../../database/entities';
import { ConnectorFactory, MerchantStore } from '../connectors';
import {
  CreateStoreMappingsDto,
  UpdateStoreMappingDto,
  ToggleStoreMappingDto,
} from './dto/store-mapping.dto';

@Injectable()
export class StoresService {
  private readonly logger = new Logger(StoresService.name);

  constructor(
    @InjectRepository(FoodPlatformStoreMapping)
    private readonly storeMappingRepo: Repository<FoodPlatformStoreMapping>,
    @InjectRepository(FoodPlatformAccount)
    private readonly accountRepo: Repository<FoodPlatformAccount>,
    private readonly connectorFactory: ConnectorFactory,
  ) {}

  /**
   * Get all store mappings for an account
   */
  async getMappingsByAccount(accountId: string): Promise<FoodPlatformStoreMapping[]> {
    return this.storeMappingRepo.find({
      where: { accountId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all store mappings for a branch
   */
  async getMappingsByBranch(branchId: number): Promise<FoodPlatformStoreMapping[]> {
    return this.storeMappingRepo.find({
      where: { branchId, isActive: true },
      relations: ['account'],
    });
  }

  /**
   * Get active mappings for a branch (for polling)
   */
  async getActiveMappingsForBranch(
    branchId: number,
  ): Promise<FoodPlatformStoreMapping[]> {
    return this.storeMappingRepo.find({
      where: {
        branchId,
        isActive: true,
      },
      relations: ['account'],
    });
  }

  /**
   * Get store mapping by ID
   */
  async getMappingById(id: string): Promise<FoodPlatformStoreMapping> {
    const mapping = await this.storeMappingRepo.findOne({
      where: { id },
      relations: ['account'],
    });
    if (!mapping) {
      throw new NotFoundException(`Không tìm thấy mapping với ID: ${id}`);
    }
    return mapping;
  }

  /**
   * Create store mappings for an account
   */
  async createMappings(
    accountId: string,
    dto: CreateStoreMappingsDto,
  ): Promise<FoodPlatformStoreMapping[]> {
    // Get account
    const account = await this.accountRepo.findOne({ where: { id: accountId } });
    if (!account) {
      throw new NotFoundException(`Không tìm thấy tài khoản với ID: ${accountId}`);
    }

    // Validate: check for duplicate branch mappings within same platform
    const branchIds = dto.mappings.map((m) => m.branchId);
    const existingMappings = await this.storeMappingRepo.find({
      where: {
        branchId: In(branchIds),
      },
      relations: ['account'],
    });

    const conflictingMappings = existingMappings.filter(
      (m) => m.account.platform === account.platform && m.accountId !== accountId,
    );

    if (conflictingMappings.length > 0) {
      const conflictBranches = conflictingMappings.map((m) => m.branchId);
      throw new BadRequestException(
        `Các chi nhánh ${conflictBranches.join(', ')} đã được mapping với platform ${account.platform}`,
      );
    }

    // Create mappings
    const mappings = dto.mappings.map((item) =>
      this.storeMappingRepo.create({
        accountId,
        tenantId: account.tenantId,
        externalStoreId: item.externalStoreId,
        externalStoreName: item.externalStoreName,
        externalStoreAddress: item.externalStoreAddress,
        externalStorePhone: item.externalStorePhone,
        branchId: item.branchId,
        branchName: item.branchName,
        isActive: true,
        isStoreActive: true,
      }),
    );

    return this.storeMappingRepo.save(mappings);
  }

  /**
   * Update store mapping
   */
  async updateMapping(
    id: string,
    dto: UpdateStoreMappingDto,
  ): Promise<FoodPlatformStoreMapping> {
    const mapping = await this.getMappingById(id);

    if (dto.branchId !== undefined) {
      // Check for conflicts
      const existingMapping = await this.storeMappingRepo.findOne({
        where: {
          branchId: dto.branchId,
          accountId: mapping.accountId,
        },
      });

      if (existingMapping && existingMapping.id !== id) {
        throw new BadRequestException(
          `Chi nhánh ${dto.branchId} đã được mapping với account này`,
        );
      }

      mapping.branchId = dto.branchId;
    }

    if (dto.branchName !== undefined) {
      mapping.branchName = dto.branchName;
    }

    if (dto.isActive !== undefined) {
      mapping.isActive = dto.isActive;
    }

    return this.storeMappingRepo.save(mapping);
  }

  /**
   * Toggle store mapping active status
   */
  async toggleMapping(
    id: string,
    dto: ToggleStoreMappingDto,
  ): Promise<FoodPlatformStoreMapping> {
    const mapping = await this.getMappingById(id);
    mapping.isActive = dto.isActive;
    return this.storeMappingRepo.save(mapping);
  }

  /**
   * Delete store mapping
   */
  async deleteMapping(id: string): Promise<void> {
    const mapping = await this.getMappingById(id);
    await this.storeMappingRepo.remove(mapping);
  }

  /**
   * Sync store info from platform
   */
  async syncStoreInfo(id: string): Promise<FoodPlatformStoreMapping> {
    const mapping = await this.getMappingById(id);
    const account = mapping.account;

    if (!account) {
      throw new BadRequestException('Account không hợp lệ');
    }

    const connector = this.connectorFactory.getConnector(account.platform);
    const stores = await connector.getStores(account);

    const store = stores.find((s: MerchantStore) => s.externalStoreId === mapping.externalStoreId);

    if (store) {
      mapping.externalStoreName = store.name;
      mapping.externalStoreAddress = store.address ?? null;
      mapping.externalStorePhone = store.phone ?? null;
      mapping.isStoreActive = store.isActive;
      mapping.lastSyncedAt = new Date();
    }

    return this.storeMappingRepo.save(mapping);
  }

  /**
   * Get food platform status for a branch
   */
  async getBranchPlatformStatus(branchId: number): Promise<any> {
    const mappings = await this.storeMappingRepo.find({
      where: { branchId },
      relations: ['account'],
    });

    const platforms = Object.values(FoodPlatformType);
    const status = platforms.map((platform) => {
      const mapping = mappings.find((m) => m.account?.platform === platform);
      return {
        platform,
        isConnected: !!mapping,
        isActive: mapping?.isActive || false,
        storeName: mapping?.externalStoreName,
        storeId: mapping?.externalStoreId,
        accountId: mapping?.accountId,
        mappingId: mapping?.id,
      };
    });

    return {
      branchId,
      platforms: status,
      totalMappings: mappings.length,
      activeMappings: mappings.filter((m) => m.isActive).length,
    };
  }
}
