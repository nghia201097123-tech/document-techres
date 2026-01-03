import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Table, TableStatus } from '../../database/entities';
import { CreateTableDto, UpdateTableDto } from './dto';

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
  ) {}

  async findAll(tenantId: string, branchId: string, areaId?: string) {
    const where: any = { tenantId, branchId };
    if (areaId) {
      where.areaId = areaId;
    }
    return this.tableRepository.find({
      where,
      relations: ['area'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const table = await this.tableRepository.findOne({
      where: { tenantId, id },
      relations: ['area'],
    });
    if (!table) {
      throw new NotFoundException('Không tìm thấy bàn');
    }
    return table;
  }

  async create(tenantId: string, branchId: string, createDto: CreateTableDto) {
    const table = this.tableRepository.create({
      ...createDto,
      tenantId,
      branchId,
      status: TableStatus.AVAILABLE,
      isActive: true,
    });
    return this.tableRepository.save(table);
  }

  async update(tenantId: string, id: string, updateDto: UpdateTableDto) {
    const table = await this.findOne(tenantId, id);
    Object.assign(table, updateDto);
    return this.tableRepository.save(table);
  }

  async updateStatus(tenantId: string, id: string, status: TableStatus) {
    const table = await this.findOne(tenantId, id);
    table.status = status;
    return this.tableRepository.save(table);
  }

  async toggleActive(tenantId: string, id: string) {
    const table = await this.findOne(tenantId, id);
    table.isActive = !table.isActive;
    return this.tableRepository.save(table);
  }

  async delete(tenantId: string, id: string) {
    const table = await this.findOne(tenantId, id);
    await this.tableRepository.remove(table);
    return { message: 'Đã xóa bàn' };
  }

  async countByArea(tenantId: string, branchId: string) {
    return this.tableRepository
      .createQueryBuilder('table')
      .select('table.area_id', 'areaId')
      .addSelect('COUNT(*)', 'count')
      .where('table.tenant_id = :tenantId', { tenantId })
      .andWhere('table.branch_id = :branchId', { branchId })
      .groupBy('table.area_id')
      .getRawMany();
  }
}
