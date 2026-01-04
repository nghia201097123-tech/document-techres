import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../database/entities';
import { ProductType } from '../../database/entities/product.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async findAll(tenantId: string, brandId?: string, productType?: ProductType) {
    const where: any = { tenantId };
    if (brandId) {
      where.brandId = brandId;
    }
    if (productType) {
      where.productType = productType;
    }
    return this.categoryRepository.find({
      where,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const category = await this.categoryRepository.findOne({
      where: { tenantId, id },
    });
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }
    return category;
  }

  async create(tenantId: string, brandId: string, createDto: CreateCategoryDto) {
    const category = this.categoryRepository.create({
      ...createDto,
      tenantId,
      brandId,
      isActive: true,
    });
    return this.categoryRepository.save(category);
  }

  async update(tenantId: string, id: string, updateDto: UpdateCategoryDto) {
    const category = await this.findOne(tenantId, id);
    Object.assign(category, updateDto);
    return this.categoryRepository.save(category);
  }

  async toggleActive(tenantId: string, id: string) {
    const category = await this.findOne(tenantId, id);
    category.isActive = !category.isActive;
    return this.categoryRepository.save(category);
  }

  async delete(tenantId: string, id: string) {
    const category = await this.findOne(tenantId, id);
    await this.categoryRepository.remove(category);
    return { message: 'Đã xóa danh mục' };
  }

  async countByType(tenantId: string, brandId?: string) {
    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .select('category.product_type', 'productType')
      .addSelect('COUNT(*)', 'count')
      .where('category.tenant_id = :tenantId', { tenantId });

    if (brandId) {
      queryBuilder.andWhere('category.brand_id = :brandId', { brandId });
    }

    return queryBuilder.groupBy('category.product_type').getRawMany();
  }
}
