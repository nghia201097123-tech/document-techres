import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductType } from '../../database/entities';
import { CreateProductDto, UpdateProductDto } from './dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async findAll(tenantId: string, brandId?: string, type?: ProductType) {
    const where: any = { tenantId };
    if (brandId) {
      where.brandId = brandId;
    }
    if (type) {
      where.type = type;
    }
    return this.productRepository.find({
      where,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const product = await this.productRepository.findOne({
      where: { tenantId, id },
    });
    if (!product) {
      throw new NotFoundException('Không tìm thấy món');
    }
    return product;
  }

  async create(tenantId: string, brandId: string, createDto: CreateProductDto) {
    const code = await this.generateCode(createDto.type);
    const product = this.productRepository.create({
      ...createDto,
      tenantId,
      brandId,
      code,
      isActive: true,
    });
    return this.productRepository.save(product);
  }

  async update(tenantId: string, id: string, updateDto: UpdateProductDto) {
    const product = await this.findOne(tenantId, id);
    Object.assign(product, updateDto);
    return this.productRepository.save(product);
  }

  async toggleActive(tenantId: string, id: string) {
    const product = await this.findOne(tenantId, id);
    product.isActive = !product.isActive;
    return this.productRepository.save(product);
  }

  private async generateCode(type: ProductType): Promise<string> {
    const prefixes: Record<ProductType, string> = {
      [ProductType.FOOD]: 'MON',
      [ProductType.DRINK]: 'DU',
      [ProductType.OTHER]: 'KH',
      [ProductType.TOPPING]: 'TOP',
      [ProductType.COMBO]: 'CMB',
    };
    const prefix = prefixes[type] || 'PRD';
    const count = await this.productRepository.count();
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }
}
