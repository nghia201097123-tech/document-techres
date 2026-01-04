import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from '../../database/entities';
import { CreateUnitDto, UpdateUnitDto } from './dto';

@Injectable()
export class UnitsService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
  ) {}

  async findAll(tenantId: string, brandId?: string) {
    const where: any = { tenantId };
    if (brandId) {
      where.brandId = brandId;
    }
    return this.unitRepository.find({
      where,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const unit = await this.unitRepository.findOne({
      where: { tenantId, id },
    });
    if (!unit) {
      throw new NotFoundException('Không tìm thấy đơn vị tính');
    }
    return unit;
  }

  async create(tenantId: string, brandId: string, createDto: CreateUnitDto) {
    const unit = this.unitRepository.create({
      ...createDto,
      tenantId,
      brandId,
      isActive: true,
    });
    return this.unitRepository.save(unit);
  }

  async update(tenantId: string, id: string, updateDto: UpdateUnitDto) {
    const unit = await this.findOne(tenantId, id);
    Object.assign(unit, updateDto);
    return this.unitRepository.save(unit);
  }

  async toggleActive(tenantId: string, id: string) {
    const unit = await this.findOne(tenantId, id);
    unit.isActive = !unit.isActive;
    return this.unitRepository.save(unit);
  }

  async delete(tenantId: string, id: string) {
    const unit = await this.findOne(tenantId, id);
    await this.unitRepository.remove(unit);
    return { message: 'Đã xóa đơn vị tính' };
  }
}
