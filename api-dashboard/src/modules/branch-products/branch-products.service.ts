import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { BranchProduct, Branch, Product, SeasonalPrice, SeasonalPriceProduct } from '../../database/entities';
import { AdjustmentType } from '../../database/entities/seasonal-price.entity';
import { UpdateBranchProductDto, BulkToggleAvailabilityDto } from './dto';

@Injectable()
export class BranchProductsService {
  constructor(
    @InjectRepository(BranchProduct)
    private readonly branchProductRepository: Repository<BranchProduct>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(SeasonalPrice)
    private readonly seasonalPriceRepository: Repository<SeasonalPrice>,
    @InjectRepository(SeasonalPriceProduct)
    private readonly seasonalPriceProductRepository: Repository<SeasonalPriceProduct>,
  ) {}

  /**
   * Get all products for a branch with availability status and seasonal price info
   */
  async findAllByBranch(tenantId: string, branchId: string) {
    // Get branch to verify it exists and get brandId
    const branch = await this.branchRepository.findOne({
      where: { id: branchId, tenantId },
    });
    if (!branch) {
      throw new NotFoundException('Không tìm thấy chi nhánh');
    }

    // Get all products for the brand
    const products = await this.productRepository.find({
      where: { tenantId, brandId: branch.brandId },
    });

    // Get branch product assignments
    const branchProducts = await this.branchProductRepository.find({
      where: { tenantId, branchId },
    });

    // Create a map for quick lookup
    const branchProductMap = new Map(
      branchProducts.map(bp => [bp.productId, bp])
    );

    // Get active seasonal prices for this branch
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeSeasonalPrices = await this.seasonalPriceRepository.find({
      where: {
        tenantId,
        branchId,
        isActive: true,
        startDate: LessThanOrEqual(today),
        endDate: MoreThanOrEqual(today),
      },
      relations: ['seasonalPriceProducts'],
    });

    // Build a map of productId -> seasonal price info
    const productSeasonalPriceMap = new Map<string, {
      seasonalPriceId: string;
      seasonalPriceName: string;
      adjustmentType: AdjustmentType;
      adjustmentValue: number;
      startDate: Date;
      endDate: Date;
    }>();

    for (const sp of activeSeasonalPrices) {
      for (const spp of sp.seasonalPriceProducts || []) {
        // If a product already has a seasonal price, keep the first one
        if (!productSeasonalPriceMap.has(spp.productId)) {
          productSeasonalPriceMap.set(spp.productId, {
            seasonalPriceId: sp.id,
            seasonalPriceName: sp.name,
            adjustmentType: sp.adjustmentType,
            adjustmentValue: Number(sp.adjustmentValue),
            startDate: sp.startDate,
            endDate: sp.endDate,
          });
        }
      }
    }

    // Combine products with their branch availability and seasonal price
    const combined = products.map(product => {
      const branchProduct = branchProductMap.get(product.id);
      const seasonalPriceInfo = productSeasonalPriceMap.get(product.id);

      // Calculate effective price considering customPrice and seasonalPrice
      const basePrice = Number(product.price);
      const customPrice = branchProduct?.customPrice ? Number(branchProduct.customPrice) : null;
      const effectiveBasePrice = customPrice ?? basePrice;

      let seasonalPrice = null;
      if (seasonalPriceInfo) {
        let adjustedPrice = effectiveBasePrice;
        if (seasonalPriceInfo.adjustmentType === AdjustmentType.PERCENTAGE) {
          adjustedPrice = effectiveBasePrice * (1 + seasonalPriceInfo.adjustmentValue / 100);
        } else {
          adjustedPrice = effectiveBasePrice + seasonalPriceInfo.adjustmentValue;
        }
        seasonalPrice = {
          ...seasonalPriceInfo,
          originalPrice: effectiveBasePrice,
          adjustedPrice: Math.round(adjustedPrice),
        };
      }

      return {
        ...product,
        branchProductId: branchProduct?.id || null,
        isAvailable: branchProduct?.isAvailable ?? true, // Default to available if not set
        customPrice: customPrice,
        branchSortOrder: branchProduct?.sortOrder || product.sortOrder,
        seasonalPrice,
      };
    });

    // Sort by isAvailable DESC first, then by sortOrder and name
    return combined.sort((a, b) => {
      // Sort by isAvailable DESC (true before false)
      if (a.isAvailable !== b.isAvailable) {
        return a.isAvailable ? -1 : 1;
      }
      // Then by sortOrder ASC
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      // Then by name ASC
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Get only available products for a branch
   */
  async findAvailableByBranch(tenantId: string, branchId: string) {
    const allProducts = await this.findAllByBranch(tenantId, branchId);
    return allProducts.filter(p => p.isAvailable && p.isActive);
  }

  /**
   * Update a single branch product assignment
   */
  async update(
    tenantId: string,
    branchId: string,
    productId: string,
    dto: UpdateBranchProductDto,
  ) {
    // Find or create branch product
    let branchProduct = await this.branchProductRepository.findOne({
      where: { tenantId, branchId, productId },
    });

    if (!branchProduct) {
      branchProduct = this.branchProductRepository.create({
        tenantId,
        branchId,
        productId,
        isAvailable: dto.isAvailable ?? true,
        customPrice: dto.customPrice,
        sortOrder: dto.sortOrder ?? 0,
      });
    } else {
      if (dto.isAvailable !== undefined) {
        branchProduct.isAvailable = dto.isAvailable;
      }
      if (dto.customPrice !== undefined) {
        branchProduct.customPrice = dto.customPrice;
      }
      if (dto.sortOrder !== undefined) {
        branchProduct.sortOrder = dto.sortOrder;
      }
    }

    return this.branchProductRepository.save(branchProduct);
  }

  /**
   * Toggle availability for a product at a branch
   */
  async toggleAvailability(tenantId: string, branchId: string, productId: string) {
    let branchProduct = await this.branchProductRepository.findOne({
      where: { tenantId, branchId, productId },
    });

    if (!branchProduct) {
      // Create new record with isAvailable = false (toggling from default true)
      branchProduct = this.branchProductRepository.create({
        tenantId,
        branchId,
        productId,
        isAvailable: false,
      });
    } else {
      branchProduct.isAvailable = !branchProduct.isAvailable;
    }

    return this.branchProductRepository.save(branchProduct);
  }

  /**
   * Bulk toggle availability for multiple products
   */
  async bulkToggleAvailability(
    tenantId: string,
    branchId: string,
    dto: BulkToggleAvailabilityDto,
  ) {
    const { productIds, isAvailable } = dto;

    // Get existing branch products
    const existingBranchProducts = await this.branchProductRepository.find({
      where: { tenantId, branchId, productId: In(productIds) },
    });

    const existingMap = new Map(
      existingBranchProducts.map(bp => [bp.productId, bp])
    );

    const toSave: BranchProduct[] = [];

    for (const productId of productIds) {
      let branchProduct = existingMap.get(productId);
      if (!branchProduct) {
        branchProduct = this.branchProductRepository.create({
          tenantId,
          branchId,
          productId,
          isAvailable,
        });
      } else {
        branchProduct.isAvailable = isAvailable;
      }
      toSave.push(branchProduct);
    }

    await this.branchProductRepository.save(toSave);

    return { updated: toSave.length };
  }

  /**
   * Sync branch products for a brand (create missing entries for all branches)
   * Called when a new product is created
   */
  async syncProductToAllBranches(tenantId: string, brandId: string, productId: string) {
    // Get all branches for the brand
    const branches = await this.branchRepository.find({
      where: { tenantId, brandId },
    });

    // Create branch product entries for each branch
    const branchProducts = branches.map(branch =>
      this.branchProductRepository.create({
        tenantId,
        branchId: branch.id,
        productId,
        isAvailable: true, // Default to available
      })
    );

    // Use upsert to avoid duplicates
    await this.branchProductRepository
      .createQueryBuilder()
      .insert()
      .into(BranchProduct)
      .values(branchProducts)
      .orIgnore() // Ignore if already exists
      .execute();

    return { synced: branches.length };
  }

  /**
   * Sync all products to a new branch
   * Called when a new branch is created
   */
  async syncAllProductsToBranch(tenantId: string, brandId: string, branchId: string) {
    // Get all products for the brand
    const products = await this.productRepository.find({
      where: { tenantId, brandId },
    });

    // Create branch product entries for each product
    const branchProducts = products.map(product =>
      this.branchProductRepository.create({
        tenantId,
        branchId,
        productId: product.id,
        isAvailable: true,
      })
    );

    // Use upsert to avoid duplicates
    if (branchProducts.length > 0) {
      await this.branchProductRepository
        .createQueryBuilder()
        .insert()
        .into(BranchProduct)
        .values(branchProducts)
        .orIgnore()
        .execute();
    }

    return { synced: products.length };
  }

  /**
   * Get branch product statistics
   */
  async getStatsByBranch(tenantId: string, branchId: string) {
    const branch = await this.branchRepository.findOne({
      where: { id: branchId, tenantId },
    });
    if (!branch) {
      throw new NotFoundException('Không tìm thấy chi nhánh');
    }

    // Get total products for brand
    const totalProducts = await this.productRepository.count({
      where: { tenantId, brandId: branch.brandId, isActive: true },
    });

    // Get available products count
    const branchProducts = await this.branchProductRepository.find({
      where: { tenantId, branchId },
    });

    // Products that are explicitly unavailable
    const unavailableCount = branchProducts.filter(bp => !bp.isAvailable).length;

    // Available = total - unavailable (products without records are considered available)
    const availableCount = totalProducts - unavailableCount;

    return {
      totalProducts,
      availableCount,
      unavailableCount,
    };
  }
}
