import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In } from 'typeorm';
import { Category, Product, Area, Table, Staff, Device, Brand, Branch, StaffBranch } from '../../entities';
import {
  FullSyncResponseDto,
  IncrementalSyncResponseDto,
  CategoryDto,
  ProductDto,
  AreaDto,
  TableDto,
  StaffDto,
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
  ) {}

  /**
   * Sync brands and branches based on staff's permissions
   * Returns only brands/branches that the staff has access to
   * If no explicit permissions, fallback to all branches for the tenant
   */
  async getStaffBranchPermissions(staffId: string, tenantId?: string): Promise<StaffBranchPermissionsSyncDto> {
    // Get all branch assignments for this staff
    const staffBranches = await this.staffBranchRepository.find({
      where: { staffId },
      relations: ['branch', 'brand'],
    });

    // If staff has explicit permissions, use them
    if (staffBranches.length > 0) {
      return this.buildPermissionsFromStaffBranches(staffBranches);
    }

    // Fallback: Get all brands and branches for the tenant
    console.log(`[SyncService] No staff_branches for staffId=${staffId}, using fallback for tenantId=${tenantId}`);

    // Get all brands with their branches
    const brands = await this.brandRepository.find({
      relations: ['branches'],
    });

    if (brands.length === 0) {
      console.log('[SyncService] No brands found, returning empty');
      return {
        data: [],
        defaultBranchId: '',
        syncedAt: new Date().toISOString(),
      };
    }

    // Build response from all brands/branches
    const brandMap = new Map<string, BrandWithBranchesDto>();
    let defaultBranchId = '';

    for (const brand of brands) {
      if (!brand.branches || brand.branches.length === 0) continue;

      brandMap.set(brand.id, {
        brand: {
          id: brand.id,
          name: brand.name || '',
          code: brand.code || '',
          logoUrl: brand.logoUrl || '',
          isActive: brand.isActive ?? true,
        },
        branches: brand.branches.map((branch, index) => {
          // First branch of first brand is default
          const isDefault = !defaultBranchId && index === 0;
          if (isDefault) {
            defaultBranchId = branch.id;
          }
          return {
            id: branch.id,
            brandId: brand.id,
            name: branch.name || '',
            storeCode: '',
            address: branch.address || '',
            phone: branch.phone || '',
            isDefault,
            status: 'active',
          };
        }),
      });
    }

    console.log(`[SyncService] Fallback returned ${brandMap.size} brands, defaultBranchId=${defaultBranchId}`);

    return {
      data: Array.from(brandMap.values()),
      defaultBranchId,
      syncedAt: new Date().toISOString(),
    };
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
    const [categories, products, areas, tables, staff] = await Promise.all([
      this.categoryRepository.find({
        where: { branchId },
        order: { displayOrder: 'ASC' },
      }),
      this.productRepository.find({
        where: { branchId },
        order: { displayOrder: 'ASC' },
      }),
      this.areaRepository.find({
        where: { branchId },
        order: { displayOrder: 'ASC' },
      }),
      this.tableRepository.find({
        where: { branchId },
        order: { displayOrder: 'ASC' },
      }),
      this.staffRepository.find({
        where: { branchId },
      }),
    ]);

    const syncedAt = new Date().toISOString();

    return {
      categories: categories.map(this.mapCategory),
      products: products.map(this.mapProduct),
      areas: areas.map(this.mapArea),
      tables: tables.map(this.mapTable),
      staff: staff.map(this.mapStaff),
      syncedAt,
    };
  }

  async getIncrementalSync(
    branchId: string,
    since: Date,
  ): Promise<IncrementalSyncResponseDto> {
    const [categories, products, areas, tables, staff] = await Promise.all([
      this.categoryRepository.find({
        where: { branchId, updatedAt: MoreThan(since) },
        order: { displayOrder: 'ASC' },
      }),
      this.productRepository.find({
        where: { branchId, updatedAt: MoreThan(since) },
        order: { displayOrder: 'ASC' },
      }),
      this.areaRepository.find({
        where: { branchId, updatedAt: MoreThan(since) },
        order: { displayOrder: 'ASC' },
      }),
      this.tableRepository.find({
        where: { branchId, updatedAt: MoreThan(since) },
        order: { displayOrder: 'ASC' },
      }),
      this.staffRepository.find({
        where: { branchId, updatedAt: MoreThan(since) },
      }),
    ]);

    const syncedAt = new Date().toISOString();

    // TODO: Implement deleted records tracking
    // For now, return empty arrays for deleted IDs
    const deletedIds = {
      categories: [],
      products: [],
      areas: [],
      tables: [],
      staff: [],
    };

    return {
      categories: categories.map(this.mapCategory),
      products: products.map(this.mapProduct),
      areas: areas.map(this.mapArea),
      tables: tables.map(this.mapTable),
      staff: staff.map(this.mapStaff),
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
      displayOrder: category.displayOrder,
      imageUrl: category.imageUrl || '',
      isActive: category.isActive,
      version: category.version,
      updatedAt: category.updatedAt.toISOString(),
    };
  }

  private mapProduct(product: Product): ProductDto {
    return {
      id: product.id,
      categoryId: product.categoryId,
      code: product.code,
      name: product.name,
      description: product.description || '',
      price: Number(product.price),
      imageUrl: product.imageUrl || '',
      unit: product.unit || '',
      vatRate: Number(product.vatRate),
      isActive: product.isActive,
      displayOrder: product.displayOrder,
      version: product.version,
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  private mapArea(area: Area): AreaDto {
    return {
      id: area.id,
      name: area.name,
      displayOrder: area.displayOrder,
      isActive: area.isActive,
      version: area.version,
      updatedAt: area.updatedAt.toISOString(),
    };
  }

  private mapTable(table: Table): TableDto {
    return {
      id: table.id,
      areaId: table.areaId,
      name: table.name,
      capacity: table.capacity,
      status: table.status,
      displayOrder: table.displayOrder,
      isActive: table.isActive,
      version: table.version,
      updatedAt: table.updatedAt.toISOString(),
    };
  }

  private mapStaff(staff: Staff): StaffDto {
    return {
      id: staff.id,
      code: staff.code,
      name: staff.name,
      phone: staff.phone || '',
      pinCode: staff.pinCode,
      role: staff.role,
      avatarUrl: staff.avatarUrl || '',
      isActive: staff.isActive,
      version: staff.version,
      updatedAt: staff.updatedAt.toISOString(),
    };
  }
}
