import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FoodPlatformAccount,
  FoodPlatformAuthType,
  FoodPlatformType,
} from '../../database/entities/food-platform-account.entity';
import { Branch } from '../../database/entities/branch.entity';
import { CreateFoodPlatformDto, UpdateFoodPlatformDto } from './dto';
import { DashboardSyncService } from '../../common/services/dashboard-sync.service';

@Injectable()
export class FoodPlatformsService {
  constructor(
    @InjectRepository(FoodPlatformAccount)
    private readonly foodPlatformRepo: Repository<FoodPlatformAccount>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    private readonly dashboardSyncService: DashboardSyncService,
  ) {}

  /**
   * Lấy danh sách tất cả cổng kết nối
   */
  async findAll(tenantId?: string): Promise<FoodPlatformAccount[]> {
    const query = this.foodPlatformRepo
      .createQueryBuilder('fp')
      .leftJoinAndSelect('fp.branch', 'branch')
      .orderBy('fp.sortOrder', 'ASC')
      .addOrderBy('fp.createdAt', 'DESC');

    if (tenantId) {
      query.where('fp.tenantId = :tenantId', { tenantId: tenantId.toUpperCase() });
    }

    return query.getMany();
  }

  /**
   * Lấy danh sách cổng kết nối theo chi nhánh
   */
  async findByBranch(branchId: string): Promise<FoodPlatformAccount[]> {
    return this.foodPlatformRepo.find({
      where: { branchId },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  /**
   * Lấy danh sách cổng kết nối theo công ty (tenant)
   */
  async findByCompany(companyCode: string): Promise<FoodPlatformAccount[]> {
    return this.foodPlatformRepo.find({
      where: { tenantId: companyCode.toUpperCase() },
      relations: ['branch'],
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  /**
   * Lấy chi tiết một cổng kết nối
   */
  async findOne(id: string): Promise<FoodPlatformAccount> {
    const account = await this.foodPlatformRepo.findOne({
      where: { id },
      relations: ['branch'],
    });

    if (!account) {
      throw new NotFoundException(`Không tìm thấy cổng kết nối với ID: ${id}`);
    }

    return account;
  }

  /**
   * Tạo cổng kết nối mới
   */
  async create(dto: CreateFoodPlatformDto): Promise<FoodPlatformAccount> {
    // Kiểm tra branch tồn tại
    const branch = await this.branchRepo.findOne({
      where: { id: dto.branchId },
      relations: ['brand', 'brand.company'],
    });

    if (!branch) {
      throw new NotFoundException(`Không tìm thấy chi nhánh với ID: ${dto.branchId}`);
    }

    // Tính shopNumber tiếp theo cho platform này trong branch
    const existingCount = await this.foodPlatformRepo.count({
      where: {
        branchId: dto.branchId,
        platform: dto.platform,
      },
    });
    const shopNumber = existingCount + 1;

    // Xác định auth type dựa trên platform
    const authType = dto.authType || this.getDefaultAuthType(dto.platform);

    // Tạo cổng kết nối (tenantId uppercase để khớp với api-dashboard)
    const account = this.foodPlatformRepo.create({
      ...dto,
      tenantId: branch.brand.company.code.toUpperCase(),
      authType,
      shopNumber,
    });

    const savedAccount = await this.foodPlatformRepo.save(account);

    // Sync to dashboard
    this.syncToDashboard(savedAccount);

    return savedAccount;
  }

  /**
   * Cập nhật cổng kết nối
   */
  async update(id: string, dto: UpdateFoodPlatformDto): Promise<FoodPlatformAccount> {
    const account = await this.findOne(id);

    Object.assign(account, dto);

    const savedAccount = await this.foodPlatformRepo.save(account);

    // Sync to dashboard
    this.syncToDashboard(savedAccount);

    return savedAccount;
  }

  /**
   * Xóa cổng kết nối
   */
  async remove(id: string): Promise<void> {
    const account = await this.findOne(id);

    // Sync delete to dashboard
    this.dashboardSyncService.syncFoodPlatform({
      id: account.id,
      tenantId: account.tenantId,
      branchId: account.branchId,
      name: account.name,
      platform: account.platform,
      isDeleted: true,
    });

    await this.foodPlatformRepo.remove(account);
  }

  /**
   * Toggle trạng thái kích hoạt
   */
  async toggleActive(id: string): Promise<FoodPlatformAccount> {
    const account = await this.findOne(id);
    account.isActive = !account.isActive;
    const savedAccount = await this.foodPlatformRepo.save(account);

    // Sync to dashboard
    this.syncToDashboard(savedAccount);

    return savedAccount;
  }

  /**
   * Tạo cổng kết nối cho tất cả platforms cho một branch
   * Mỗi platform sẽ được tạo 1 cổng mới (shop #1, #2, ...)
   */
  async createAllPlatformsForBranch(branchId: string): Promise<FoodPlatformAccount[]> {
    const branch = await this.branchRepo.findOne({
      where: { id: branchId },
      relations: ['brand', 'brand.company'],
    });

    if (!branch) {
      throw new NotFoundException(`Không tìm thấy chi nhánh với ID: ${branchId}`);
    }

    const platforms = Object.values(FoodPlatformType);
    const results: FoodPlatformAccount[] = [];

    for (const platform of platforms) {
      // Tính shopNumber tiếp theo
      const existingCount = await this.foodPlatformRepo.count({
        where: { branchId, platform },
      });
      const shopNumber = existingCount + 1;

      const account = this.foodPlatformRepo.create({
        branchId,
        tenantId: branch.brand.company.code.toUpperCase(),
        name: `${this.getPlatformName(platform)} #${shopNumber} - ${branch.name}`,
        platform,
        authType: this.getDefaultAuthType(platform),
        shopNumber,
      });

      const savedAccount = await this.foodPlatformRepo.save(account);

      // Sync to dashboard
      this.syncToDashboard(savedAccount);

      results.push(savedAccount);
    }

    return results;
  }

  /**
   * Lấy tên hiển thị của platform
   */
  private getPlatformName(platform: FoodPlatformType): string {
    const names: Record<FoodPlatformType, string> = {
      [FoodPlatformType.GRAB]: 'GrabFood',
      [FoodPlatformType.BEFOOD]: 'BeFood',
      [FoodPlatformType.SHOPEE_FOOD]: 'Shopee Food',
    };
    return names[platform] || platform;
  }

  /**
   * Lấy auth type mặc định cho platform
   */
  private getDefaultAuthType(platform: FoodPlatformType): FoodPlatformAuthType {
    if (platform === FoodPlatformType.SHOPEE_FOOD) {
      return FoodPlatformAuthType.PHONE_OTP;
    }
    return FoodPlatformAuthType.USERNAME_PASSWORD;
  }

  /**
   * Sync food platform to dashboard (async, non-blocking)
   */
  private syncToDashboard(account: FoodPlatformAccount): void {
    // Fire and forget - sync không block main operation
    this.dashboardSyncService.syncFoodPlatform({
      id: account.id,
      tenantId: account.tenantId,
      branchId: account.branchId,
      name: account.name,
      platform: account.platform,
      authType: account.authType,
      status: account.status,
      username: account.username,
      phoneNumber: account.phoneNumber,
      externalMerchantId: account.externalMerchantId,
      externalStoreName: account.externalStoreName,
      pollIntervalSeconds: account.pollIntervalSeconds,
      shopNumber: account.shopNumber,
      sortOrder: account.sortOrder,
      isActive: account.isActive,
    });
  }
}
