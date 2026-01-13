import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Kitchen, ProductKitchen, Product } from '../../database/entities';
import { CreateKitchenDto, UpdateKitchenDto } from './dto';

@Injectable()
export class KitchenService {
  constructor(
    @InjectRepository(Kitchen)
    private readonly kitchenRepository: Repository<Kitchen>,
    @InjectRepository(ProductKitchen)
    private readonly productKitchenRepository: Repository<ProductKitchen>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async findAll(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId && branchId !== 'all') {
      where.branchId = branchId;
    }
    return this.kitchenRepository.find({
      where,
      order: { isActive: 'DESC', sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const kitchen = await this.kitchenRepository.findOne({
      where: { tenantId, id },
    });
    if (!kitchen) {
      throw new NotFoundException('Không tìm thấy bếp');
    }
    return kitchen;
  }

  async create(tenantId: string, branchId: string, createDto: CreateKitchenDto) {
    const kitchen = this.kitchenRepository.create({
      ...createDto,
      tenantId,
      branchId,
      isActive: true,
    });
    return this.kitchenRepository.save(kitchen);
  }

  async update(tenantId: string, id: string, updateDto: UpdateKitchenDto) {
    const kitchen = await this.findOne(tenantId, id);
    Object.assign(kitchen, updateDto);
    return this.kitchenRepository.save(kitchen);
  }

  async toggleActive(tenantId: string, id: string) {
    const kitchen = await this.findOne(tenantId, id);
    kitchen.isActive = !kitchen.isActive;
    return this.kitchenRepository.save(kitchen);
  }

  async delete(tenantId: string, id: string) {
    const kitchen = await this.findOne(tenantId, id);
    await this.kitchenRepository.remove(kitchen);
    return { message: 'Đã xóa bếp' };
  }

  // Get products assigned to a kitchen
  async getKitchenProducts(tenantId: string, kitchenId: string) {
    await this.findOne(tenantId, kitchenId); // Verify kitchen exists
    const productKitchens = await this.productKitchenRepository.find({
      where: { tenantId, kitchenId },
      relations: ['product'],
    });
    return productKitchens.map(pk => pk.product);
  }

  // Get kitchens assigned to a product
  async getProductKitchens(tenantId: string, productId: string) {
    const productKitchens = await this.productKitchenRepository.find({
      where: { tenantId, productId },
      relations: ['kitchen'],
    });
    return productKitchens.map(pk => pk.kitchen);
  }

  // Assign products to a kitchen (replace all)
  async setKitchenProducts(tenantId: string, kitchenId: string, productIds: string[]) {
    await this.findOne(tenantId, kitchenId); // Verify kitchen exists

    // Remove existing assignments
    await this.productKitchenRepository.delete({ tenantId, kitchenId });

    // Create new assignments
    if (productIds.length > 0) {
      const assignments = productIds.map(productId =>
        this.productKitchenRepository.create({
          tenantId,
          kitchenId,
          productId,
        })
      );
      await this.productKitchenRepository.save(assignments);
    }

    return this.getKitchenProducts(tenantId, kitchenId);
  }

  // Assign kitchens to a product (replace all)
  async setProductKitchens(tenantId: string, productId: string, kitchenIds: string[]) {
    // Verify product exists
    const product = await this.productRepository.findOne({
      where: { tenantId, id: productId },
    });
    if (!product) {
      throw new NotFoundException('Không tìm thấy món ăn');
    }

    // Remove existing assignments
    await this.productKitchenRepository.delete({ tenantId, productId });

    // Create new assignments
    if (kitchenIds.length > 0) {
      const assignments = kitchenIds.map(kitchenId =>
        this.productKitchenRepository.create({
          tenantId,
          productId,
          kitchenId,
        })
      );
      await this.productKitchenRepository.save(assignments);
    }

    return this.getProductKitchens(tenantId, productId);
  }

  // Add a single product to kitchen
  async addProductToKitchen(tenantId: string, kitchenId: string, productId: string) {
    await this.findOne(tenantId, kitchenId);

    const existing = await this.productKitchenRepository.findOne({
      where: { tenantId, kitchenId, productId },
    });
    if (existing) {
      throw new BadRequestException('Món ăn đã được gán vào bếp này');
    }

    const assignment = this.productKitchenRepository.create({
      tenantId,
      kitchenId,
      productId,
    });
    await this.productKitchenRepository.save(assignment);

    return this.getKitchenProducts(tenantId, kitchenId);
  }

  // Remove a single product from kitchen
  async removeProductFromKitchen(tenantId: string, kitchenId: string, productId: string) {
    await this.findOne(tenantId, kitchenId);

    const assignment = await this.productKitchenRepository.findOne({
      where: { tenantId, kitchenId, productId },
    });
    if (!assignment) {
      throw new NotFoundException('Món ăn không được gán vào bếp này');
    }

    await this.productKitchenRepository.remove(assignment);

    return this.getKitchenProducts(tenantId, kitchenId);
  }

  // Get all kitchens with product counts
  async findAllWithProductCount(tenantId: string, branchId?: string) {
    const kitchens = await this.findAll(tenantId, branchId);

    const kitchenIds = kitchens.map(k => k.id);
    if (kitchenIds.length === 0) {
      return kitchens.map(k => ({ ...k, productCount: 0 }));
    }

    const counts = await this.productKitchenRepository
      .createQueryBuilder('pk')
      .select('pk.kitchen_id', 'kitchenId')
      .addSelect('COUNT(*)', 'count')
      .where('pk.tenant_id = :tenantId', { tenantId })
      .andWhere('pk.kitchen_id IN (:...kitchenIds)', { kitchenIds })
      .groupBy('pk.kitchen_id')
      .getRawMany();

    const countMap = new Map(counts.map(c => [c.kitchenId, parseInt(c.count)]));

    return kitchens.map(k => ({
      ...k,
      productCount: countMap.get(k.id) || 0,
    }));
  }
}
