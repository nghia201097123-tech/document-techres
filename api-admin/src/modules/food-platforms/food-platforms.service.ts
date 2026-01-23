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

@Injectable()
export class FoodPlatformsService {
  constructor(
    @InjectRepository(FoodPlatformAccount)
    private readonly foodPlatformRepo: Repository<FoodPlatformAccount>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
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
      query.where('fp.tenantId = :tenantId', { tenantId });
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
      where: { tenantId: companyCode },
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

    // Kiểm tra không trùng platform cho cùng branch
    const existing = await this.foodPlatformRepo.findOne({
      where: {
        branchId: dto.branchId,
        platform: dto.platform,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Chi nhánh này đã có cổng kết nối ${this.getPlatformName(dto.platform)}`,
      );
    }

    // Xác định auth type dựa trên platform
    const authType = dto.authType || this.getDefaultAuthType(dto.platform);

    // Tạo cổng kết nối
    const account = this.foodPlatformRepo.create({
      ...dto,
      tenantId: branch.brand.company.code,
      authType,
    });

    return this.foodPlatformRepo.save(account);
  }

  /**
   * Cập nhật cổng kết nối
   */
  async update(id: string, dto: UpdateFoodPlatformDto): Promise<FoodPlatformAccount> {
    const account = await this.findOne(id);

    Object.assign(account, dto);

    return this.foodPlatformRepo.save(account);
  }

  /**
   * Xóa cổng kết nối
   */
  async remove(id: string): Promise<void> {
    const account = await this.findOne(id);
    await this.foodPlatformRepo.remove(account);
  }

  /**
   * Toggle trạng thái kích hoạt
   */
  async toggleActive(id: string): Promise<FoodPlatformAccount> {
    const account = await this.findOne(id);
    account.isActive = !account.isActive;
    return this.foodPlatformRepo.save(account);
  }

  /**
   * Tạo cổng kết nối cho tất cả platforms cho một branch
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
      // Kiểm tra đã tồn tại chưa
      const existing = await this.foodPlatformRepo.findOne({
        where: { branchId, platform },
      });

      if (!existing) {
        const account = this.foodPlatformRepo.create({
          branchId,
          tenantId: branch.brand.company.code,
          name: `${this.getPlatformName(platform)} - ${branch.name}`,
          platform,
          authType: this.getDefaultAuthType(platform),
        });

        results.push(await this.foodPlatformRepo.save(account));
      }
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
}
