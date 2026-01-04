import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff, Product, Category, Kitchen } from '../../database/entities';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Kitchen)
    private readonly kitchenRepository: Repository<Kitchen>,
  ) {}

  async getStats(tenantId: string, companyId?: string, branchId?: string, brandId?: string) {
    const staffWhere: any = { tenantId };
    if (companyId) staffWhere.companyId = companyId;
    if (branchId) staffWhere.branchId = branchId;

    const productWhere: any = { tenantId };
    if (brandId) productWhere.brandId = brandId;

    const categoryWhere: any = { tenantId };
    if (brandId) categoryWhere.brandId = brandId;

    const kitchenWhere: any = { tenantId };
    if (branchId) kitchenWhere.branchId = branchId;

    const [staffCount, productCount, categoryCount, kitchenCount] = await Promise.all([
      this.staffRepository.count({ where: staffWhere }),
      this.productRepository.count({ where: productWhere }),
      this.categoryRepository.count({ where: categoryWhere }),
      this.kitchenRepository.count({ where: kitchenWhere }),
    ]);

    const [activeStaff, activeProducts] = await Promise.all([
      this.staffRepository.count({ where: { ...staffWhere, isActive: true } }),
      this.productRepository.count({ where: { ...productWhere, isActive: true } }),
    ]);

    return {
      staff: {
        total: staffCount,
        active: activeStaff,
      },
      products: {
        total: productCount,
        active: activeProducts,
      },
      categories: {
        total: categoryCount,
      },
      kitchens: {
        total: kitchenCount,
      },
    };
  }

  async getRecentActivity(tenantId: string, limit = 10) {
    const [recentStaff, recentProducts] = await Promise.all([
      this.staffRepository.find({
        where: { tenantId },
        order: { createdAt: 'DESC' },
        take: limit,
        select: ['id', 'name', 'username', 'createdAt'],
      }),
      this.productRepository.find({
        where: { tenantId },
        order: { createdAt: 'DESC' },
        take: limit,
        select: ['id', 'name', 'code', 'createdAt'],
      }),
    ]);

    return {
      recentStaff,
      recentProducts,
    };
  }
}
