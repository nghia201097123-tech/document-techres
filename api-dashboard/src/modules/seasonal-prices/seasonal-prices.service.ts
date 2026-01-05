import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SeasonalPrice, SeasonalPriceProduct, Product } from '../../database/entities';
import { CreateSeasonalPriceDto, UpdateSeasonalPriceDto } from './dto';

@Injectable()
export class SeasonalPricesService {
  constructor(
    @InjectRepository(SeasonalPrice)
    private readonly seasonalPriceRepository: Repository<SeasonalPrice>,
    @InjectRepository(SeasonalPriceProduct)
    private readonly seasonalPriceProductRepository: Repository<SeasonalPriceProduct>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async findAll(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId && branchId !== 'all') {
      where.branchId = branchId;
    }
    return this.seasonalPriceRepository.find({
      where,
      relations: ['seasonalPriceProducts', 'seasonalPriceProducts.product'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const seasonalPrice = await this.seasonalPriceRepository.findOne({
      where: { tenantId, id },
      relations: ['seasonalPriceProducts', 'seasonalPriceProducts.product'],
    });
    if (!seasonalPrice) {
      throw new NotFoundException('Không tìm thấy giá thời vụ');
    }
    return seasonalPrice;
  }

  /**
   * Check if products have overlapping seasonal prices in the given date range
   * Returns list of conflicting products with their seasonal price info
   */
  async checkOverlap(
    tenantId: string,
    branchId: string,
    productIds: string[],
    startDate: string,
    endDate: string,
    excludeSeasonalPriceId?: string,
  ): Promise<{ productId: string; productName: string; seasonalPriceName: string; startDate: string; endDate: string }[]> {
    if (!productIds || productIds.length === 0) {
      return [];
    }

    // Find all seasonal price products for these products in this branch
    const query = this.seasonalPriceProductRepository
      .createQueryBuilder('spp')
      .innerJoinAndSelect('spp.seasonalPrice', 'sp')
      .innerJoinAndSelect('spp.product', 'p')
      .where('spp.tenantId = :tenantId', { tenantId })
      .andWhere('sp.branchId = :branchId', { branchId })
      .andWhere('spp.productId IN (:...productIds)', { productIds })
      .andWhere('sp.isActive = true')
      // Check date overlap: (startA <= endB) AND (endA >= startB)
      .andWhere('sp.startDate <= :endDate', { endDate })
      .andWhere('sp.endDate >= :startDate', { startDate });

    if (excludeSeasonalPriceId) {
      query.andWhere('sp.id != :excludeId', { excludeId: excludeSeasonalPriceId });
    }

    const conflicts = await query.getMany();

    return conflicts.map(c => ({
      productId: c.productId,
      productName: c.product.name,
      seasonalPriceName: c.seasonalPrice.name,
      startDate: c.seasonalPrice.startDate.toString(),
      endDate: c.seasonalPrice.endDate.toString(),
    }));
  }

  async create(tenantId: string, branchId: string, createDto: CreateSeasonalPriceDto) {
    const { productIds, ...seasonalPriceData } = createDto;

    // Validate date range
    if (new Date(createDto.startDate) > new Date(createDto.endDate)) {
      throw new BadRequestException('Ngày bắt đầu không được lớn hơn ngày kết thúc');
    }

    // Validate products exist
    if (productIds && productIds.length > 0) {
      const products = await this.productRepository.find({
        where: { id: In(productIds), tenantId },
      });
      if (products.length !== productIds.length) {
        throw new BadRequestException('Một số sản phẩm không tồn tại');
      }

      // Check for overlapping seasonal prices
      const conflicts = await this.checkOverlap(
        tenantId,
        branchId,
        productIds,
        createDto.startDate,
        createDto.endDate,
      );

      if (conflicts.length > 0) {
        const conflictMessages = conflicts.map(c =>
          `"${c.productName}" đã có giá thời vụ "${c.seasonalPriceName}" (${new Date(c.startDate).toLocaleDateString('vi-VN')} - ${new Date(c.endDate).toLocaleDateString('vi-VN')})`
        );
        throw new BadRequestException(
          `Các sản phẩm sau đã có giá thời vụ trong khoảng thời gian này:\n${conflictMessages.join('\n')}`
        );
      }
    }

    // Create seasonal price
    const seasonalPrice = this.seasonalPriceRepository.create({
      ...seasonalPriceData,
      tenantId,
      branchId,
      isActive: true,
    });
    const saved = await this.seasonalPriceRepository.save(seasonalPrice);

    // Create product assignments
    if (productIds && productIds.length > 0) {
      const productAssignments = productIds.map(productId => ({
        tenantId,
        seasonalPriceId: saved.id,
        productId,
      }));
      await this.seasonalPriceProductRepository.save(productAssignments);
    }

    return this.findOne(tenantId, saved.id);
  }

  async update(tenantId: string, id: string, updateDto: UpdateSeasonalPriceDto) {
    const seasonalPrice = await this.findOne(tenantId, id);
    const { productIds, ...seasonalPriceData } = updateDto;

    // Validate date range if provided
    const startDate = updateDto.startDate || seasonalPrice.startDate.toString();
    const endDate = updateDto.endDate || seasonalPrice.endDate.toString();
    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('Ngày bắt đầu không được lớn hơn ngày kết thúc');
    }

    // If productIds is provided, update product assignments
    if (productIds !== undefined) {
      // Validate products exist
      if (productIds.length > 0) {
        const products = await this.productRepository.find({
          where: { id: In(productIds), tenantId },
        });
        if (products.length !== productIds.length) {
          throw new BadRequestException('Một số sản phẩm không tồn tại');
        }

        // Check for overlapping seasonal prices (excluding this one)
        const conflicts = await this.checkOverlap(
          tenantId,
          seasonalPrice.branchId,
          productIds,
          startDate,
          endDate,
          id,
        );

        if (conflicts.length > 0) {
          const conflictMessages = conflicts.map(c =>
            `"${c.productName}" đã có giá thời vụ "${c.seasonalPriceName}" (${new Date(c.startDate).toLocaleDateString('vi-VN')} - ${new Date(c.endDate).toLocaleDateString('vi-VN')})`
          );
          throw new BadRequestException(
            `Các sản phẩm sau đã có giá thời vụ trong khoảng thời gian này:\n${conflictMessages.join('\n')}`
          );
        }
      }

      // Remove old assignments
      await this.seasonalPriceProductRepository.delete({
        tenantId,
        seasonalPriceId: id,
      });

      // Create new assignments
      if (productIds.length > 0) {
        const productAssignments = productIds.map(productId => ({
          tenantId,
          seasonalPriceId: id,
          productId,
        }));
        await this.seasonalPriceProductRepository.save(productAssignments);
      }
    }

    // Update seasonal price data
    Object.assign(seasonalPrice, seasonalPriceData);
    await this.seasonalPriceRepository.save(seasonalPrice);
    return this.findOne(tenantId, id);
  }

  async toggleActive(tenantId: string, id: string) {
    const seasonalPrice = await this.findOne(tenantId, id);
    seasonalPrice.isActive = !seasonalPrice.isActive;
    await this.seasonalPriceRepository.save(seasonalPrice);
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string) {
    const seasonalPrice = await this.findOne(tenantId, id);
    // Product assignments will be deleted automatically due to CASCADE
    await this.seasonalPriceRepository.remove(seasonalPrice);
    return { message: 'Đã xóa giá thời vụ' };
  }
}
