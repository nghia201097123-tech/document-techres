import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeasonalPrice } from '../../database/entities';
import { CreateSeasonalPriceDto, UpdateSeasonalPriceDto } from './dto';

@Injectable()
export class SeasonalPricesService {
  constructor(
    @InjectRepository(SeasonalPrice)
    private readonly seasonalPriceRepository: Repository<SeasonalPrice>,
  ) {}

  async findAll(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId && branchId !== 'all') {
      where.branchId = branchId;
    }
    return this.seasonalPriceRepository.find({
      where,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const seasonalPrice = await this.seasonalPriceRepository.findOne({
      where: { tenantId, id },
    });
    if (!seasonalPrice) {
      throw new NotFoundException('Không tìm thấy giá thời vụ');
    }
    return seasonalPrice;
  }

  async create(tenantId: string, branchId: string, createDto: CreateSeasonalPriceDto) {
    const seasonalPrice = this.seasonalPriceRepository.create({
      ...createDto,
      tenantId,
      branchId,
      isActive: true,
    });
    return this.seasonalPriceRepository.save(seasonalPrice);
  }

  async update(tenantId: string, id: string, updateDto: UpdateSeasonalPriceDto) {
    const seasonalPrice = await this.findOne(tenantId, id);
    Object.assign(seasonalPrice, updateDto);
    return this.seasonalPriceRepository.save(seasonalPrice);
  }

  async toggleActive(tenantId: string, id: string) {
    const seasonalPrice = await this.findOne(tenantId, id);
    seasonalPrice.isActive = !seasonalPrice.isActive;
    return this.seasonalPriceRepository.save(seasonalPrice);
  }

  async delete(tenantId: string, id: string) {
    const seasonalPrice = await this.findOne(tenantId, id);
    await this.seasonalPriceRepository.remove(seasonalPrice);
    return { message: 'Đã xóa giá thời vụ' };
  }
}
