import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../../database/entities';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  async findAll(tenantId: string) {
    return this.departmentRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async findTree(tenantId: string) {
    // Return all departments (entity doesn't support parent-child yet)
    return this.departmentRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const department = await this.departmentRepository.findOne({
      where: { tenantId, id },
    });
    if (!department) {
      throw new NotFoundException('Không tìm thấy bộ phận');
    }
    return department;
  }

  async create(tenantId: string, companyId: string, branchId: string, createDto: CreateDepartmentDto) {
    const code = this.generateCode(createDto.name);
    const department = this.departmentRepository.create({
      ...createDto,
      tenantId,
      companyId,
      branchId,
      code,
      isActive: true,
    });
    return this.departmentRepository.save(department);
  }

  async update(tenantId: string, id: string, updateDto: UpdateDepartmentDto) {
    const department = await this.findOne(tenantId, id);
    Object.assign(department, updateDto);
    return this.departmentRepository.save(department);
  }

  async toggleActive(tenantId: string, id: string) {
    const department = await this.findOne(tenantId, id);
    department.isActive = !department.isActive;
    return this.departmentRepository.save(department);
  }

  private generateCode(name: string): string {
    const normalized = name
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${normalized}${random}`;
  }
}
