import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product, ProductType, ProductTopping } from '../../database/entities';
import { CreateProductDto, UpdateProductDto, SetToppingsDto, AddToppingDto } from './dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductTopping)
    private readonly productToppingRepository: Repository<ProductTopping>,
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

  // === Topping Management ===

  async getToppings(tenantId: string, productId: string) {
    // Verify product exists
    await this.findOne(tenantId, productId);

    const productToppings = await this.productToppingRepository.find({
      where: { tenantId, productId },
      relations: ['topping'],
      order: { sortOrder: 'ASC' },
    });

    return productToppings.map((pt) => ({
      id: pt.id,
      toppingId: pt.toppingId,
      topping: pt.topping,
      isRequired: pt.isRequired,
      maxQuantity: pt.maxQuantity,
      sortOrder: pt.sortOrder,
    }));
  }

  async setToppings(tenantId: string, productId: string, dto: SetToppingsDto) {
    // Verify product exists
    const product = await this.findOne(tenantId, productId);

    // Verify all toppings exist and are of type TOPPING
    if (dto.toppings.length > 0) {
      const toppingIds = dto.toppings.map((t) => t.toppingId);
      const toppings = await this.productRepository.find({
        where: { tenantId, id: In(toppingIds), type: ProductType.TOPPING },
      });

      if (toppings.length !== toppingIds.length) {
        throw new BadRequestException('Một số topping không tồn tại hoặc không phải loại topping');
      }
    }

    // Delete existing toppings
    await this.productToppingRepository.delete({ tenantId, productId });

    // Insert new toppings
    if (dto.toppings.length > 0) {
      const productToppings = dto.toppings.map((t, index) =>
        this.productToppingRepository.create({
          tenantId,
          productId,
          toppingId: t.toppingId,
          isRequired: t.isRequired ?? false,
          maxQuantity: t.maxQuantity ?? 5,
          sortOrder: t.sortOrder ?? index,
        }),
      );
      await this.productToppingRepository.save(productToppings);
    }

    return this.getToppings(tenantId, productId);
  }

  async addTopping(tenantId: string, productId: string, dto: AddToppingDto) {
    // Verify product exists
    await this.findOne(tenantId, productId);

    // Verify topping exists and is of type TOPPING
    const topping = await this.productRepository.findOne({
      where: { tenantId, id: dto.toppingId, type: ProductType.TOPPING },
    });
    if (!topping) {
      throw new BadRequestException('Topping không tồn tại hoặc không phải loại topping');
    }

    // Check if already exists
    const existing = await this.productToppingRepository.findOne({
      where: { productId, toppingId: dto.toppingId },
    });
    if (existing) {
      throw new BadRequestException('Topping này đã được gán cho món ăn');
    }

    // Get max sort order
    const maxOrder = await this.productToppingRepository
      .createQueryBuilder('pt')
      .where('pt.product_id = :productId', { productId })
      .select('MAX(pt.sort_order)', 'max')
      .getRawOne();

    const productTopping = this.productToppingRepository.create({
      tenantId,
      productId,
      toppingId: dto.toppingId,
      isRequired: dto.isRequired ?? false,
      maxQuantity: dto.maxQuantity ?? 5,
      sortOrder: (maxOrder?.max ?? -1) + 1,
    });

    await this.productToppingRepository.save(productTopping);
    return this.getToppings(tenantId, productId);
  }

  async removeTopping(tenantId: string, productId: string, toppingId: string) {
    // Verify product exists
    await this.findOne(tenantId, productId);

    const result = await this.productToppingRepository.delete({
      tenantId,
      productId,
      toppingId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy topping này trong món ăn');
    }

    return this.getToppings(tenantId, productId);
  }

  async getAvailableToppings(tenantId: string, brandId?: string) {
    const where: any = { tenantId, type: ProductType.TOPPING, isActive: true };
    if (brandId) {
      where.brandId = brandId;
    }
    return this.productRepository.find({
      where,
      order: { name: 'ASC' },
    });
  }
}
