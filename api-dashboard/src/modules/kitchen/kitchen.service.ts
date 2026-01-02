import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Kitchen } from '../../database/entities';
import { CreateKitchenDto, UpdateKitchenDto } from './dto';

@Injectable()
export class KitchenService {
  constructor(
    @InjectRepository(Kitchen)
    private readonly kitchenRepository: Repository<Kitchen>,
  ) {}

  async findAll(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId) {
      where.branchId = branchId;
    }
    return this.kitchenRepository.find({
      where,
      order: { sortOrder: 'ASC', name: 'ASC' },
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
}
