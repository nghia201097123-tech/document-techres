import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
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
      relations: ['parent', 'children'],
    });
  }

  async findTree(tenantId: string) {
    // Get root departments (no parent)
    const roots = await this.departmentRepository.find({
      where: { tenantId, parentId: IsNull() },
      order: { name: 'ASC' },
      relations: ['children'],
    });
    return roots;
  }

  async findOne(tenantId: string, id: string) {
    const department = await this.departmentRepository.findOne({
      where: { tenantId, id },
      relations: ['parent', 'children'],
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
