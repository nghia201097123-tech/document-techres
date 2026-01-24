import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FoodPlatformAccount,
  FoodPlatformExternalItem,
  FoodPlatformItemMapping,
  ItemMappingType,
} from '../../database/entities';
import { AccountsService } from '../accounts/accounts.service';

/**
 * DTO for creating/updating item mapping
 */
export interface CreateItemMappingDto {
  externalItemId: string; // UUID of FoodPlatformExternalItem
  techresBrandId: string; // UUID string of TechRes brand
  techresBrandName?: string;
  techresItemId: string; // UUID string of TechRes item/product
  techresItemName?: string;
  mappingType?: ItemMappingType;
  comboItems?: { itemId: string; quantity: number; itemName?: string }[];
}

/**
 * DTO for batch item mapping
 */
export interface BatchItemMappingDto {
  mappings: CreateItemMappingDto[];
}

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(
    @InjectRepository(FoodPlatformExternalItem)
    private readonly externalItemRepo: Repository<FoodPlatformExternalItem>,
    @InjectRepository(FoodPlatformItemMapping)
    private readonly itemMappingRepo: Repository<FoodPlatformItemMapping>,
    @InjectRepository(FoodPlatformAccount)
    private readonly accountRepo: Repository<FoodPlatformAccount>,
    private readonly accountsService: AccountsService,
  ) {}

  /**
   * Sync menu items from platform to database
   * Calls getMenu API and saves items to food_platform_external_items
   */
  async syncMenu(accountId: string): Promise<{
    success: boolean;
    syncedCount: number;
    updatedCount: number;
    categories: number;
    message: string;
  }> {
    this.logger.log(`[syncMenu] Syncing menu for account ${accountId}...`);

    // Get account to ensure it exists
    const account = await this.accountsService.getAccountById(accountId);

    // Get menu from platform
    const menu = await this.accountsService.getMenu(accountId);

    if (!menu?.categories?.length) {
      return {
        success: true,
        syncedCount: 0,
        updatedCount: 0,
        categories: 0,
        message: 'Không có món ăn nào trong menu',
      };
    }

    let syncedCount = 0;
    let updatedCount = 0;
    const syncedAt = new Date();

    // Process each category and its items
    for (const category of menu.categories) {
      const categoryId = category.categoryID || category.id;
      const categoryName = category.categoryName || category.name;

      this.logger.debug(`[syncMenu] Processing category: ${categoryName} (${categoryId})`);

      // Process items in this category
      const items = category.items || [];
      for (const item of items) {
        const externalItemId = item.itemID || item.id;
        const externalItemName = item.itemName || item.name;

        try {
          // Check if item already exists
          const existingItem = await this.externalItemRepo.findOne({
            where: {
              accountId: account.id,
              externalItemId,
            },
          });

          if (existingItem) {
            // Update existing item
            existingItem.externalItemName = externalItemName;
            existingItem.description = item.description || null;
            existingItem.priceInMin = item.priceInMin || 0;
            existingItem.priceDisplay = item.priceDisplay || null;
            existingItem.imageUrl = item.imageURL || item.imageUrl || null;
            existingItem.externalCategoryId = categoryId;
            existingItem.externalCategoryName = categoryName;
            existingItem.availableStatus = item.availableStatus ?? 1;
            existingItem.isActive = (item.availableStatus ?? 1) === 1;
            existingItem.rawData = item;
            existingItem.syncedAt = syncedAt;

            await this.externalItemRepo.save(existingItem);
            updatedCount++;
          } else {
            // Create new item
            const newItem = this.externalItemRepo.create({
              tenantId: account.tenantId,
              accountId: account.id,
              externalItemId,
              externalItemName,
              description: item.description || null,
              priceInMin: item.priceInMin || 0,
              priceDisplay: item.priceDisplay || null,
              imageUrl: item.imageURL || item.imageUrl || null,
              externalCategoryId: categoryId,
              externalCategoryName: categoryName,
              availableStatus: item.availableStatus ?? 1,
              isActive: (item.availableStatus ?? 1) === 1,
              isMapped: false,
              rawData: item,
              syncedAt,
            });

            await this.externalItemRepo.save(newItem);
            syncedCount++;
          }
        } catch (error: any) {
          this.logger.error(`[syncMenu] Error syncing item ${externalItemId}: ${error?.message}`);
        }
      }
    }

    this.logger.log(`[syncMenu] Sync completed: ${syncedCount} new, ${updatedCount} updated`);

    return {
      success: true,
      syncedCount,
      updatedCount,
      categories: menu.categories.length,
      message: `Đồng bộ thành công ${syncedCount} món ăn mới, cập nhật ${updatedCount} món từ ${menu.categories.length} danh mục`,
    };
  }

  /**
   * Get synced external items for an account
   */
  async getExternalItems(
    accountId: string,
    options?: { categoryId?: string; includeInactive?: boolean },
  ): Promise<FoodPlatformExternalItem[]> {
    const where: any = { accountId };

    if (options?.categoryId) {
      where.externalCategoryId = options.categoryId;
    }

    if (!options?.includeInactive) {
      where.isActive = true;
    }

    return this.externalItemRepo.find({
      where,
      order: {
        externalCategoryName: 'ASC',
        externalItemName: 'ASC',
      },
    });
  }

  /**
   * Get external items grouped by category
   */
  async getExternalItemsByCategory(
    accountId: string,
  ): Promise<{ categoryId: string; categoryName: string; items: FoodPlatformExternalItem[] }[]> {
    const items = await this.getExternalItems(accountId);

    // Group by category
    const categoryMap = new Map<string, { categoryName: string; items: FoodPlatformExternalItem[] }>();

    for (const item of items) {
      if (!categoryMap.has(item.externalCategoryId)) {
        categoryMap.set(item.externalCategoryId, {
          categoryName: item.externalCategoryName,
          items: [],
        });
      }
      categoryMap.get(item.externalCategoryId)!.items.push(item);
    }

    // Convert to array
    return Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.categoryName,
      items: data.items,
    }));
  }

  /**
   * Get external item by ID
   */
  async getExternalItemById(itemId: string): Promise<FoodPlatformExternalItem> {
    const item = await this.externalItemRepo.findOne({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException(`Không tìm thấy món ăn với ID: ${itemId}`);
    }
    return item;
  }

  /**
   * Create item mapping
   */
  async createItemMapping(
    accountId: string,
    dto: CreateItemMappingDto,
  ): Promise<FoodPlatformItemMapping> {
    const account = await this.accountsService.getAccountById(accountId);
    const externalItem = await this.getExternalItemById(dto.externalItemId);

    // Check if mapping already exists
    const existingMapping = await this.itemMappingRepo.findOne({
      where: {
        accountId,
        externalItemId: dto.externalItemId,
      },
    });

    if (existingMapping) {
      throw new BadRequestException('Món ăn này đã được liên kết');
    }

    // Create mapping
    const mapping = this.itemMappingRepo.create({
      tenantId: account.tenantId,
      accountId,
      externalItemId: dto.externalItemId,
      externalPlatformItemId: externalItem.externalItemId,
      externalItemName: externalItem.externalItemName,
      techresBrandId: dto.techresBrandId,
      techresBrandName: dto.techresBrandName || null,
      techresItemId: dto.techresItemId,
      techresItemName: dto.techresItemName || null,
      mappingType: dto.mappingType || ItemMappingType.DIRECT,
      comboItems: dto.comboItems || null,
      isActive: true,
    });

    const savedMapping = await this.itemMappingRepo.save(mapping);

    // Update external item as mapped
    externalItem.isMapped = true;
    await this.externalItemRepo.save(externalItem);

    return savedMapping;
  }

  /**
   * Update item mapping
   */
  async updateItemMapping(
    mappingId: string,
    dto: Partial<CreateItemMappingDto>,
  ): Promise<FoodPlatformItemMapping> {
    const mapping = await this.itemMappingRepo.findOne({ where: { id: mappingId } });
    if (!mapping) {
      throw new NotFoundException(`Không tìm thấy liên kết với ID: ${mappingId}`);
    }

    // Update fields
    if (dto.techresBrandId !== undefined) {
      mapping.techresBrandId = dto.techresBrandId;
    }
    if (dto.techresBrandName !== undefined) {
      mapping.techresBrandName = dto.techresBrandName;
    }
    if (dto.techresItemId !== undefined) {
      mapping.techresItemId = dto.techresItemId;
    }
    if (dto.techresItemName !== undefined) {
      mapping.techresItemName = dto.techresItemName;
    }
    if (dto.mappingType !== undefined) {
      mapping.mappingType = dto.mappingType;
    }
    if (dto.comboItems !== undefined) {
      mapping.comboItems = dto.comboItems;
    }

    return this.itemMappingRepo.save(mapping);
  }

  /**
   * Delete item mapping
   */
  async deleteItemMapping(mappingId: string): Promise<void> {
    const mapping = await this.itemMappingRepo.findOne({
      where: { id: mappingId },
      relations: ['externalItem'],
    });

    if (!mapping) {
      throw new NotFoundException(`Không tìm thấy liên kết với ID: ${mappingId}`);
    }

    // Update external item as not mapped
    if (mapping.externalItemId) {
      const externalItem = await this.externalItemRepo.findOne({
        where: { id: mapping.externalItemId },
      });
      if (externalItem) {
        externalItem.isMapped = false;
        await this.externalItemRepo.save(externalItem);
      }
    }

    await this.itemMappingRepo.remove(mapping);
  }

  /**
   * Get item mappings for an account
   */
  async getItemMappings(accountId: string): Promise<FoodPlatformItemMapping[]> {
    return this.itemMappingRepo.find({
      where: { accountId },
      relations: ['externalItem'],
      order: { externalItemName: 'ASC' },
    });
  }

  /**
   * Get item mapping by external item ID
   */
  async getMappingByExternalItemId(
    accountId: string,
    externalItemId: string,
  ): Promise<FoodPlatformItemMapping | null> {
    return this.itemMappingRepo.findOne({
      where: {
        accountId,
        externalItemId,
      },
    });
  }

  /**
   * Batch create/update item mappings
   */
  async batchItemMappings(
    accountId: string,
    dto: BatchItemMappingDto,
  ): Promise<{
    success: boolean;
    createdCount: number;
    updatedCount: number;
    message: string;
  }> {
    let createdCount = 0;
    let updatedCount = 0;

    for (const mappingDto of dto.mappings) {
      try {
        const existingMapping = await this.getMappingByExternalItemId(
          accountId,
          mappingDto.externalItemId,
        );

        if (existingMapping) {
          // Update existing mapping
          await this.updateItemMapping(existingMapping.id, mappingDto);
          updatedCount++;
        } else {
          // Create new mapping
          await this.createItemMapping(accountId, mappingDto);
          createdCount++;
        }
      } catch (error: any) {
        this.logger.error(`[batchItemMappings] Error: ${error?.message}`);
      }
    }

    return {
      success: true,
      createdCount,
      updatedCount,
      message: `Tạo mới ${createdCount} liên kết, cập nhật ${updatedCount} liên kết`,
    };
  }

  /**
   * Get sync status for an account
   */
  async getSyncStatus(accountId: string): Promise<{
    totalItems: number;
    mappedItems: number;
    unmappedItems: number;
    lastSyncedAt: Date | null;
  }> {
    const items = await this.externalItemRepo.find({ where: { accountId } });

    const totalItems = items.length;
    const mappedItems = items.filter((item) => item.isMapped).length;
    const unmappedItems = totalItems - mappedItems;
    const lastSyncedAt = items.length > 0
      ? items.reduce((max, item) => {
          if (!item.syncedAt) return max;
          if (!max) return item.syncedAt;
          return item.syncedAt > max ? item.syncedAt : max;
        }, null as Date | null)
      : null;

    return {
      totalItems,
      mappedItems,
      unmappedItems,
      lastSyncedAt,
    };
  }
}
