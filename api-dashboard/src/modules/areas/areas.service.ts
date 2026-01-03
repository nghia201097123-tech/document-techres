import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Area, Table, TableStatus } from '../../database/entities';
import { CreateAreaDto, UpdateAreaDto } from './dto';

@Injectable()
export class AreasService {
  constructor(
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
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
    const { tables, ...areaData } = createDto;

    // Create the area
    const area = this.areaRepository.create({
      ...areaData,
      tenantId,
      branchId,
      isActive: true,
    });
    const savedArea = await this.areaRepository.save(area);

    // Create quick tables if provided
    if (tables && tables.length > 0) {
      const tableEntities = tables.map((table, index) =>
        this.tableRepository.create({
          tenantId,
          branchId,
          areaId: savedArea.id,
          name: table.name,
          capacity: table.capacity || 4,
          status: TableStatus.AVAILABLE,
          sortOrder: index,
          isActive: true,
        }),
      );
      await this.tableRepository.save(tableEntities);
    }

    return savedArea;
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
