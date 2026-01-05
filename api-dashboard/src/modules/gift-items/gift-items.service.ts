import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GiftItem, Product } from '../../database/entities';
import { CreateGiftItemDto, UpdateGiftItemDto } from './dto';

@Injectable()
export class GiftItemsService {
  constructor(
    @InjectRepository(GiftItem)
    private readonly giftItemRepository: Repository<GiftItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async findAll(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId && branchId !== 'all') {
      where.branchId = branchId;
    }
    return this.giftItemRepository.find({
      where,
      relations: ['product'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const giftItem = await this.giftItemRepository.findOne({
      where: { tenantId, id },
      relations: ['product'],
    });
    if (!giftItem) {
      throw new NotFoundException('Không tìm thấy món tặng');
    }
    return giftItem;
  }

  async create(tenantId: string, branchId: string, createDto: CreateGiftItemDto) {
    // Get product name if name is not provided
    let name = createDto.name;
    if (!name && createDto.productId) {
      const product = await this.productRepository.findOne({
        where: { id: createDto.productId, tenantId },
      });
      if (product) {
        name = product.name;
      }
    }

    const giftItem = this.giftItemRepository.create({
      ...createDto,
      name: name || 'Món tặng',
      tenantId,
      branchId,
      isActive: true,
    });
    const saved = await this.giftItemRepository.save(giftItem);
    return this.findOne(tenantId, saved.id);
  }

  async update(tenantId: string, id: string, updateDto: UpdateGiftItemDto) {
    const giftItem = await this.findOne(tenantId, id);
    Object.assign(giftItem, updateDto);
    await this.giftItemRepository.save(giftItem);
    return this.findOne(tenantId, id);
  }

  async toggleActive(tenantId: string, id: string) {
    const giftItem = await this.findOne(tenantId, id);
    giftItem.isActive = !giftItem.isActive;
    await this.giftItemRepository.save(giftItem);
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string) {
    const giftItem = await this.findOne(tenantId, id);
    await this.giftItemRepository.remove(giftItem);
    return { message: 'Đã xóa món tặng' };
  }
}
