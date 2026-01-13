import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Surcharge } from '../../database/entities';
import { CreateSurchargeDto, UpdateSurchargeDto } from './dto';

@Injectable()
export class SurchargesService {
  constructor(
    @InjectRepository(Surcharge)
    private readonly surchargeRepository: Repository<Surcharge>,
  ) {}

  async findAll(tenantId: string, brandId?: string) {
    const where: any = { tenantId };
    if (brandId) {
      where.brandId = brandId;
    }
    return this.surchargeRepository.find({
      where,
      order: { isActive: 'DESC', sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const surcharge = await this.surchargeRepository.findOne({
      where: { tenantId, id },
    });
    if (!surcharge) {
      throw new NotFoundException('Không tìm thấy phụ thu');
    }
    return surcharge;
  }

  async create(tenantId: string, brandId: string, createDto: CreateSurchargeDto) {
    const surcharge = this.surchargeRepository.create({
      ...createDto,
      tenantId,
      brandId,
      isActive: true,
    });
    return this.surchargeRepository.save(surcharge);
  }

  async update(tenantId: string, id: string, updateDto: UpdateSurchargeDto) {
    const surcharge = await this.findOne(tenantId, id);
    Object.assign(surcharge, updateDto);
    return this.surchargeRepository.save(surcharge);
  }

  async toggleActive(tenantId: string, id: string) {
    const surcharge = await this.findOne(tenantId, id);
    surcharge.isActive = !surcharge.isActive;
    return this.surchargeRepository.save(surcharge);
  }

  async delete(tenantId: string, id: string) {
    const surcharge = await this.findOne(tenantId, id);
    await this.surchargeRepository.remove(surcharge);
    return { message: 'Đã xóa phụ thu' };
  }
}
