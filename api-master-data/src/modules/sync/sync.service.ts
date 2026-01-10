import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Category, Product, BranchProduct, Area, Table, Staff, Device, Brand, Branch, StaffBranch, SeasonalPrice, SeasonalPriceProduct, Coupon, ToppingGroup, ToppingGroupItem, ProductToppingGroup, ProductNote, ProductNoteAssignment, ComboItem } from '../../entities';
import {
  FullSyncResponseDto,
  IncrementalSyncResponseDto,
  CategoryDto,
  ProductDto,
  AreaDto,
  TableDto,
  StaffDto,
  SeasonalPriceDto,
  CouponDto,
  ToppingGroupDto,
  ToppingItemDto,
  ProductNoteDto,
  StaffBranchPermissionsSyncDto,
  BrandWithBranchesDto,
} from './dto/sync.dto';

@Injectable()
export class SyncService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(BranchProduct)
    private branchProductRepository: Repository<BranchProduct>,
    @InjectRepository(Area)
    private areaRepository: Repository<Area>,
    @InjectRepository(Table)
    private tableRepository: Repository<Table>,
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    @InjectRepository(Brand)
    private brandRepository: Repository<Brand>,
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
    @InjectRepository(StaffBranch)
    private staffBranchRepository: Repository<StaffBranch>,
    @InjectRepository(SeasonalPrice)
    private seasonalPriceRepository: Repository<SeasonalPrice>,
    @InjectRepository(SeasonalPriceProduct)
    private seasonalPriceProductRepository: Repository<SeasonalPriceProduct>,
    @InjectRepository(Coupon)
    private couponRepository: Repository<Coupon>,
    @InjectRepository(ToppingGroup)
    private toppingGroupRepository: Repository<ToppingGroup>,
    @InjectRepository(ToppingGroupItem)
    private toppingGroupItemRepository: Repository<ToppingGroupItem>,
    @InjectRepository(ProductToppingGroup)
    private productToppingGroupRepository: Repository<ProductToppingGroup>,
    @InjectRepository(ProductNote)
    private productNoteRepository: Repository<ProductNote>,
    @InjectRepository(ProductNoteAssignment)
    private productNoteAssignmentRepository: Repository<ProductNoteAssignment>,
    @InjectRepository(ComboItem)
    private comboItemRepository: Repository<ComboItem>,
  ) {}

  /**
   * Sync brands and branches based on staff's permissions
   * - If staff is OWNER: Return ALL brands/branches for the tenant
   * - Otherwise: Return only brands/branches that staff has explicit access to
   *
   * Note: The staffId param may be OAuth user ID (from JWT sub), not the actual staff.id
   * We use the email from JWT to find the real staff by username
   */
  async getStaffBranchPermissions(staffId: string, tenantId?: string, email?: string, role?: string): Promise<StaffBranchPermissionsSyncDto> {
    console.log(`[SyncService.getStaffBranchPermissions] staffId=${staffId}, tenantId=${tenantId}, email=${email}, role=${role}`);

    // If user is OWNER, return all brands and branches for the tenant
    if (role === 'owner' && tenantId) {
      console.log(`[SyncService.getStaffBranchPermissions] User is OWNER, returning all brands/branches for tenant ${tenantId}`);
      return this.getAllBrandsAndBranches(tenantId);
    }

    // First, try to find the real staff by username from email
    // Email format: tr000001@tenant-NHC.local -> username = tr000001
    let realStaffId = staffId;
    let staffRole = role;

    if (email && tenantId) {
      const username = this.extractUsernameFromEmail(email);
      console.log(`[SyncService.getStaffBranchPermissions] Extracted username: ${username}`);

      if (username) {
        const staff = await this.staffRepository.findOne({
          where: { username, tenantId },
        });

        if (staff) {
          realStaffId = staff.id;
          staffRole = staff.role;
          console.log(`[SyncService.getStaffBranchPermissions] Found staff by username: ${staff.id} (${staff.name}), role: ${staff.role}`);

          // Check again if staff is owner
          if (staff.role === 'owner') {
            console.log(`[SyncService.getStaffBranchPermissions] Staff is OWNER, returning all brands/branches`);
            return this.getAllBrandsAndBranches(tenantId);
          }
        } else {
          console.log(`[SyncService.getStaffBranchPermissions] No staff found with username=${username}, tenantId=${tenantId}`);
        }
      }
    }

    // Get all branch assignments for this staff
    const staffBranches = await this.staffBranchRepository.find({
      where: { staffId: realStaffId },
      relations: ['branch', 'brand'],
    });

    console.log(`[SyncService.getStaffBranchPermissions] Found ${staffBranches.length} branch permissions for staff ${realStaffId}`);

    // Only return data that staff has explicit permissions for
    if (staffBranches.length === 0) {
      console.log(`[SyncService.getStaffBranchPermissions] No permissions found for staff ${realStaffId}, returning empty`);
      return {
        data: [],
        defaultBranchId: '',
        syncedAt: new Date().toISOString(),
      };
    }

    return this.buildPermissionsFromStaffBranches(staffBranches);
  }

  /**
   * Get ALL brands and branches for a tenant (for OWNER role)
   */
  private async getAllBrandsAndBranches(tenantId: string): Promise<StaffBranchPermissionsSyncDto> {
    const brands = await this.brandRepository.find({
      where: { tenantId, isActive: true },
    });

    if (brands.length === 0) {
      console.log(`[SyncService.getAllBrandsAndBranches] No brands found for tenant ${tenantId}`);
      return {
        data: [],
        defaultBranchId: '',
        syncedAt: new Date().toISOString(),
      };
    }

    const brandIds = brands.map(b => b.id);
    const branches = await this.branchRepository.find({
      where: { brandId: In(brandIds), isActive: true },
    });

    console.log(`[SyncService.getAllBrandsAndBranches] Found ${brands.length} brands, ${branches.length} branches for tenant ${tenantId}`);

    const brandMap = new Map<string, BrandWithBranchesDto>();
    let defaultBranchId = '';

    for (const brand of brands) {
      brandMap.set(brand.id, {
        brand: {
          id: brand.id,
          name: brand.name,
          code: brand.code || '',
          logoUrl: brand.logoUrl || '',
          isActive: brand.isActive,
        },
        branches: [],
      });
    }

    for (const branch of branches) {
      if (brandMap.has(branch.brandId)) {
        const isDefault = !defaultBranchId; // First branch is default
        if (isDefault) {
          defaultBranchId = branch.id;
        }
        brandMap.get(branch.brandId)!.branches.push({
          id: branch.id,
          brandId: branch.brandId,
          name: branch.name,
          storeCode: branch.code || '',
          address: branch.address || '',
          phone: branch.phone || '',
          isDefault,
          status: 'active',
        });
      }
    }

    return {
      data: Array.from(brandMap.values()),
      defaultBranchId,
      syncedAt: new Date().toISOString(),
    };
  }

  /**
   * Extract username from email
   * Email format: tr000001@tenant-NHC.local -> username = tr000001
   */
  private extractUsernameFromEmail(email: string): string | null {
    if (!email) return null;
    const atIndex = email.indexOf('@');
    if (atIndex === -1) return null;
    return email.substring(0, atIndex);
  }

  /**
   * Build permissions response from staff_branches records
   */
  private async buildPermissionsFromStaffBranches(staffBranches: StaffBranch[]): Promise<StaffBranchPermissionsSyncDto> {
    const brandMap = new Map<string, BrandWithBranchesDto>();
    let defaultBranchId = '';

    for (const sb of staffBranches) {
      if (sb.isDefault) {
        defaultBranchId = sb.branchId;
      }

      if (!brandMap.has(sb.brandId)) {
        const brand = sb.brand || await this.brandRepository.findOne({ where: { id: sb.brandId } });
        brandMap.set(sb.brandId, {
          brand: {
            id: brand?.id || sb.brandId,
            name: brand?.name || '',
            code: brand?.code || '',
            logoUrl: brand?.logoUrl || '',
            isActive: brand?.isActive ?? true,
          },
          branches: [],
        });
      }

      const branch = sb.branch || await this.branchRepository.findOne({ where: { id: sb.branchId } });
      brandMap.get(sb.brandId)!.branches.push({
        id: branch?.id || sb.branchId,
        brandId: sb.brandId,
        name: branch?.name || '',
        storeCode: '',
        address: branch?.address || '',
        phone: branch?.phone || '',
        isDefault: sb.isDefault,
        status: 'active',
      });
    }

    // If no default was set, use first branch
    if (!defaultBranchId && brandMap.size > 0) {
      const firstBrand = brandMap.values().next().value;
      if (firstBrand && firstBrand.branches.length > 0) {
        defaultBranchId = firstBrand.branches[0].id;
        firstBrand.branches[0].isDefault = true;
      }
    }

    return {
      data: Array.from(brandMap.values()),
      defaultBranchId,
      syncedAt: new Date().toISOString(),
    };
  }

  async getFullSync(branchId: string): Promise<FullSyncResponseDto> {
    try {
      const branch = await this.branchRepository.findOne({
        where: { id: branchId },
      });

      if (!branch) {
        return {
          success: false,
          data: null,
          syncTime: new Date().toISOString(),
          message: 'Branch not found',
        };
      }

      const brandId = branch.brandId;
      console.log(`[SyncService.getFullSync] branchId=${branchId}, brandId=${brandId}`);

      const today = new Date();
      const tenantId = branch.tenantId;
      console.log(`[SyncService.getFullSync] tenantId=${tenantId}, branchId=${branchId}, brandId=${brandId}`);

      const [categories, branchProducts, areas, tables, staff, seasonalPrices, coupons, toppingGroups, productNotes] = await Promise.all([
        this.categoryRepository.find({
          where: { brandId, tenantId, isActive: true },
          order: { sortOrder: 'ASC' },
        }),
        // Only filter by tenantId if it's not null/undefined
        tenantId ? this.branchProductRepository.find({
          where: { branchId, tenantId, isAvailable: true },
          relations: ['product'],
          order: { sortOrder: 'ASC' },
        }) : this.branchProductRepository.find({
          where: { branchId, isAvailable: true },
          relations: ['product'],
          order: { sortOrder: 'ASC' },
        }),
        this.areaRepository.find({
          where: { branchId, isActive: true },
          order: { sortOrder: 'ASC' },
        }),
        this.tableRepository.find({
          where: { branchId, isActive: true },
          order: { sortOrder: 'ASC' },
        }),
        this.staffRepository.find({
          where: { branchId, isActive: true },
        }),
        this.seasonalPriceRepository.find({
          where: { branchId, isActive: true },
          order: { sortOrder: 'ASC' },
        }),
        this.couponRepository.find({
          where: { branchId, isActive: true },
          order: { sortOrder: 'ASC' },
        }),
        tenantId ? this.toppingGroupRepository.find({
          where: { tenantId, isActive: true },
          order: { sortOrder: 'ASC' },
        }) : Promise.resolve([]),
        tenantId ? this.productNoteRepository.find({
          where: { tenantId, isActive: true },
          order: { sortOrder: 'ASC' },
        }) : Promise.resolve([]),
      ]);

      // Log branchProducts info for debugging
      console.log(`[SyncService.getFullSync] branchProducts count: ${branchProducts.length}`);
      if (branchProducts.length > 0) {
        const sampleProducts = branchProducts.slice(0, 5).map(bp => ({
          bpTenantId: bp.tenantId,
          productTenantId: bp.product?.tenantId,
          productName: bp.product?.name,
          categoryId: bp.product?.categoryId,
        }));
        console.log(`[SyncService.getFullSync] Sample branchProducts:`, JSON.stringify(sampleProducts));
      }

      const products = branchProducts
        .filter(bp => {
          if (!bp.product || !bp.product.isActive) return false;
          // If tenantId is set, filter by it
          if (tenantId) {
            return bp.product.tenantId === tenantId;
          }
          return true;
        })
        .map(bp => this.mapBranchProduct(bp));

      console.log(`[SyncService.getFullSync] Filtered products count: ${products.length}`);

      // Log product types distribution for debugging
      const productTypeCount = products.reduce((acc, p) => {
        acc[p.type] = (acc[p.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(`[SyncService.getFullSync] Product types distribution:`, productTypeCount);

      // Log topping products specifically
      const toppingProducts = products.filter(p => p.type === 'topping');
      if (toppingProducts.length > 0) {
        console.log(`[SyncService.getFullSync] Topping products:`, toppingProducts.map(p => ({ id: p.id, name: p.name, type: p.type })));
      }

      const seasonalPriceIds = seasonalPrices.map(sp => sp.id);
      const seasonalPriceProducts = seasonalPriceIds.length > 0
        ? await this.seasonalPriceProductRepository.find({
            where: { seasonalPriceId: In(seasonalPriceIds) },
          })
        : [];

      // Fetch topping group items and product mappings
      const toppingGroupIds = toppingGroups.map(tg => tg.id);
      const productNoteIds = productNotes.map(pn => pn.id);
      const productIds = products.map(p => p.id);
      const [toppingGroupItems, productToppingGroups, productNoteAssignments, comboItems] = await Promise.all([
        toppingGroupIds.length > 0
          ? this.toppingGroupItemRepository.find({
              where: { groupId: In(toppingGroupIds) },
              relations: ['topping'],
              order: { sortOrder: 'ASC' },
            })
          : Promise.resolve([]),
        toppingGroupIds.length > 0
          ? this.productToppingGroupRepository.find({
              where: { groupId: In(toppingGroupIds) },
            })
          : Promise.resolve([]),
        productNoteIds.length > 0
          ? this.productNoteAssignmentRepository.find({
              where: { noteId: In(productNoteIds) },
            })
          : Promise.resolve([]),
        // Fetch combo items for combo products
        tenantId
          ? this.comboItemRepository.find({
              where: { tenantId, isActive: true },
              relations: ['product'],
              order: { sortOrder: 'ASC' },
            })
          : Promise.resolve([]),
      ]);

      console.log(`[SyncService.getFullSync] Found: categories=${categories.length}, products=${products.length}, areas=${areas.length}, tables=${tables.length}, staff=${staff.length}, seasonalPrices=${seasonalPrices.length}, coupons=${coupons.length}, toppingGroups=${toppingGroups.length}, productNotes=${productNotes.length}, comboItems=${comboItems.length}`);

      const syncTime = new Date().toISOString();

      return {
        success: true,
        data: {
          categories: categories.map(this.mapCategory),
          products,
          areas: areas.map(this.mapArea),
          tables: tables.map(this.mapTable),
          staff: staff.map(this.mapStaff),
          seasonalPrices: seasonalPrices.map(sp => this.mapSeasonalPrice(sp, seasonalPriceProducts)),
          coupons: coupons.map(c => this.mapCoupon(c)),
          toppingGroups: toppingGroups.map(tg => this.mapToppingGroup(tg, toppingGroupItems, productToppingGroups)),
          productNotes: productNotes.map(pn => this.mapProductNote(pn, productNoteAssignments)),
          comboItems: comboItems.map(ci => this.mapComboItem(ci)),
        },
        syncTime,
        message: null,
      };
    } catch (error) {
      console.error(`[SyncService.getFullSync] Error:`, error);
      return {
        success: false,
        data: null,
        syncTime: new Date().toISOString(),
        message: error.message || 'Sync failed',
      };
    }
  }

  async getIncrementalSync(
    branchId: string,
    since: Date,
  ): Promise<IncrementalSyncResponseDto> {
    const branch = await this.branchRepository.findOne({
      where: { id: branchId },
    });
    const brandId = branch?.brandId;
    const tenantId = branch?.tenantId;

    const [categories, branchProducts, areas, tables, staff, seasonalPrices, coupons] = await Promise.all([
      (brandId && tenantId) ? this.categoryRepository.find({
        where: { brandId, tenantId, updatedAt: MoreThan(since) },
        order: { sortOrder: 'ASC' },
      }) : Promise.resolve([]),
      (branchId && tenantId) ? this.branchProductRepository.find({
        where: { branchId, tenantId, isAvailable: true, updatedAt: MoreThan(since) },
        relations: ['product'],
        order: { sortOrder: 'ASC' },
      }) : Promise.resolve([]),
      this.areaRepository.find({
        where: { branchId, updatedAt: MoreThan(since) },
        order: { sortOrder: 'ASC' },
      }),
      this.tableRepository.find({
        where: { branchId, updatedAt: MoreThan(since) },
        order: { sortOrder: 'ASC' },
      }),
      this.staffRepository.find({
        where: { branchId, updatedAt: MoreThan(since) },
      }),
      this.seasonalPriceRepository.find({
        where: { branchId, updatedAt: MoreThan(since) },
        order: { sortOrder: 'ASC' },
      }),
      this.couponRepository.find({
        where: { branchId, updatedAt: MoreThan(since) },
        order: { sortOrder: 'ASC' },
      }),
    ]);

    const products = branchProducts
      .filter(bp => bp.product && bp.product.isActive && bp.product.tenantId === tenantId)
      .map(bp => this.mapBranchProduct(bp));

    const seasonalPriceIds = seasonalPrices.map(sp => sp.id);
    const seasonalPriceProducts = seasonalPriceIds.length > 0
      ? await this.seasonalPriceProductRepository.find({
          where: { seasonalPriceId: In(seasonalPriceIds) },
        })
      : [];

    const syncedAt = new Date().toISOString();

    const deletedIds = {
      categories: [],
      products: [],
      areas: [],
      tables: [],
      staff: [],
      seasonalPrices: [],
      coupons: [],
    };

    return {
      categories: categories.map(this.mapCategory),
      products,
      areas: areas.map(this.mapArea),
      tables: tables.map(this.mapTable),
      staff: staff.map(this.mapStaff),
      seasonalPrices: seasonalPrices.map(sp => this.mapSeasonalPrice(sp, seasonalPriceProducts)),
      coupons: coupons.map(c => this.mapCoupon(c)),
      deletedIds,
      syncedAt,
    };
  }

  async updateDeviceSyncTime(deviceId: string): Promise<void> {
    await this.deviceRepository.update(
      { deviceId },
      { lastSyncAt: new Date() },
    );
  }

  private mapCategory(category: Category): CategoryDto {
    return {
      id: category.id,
      name: category.name,
      description: category.description || null,
      imageUrl: category.imageUrl || null,
      sortOrder: category.sortOrder || 0,
      isActive: category.isActive,
      createdAt: category.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }

  private mapProduct(product: Product): ProductDto {
    return {
      id: product.id,
      categoryId: product.categoryId || null,
      code: product.code,
      name: product.name,
      description: product.description || null,
      imageUrl: product.imageUrl || null,
      price: Number(product.price),
      costPrice: Number(product.costPrice || 0),
      vatRate: Number(product.vatRate || 0),
      unit: product.unit || null,
      type: product.productType || 'food',
      isAvailable: product.isAvailable ?? true,
      isActive: product.isActive,
      sortOrder: product.sortOrder || 0,
      preparationTime: product.preparationTime || 0,
      printToKitchen: product.printDish ?? true,
      printToBar: product.printLabel ?? false,
      createdAt: product.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  private mapBranchProduct(bp: BranchProduct): ProductDto {
    const product = bp.product;
    const price = bp.customPrice !== null ? Number(bp.customPrice) : Number(product.price);
    return {
      id: product.id,
      categoryId: product.categoryId || null,
      code: product.code,
      name: product.name,
      description: product.description || null,
      imageUrl: product.imageUrl || null,
      price,
      costPrice: Number(product.costPrice || 0),
      vatRate: Number(product.vatRate || 0),
      unit: product.unit || null,
      type: product.productType || 'food',
      isAvailable: bp.isAvailable,
      isActive: product.isActive,
      sortOrder: bp.sortOrder || product.sortOrder || 0,
      preparationTime: product.preparationTime || 0,
      printToKitchen: product.printDish ?? true,
      printToBar: product.printLabel ?? false,
      createdAt: product.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: bp.updatedAt?.toISOString() || product.updatedAt.toISOString(),
    };
  }

  private mapArea(area: Area): AreaDto {
    return {
      id: area.id,
      name: area.name,
      description: area.description || null,
      sortOrder: area.sortOrder || 0,
      isActive: area.isActive,
      createdAt: area.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: area.updatedAt.toISOString(),
    };
  }

  private mapTable(table: Table): TableDto {
    return {
      id: table.id,
      areaId: table.areaId || null,
      name: table.name,
      capacity: table.capacity,
      sortOrder: table.sortOrder || 0,
      isActive: table.isActive,
      createdAt: table.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: table.updatedAt.toISOString(),
    };
  }

  private mapStaff(staff: Staff): StaffDto {
    return {
      id: staff.id,
      code: staff.code,
      name: staff.name,
      phone: staff.phone || null,
      email: staff.email || null,
      avatarUrl: staff.avatarUrl || null,
      pinCode: staff.pinCode || '',
      role: staff.role,
      permissions: staff.permissions || null,
      isActive: staff.isActive,
      createdAt: staff.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: staff.updatedAt.toISOString(),
    };
  }

  private mapSeasonalPrice(sp: SeasonalPrice, allProducts: SeasonalPriceProduct[]): SeasonalPriceDto {
    const products = allProducts
      .filter(p => p.seasonalPriceId === sp.id)
      .map(p => ({ productId: p.productId }));

    return {
      id: sp.id,
      name: sp.name,
      description: sp.description || null,
      adjustmentType: sp.adjustmentType,
      adjustmentValue: Number(sp.adjustmentValue),
      startDate: sp.startDate instanceof Date ? sp.startDate.toISOString().split('T')[0] : String(sp.startDate),
      endDate: sp.endDate instanceof Date ? sp.endDate.toISOString().split('T')[0] : String(sp.endDate),
      sortOrder: sp.sortOrder || 0,
      isActive: sp.isActive,
      products,
      createdAt: sp.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: sp.updatedAt.toISOString(),
    };
  }

  private mapCoupon(c: Coupon): CouponDto {
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      description: c.description || null,
      couponType: c.couponType,
      discountValue: Number(c.discountValue),
      maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : null,
      minOrderAmount: Number(c.minOrderAmount || 0),
      usageLimit: c.usageLimit || null,
      usageCount: c.usageCount || 0,
      dailyLimit: c.dailyLimit || null,
      dailyUsageCount: c.dailyUsageCount || 0,
      requiresApproval: c.requiresApproval || false,
      approvalThreshold: c.approvalThreshold ? Number(c.approvalThreshold) : null,
      startDate: c.startDate instanceof Date ? c.startDate.toISOString().split('T')[0] : (c.startDate ? String(c.startDate) : null),
      endDate: c.endDate instanceof Date ? c.endDate.toISOString().split('T')[0] : (c.endDate ? String(c.endDate) : null),
      sortOrder: c.sortOrder || 0,
      isActive: c.isActive,
      createdAt: c.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }

  private mapToppingGroup(
    tg: ToppingGroup,
    allItems: ToppingGroupItem[],
    allProductMappings: ProductToppingGroup[],
  ): ToppingGroupDto {
    // Filter items for this topping group
    const groupItems = allItems.filter(item => item.groupId === tg.id);

    // Filter product mappings for this topping group
    const productMappings = allProductMappings.filter(ptg => ptg.groupId === tg.id);
    const productIds = productMappings.map(ptg => ptg.productId);

    return {
      id: tg.id,
      name: tg.name,
      groupType: 'topping', // Default group type
      isRequired: tg.isRequired,
      isMultiple: tg.maxSelection > 1,
      minSelect: tg.minSelection,
      maxSelect: tg.maxSelection,
      sortOrder: tg.sortOrder || 0,
      isActive: tg.isActive,
      toppings: groupItems.map(item => this.mapToppingItem(item)),
      productIds: productIds.length > 0 ? productIds : null,
      createdAt: tg.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: tg.updatedAt.toISOString(),
    };
  }

  private mapToppingItem(item: ToppingGroupItem): ToppingItemDto {
    const topping = item.topping;
    return {
      id: item.toppingId,
      code: topping?.code || null,
      name: topping?.name || '',
      price: Number(item.priceAdjustment) || 0,
      isDefault: false,
      maxQuantity: item.maxQuantity || 5,
      sortOrder: item.sortOrder || 0,
      isActive: topping?.isActive ?? true,
    };
  }

  private mapProductNote(
    note: ProductNote,
    allAssignments: ProductNoteAssignment[],
  ): ProductNoteDto {
    // Filter product IDs assigned to this note
    const noteAssignments = allAssignments.filter(a => a.noteId === note.id);
    const productIds = noteAssignments.map(a => a.productId);

    return {
      id: note.id,
      name: note.name,
      description: note.description,
      sortOrder: note.sortOrder,
      isActive: note.isActive,
      productIds: productIds,
      createdAt: note.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  private mapComboItem(ci: ComboItem): any {
    return {
      id: ci.id,
      comboId: ci.comboId,
      productId: ci.productId,
      productName: ci.product?.name || '',
      productCode: ci.product?.code || '',
      quantity: ci.quantity,
      sortOrder: ci.sortOrder,
      isActive: ci.isActive,
      createdAt: ci.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: ci.updatedAt?.toISOString() || new Date().toISOString(),
    };
  }
}
