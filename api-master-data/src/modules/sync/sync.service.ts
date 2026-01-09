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
      // First, get the branch to find the brand_id
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

      const [categories, products, areas, tables, staff] = await Promise.all([
        this.categoryRepository.find({
          where: { brandId, isActive: true },
          order: { sortOrder: 'ASC' },
        }),
        this.productRepository.find({
          where: { brandId, isActive: true },
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
      ]);

      console.log(`[SyncService.getFullSync] Found: categories=${categories.length}, products=${products.length}, areas=${areas.length}, tables=${tables.length}, staff=${staff.length}`);

      const syncTime = new Date().toISOString();

      return {
        success: true,
        data: {
          categories: categories.map(this.mapCategory),
          products: products.map(this.mapProduct),
          areas: areas.map(this.mapArea),
          tables: tables.map(this.mapTable),
          staff: staff.map(this.mapStaff),
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
}
