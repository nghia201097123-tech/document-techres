import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Area } from '../../database/entities';
import { CreateAreaDto, UpdateAreaDto } from './dto';

@Injectable()
export class AreasService {
  constructor(
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
  ) {}

  async findAll(tenantId: string, branchId: string) {
    return this.areaRepository.find({
      where: { tenantId, branchId },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const area = await this.areaRepository.findOne({
      where: { tenantId, id },
    });
    if (!area) {
      throw new NotFoundException('Không tìm thấy khu vực');
    }
    return area;
  }

  async create(tenantId: string, branchId: string, createDto: CreateAreaDto) {
    const area = this.areaRepository.create({
      ...createDto,
      tenantId,
      branchId,
      isActive: true,
    });
    return this.areaRepository.save(area);
  }

  async update(tenantId: string, id: string, updateDto: UpdateAreaDto) {
    const area = await this.findOne(tenantId, id);
    Object.assign(area, updateDto);
    return this.areaRepository.save(area);
  }

  async toggleActive(tenantId: string, id: string) {
    const area = await this.findOne(tenantId, id);
    area.isActive = !area.isActive;
    return this.areaRepository.save(area);
  }

  async delete(tenantId: string, id: string) {
    const area = await this.findOne(tenantId, id);
    await this.areaRepository.remove(area);
    return { message: 'Đã xóa khu vực' };
  }
}
