import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Department, Staff } from '../../database/entities';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto';

export interface DepartmentStaffCount {
  departmentId: string;
  departmentName: string;
  staffCount: number;
  childDepartments: DepartmentStaffCount[];
  totalStaffCount: number;
}

export interface CascadeToggleResult {
  department: Department;
  affectedDepartments: Department[];
  affectedStaffCount: number;
}

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
  ) {}

  async findAll(tenantId: string) {
    return this.departmentRepository.find({
      where: { tenantId },
      order: { isActive: 'DESC', name: 'ASC' },
    });
  }

  async findTree(tenantId: string) {
    // Return all departments (entity doesn't support parent-child yet)
    return this.departmentRepository.find({
      where: { tenantId },
      order: { isActive: 'DESC', name: 'ASC' },
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

    // Handle parentId update (including clearing parent)
    if ('parentId' in updateDto) {
      department.parentId = updateDto.parentId || null;
    }
    if ('name' in updateDto) {
      department.name = updateDto.name;
    }
    if ('description' in updateDto) {
      department.description = updateDto.description;
    }

    return this.departmentRepository.save(department);
  }

  async toggleActive(tenantId: string, id: string) {
    const department = await this.findOne(tenantId, id);
    department.isActive = !department.isActive;
    return this.departmentRepository.save(department);
  }

  // Get all descendant department IDs recursively
  private async getAllDescendantIds(tenantId: string, parentId: string): Promise<string[]> {
    const children = await this.departmentRepository.find({
      where: { tenantId, parentId },
      select: ['id'],
    });

    const childIds = children.map(c => c.id);
    const descendantIds: string[] = [...childIds];

    for (const childId of childIds) {
      const subDescendants = await this.getAllDescendantIds(tenantId, childId);
      descendantIds.push(...subDescendants);
    }

    return descendantIds;
  }

  // Get staff count for a department and all its children
  async getStaffCount(tenantId: string, id: string): Promise<DepartmentStaffCount> {
    const department = await this.findOne(tenantId, id);

    // Get direct staff count
    const staffCount = await this.staffRepository.count({
      where: { tenantId, departmentId: id },
    });

    // Get children
    const children = await this.departmentRepository.find({
      where: { tenantId, parentId: id },
    });

    // Recursively get child department staff counts
    const childDepartments: DepartmentStaffCount[] = [];
    let totalChildStaff = 0;

    for (const child of children) {
      const childCount = await this.getStaffCount(tenantId, child.id);
      childDepartments.push(childCount);
      totalChildStaff += childCount.totalStaffCount;
    }

    return {
      departmentId: department.id,
      departmentName: department.name,
      staffCount,
      childDepartments,
      totalStaffCount: staffCount + totalChildStaff,
    };
  }

  // Toggle active with cascade - affects all children and staff
  async toggleActiveCascade(tenantId: string, id: string): Promise<CascadeToggleResult> {
    const department = await this.findOne(tenantId, id);
    const newActiveState = !department.isActive;

    // Get all descendant department IDs
    const descendantIds = await this.getAllDescendantIds(tenantId, id);
    const allDepartmentIds = [id, ...descendantIds];

    // Update all departments
    await this.departmentRepository.update(
      { tenantId, id: In(allDepartmentIds) },
      { isActive: newActiveState },
    );

    // Update all staff in these departments
    const staffUpdateResult = await this.staffRepository.update(
      { tenantId, departmentId: In(allDepartmentIds) },
      { isActive: newActiveState },
    );

    // Fetch updated departments
    const updatedDepartment = await this.findOne(tenantId, id);
    const affectedDepartments = descendantIds.length > 0
      ? await this.departmentRepository.find({
          where: { tenantId, id: In(descendantIds) },
        })
      : [];

    return {
      department: updatedDepartment,
      affectedDepartments,
      affectedStaffCount: staffUpdateResult.affected || 0,
    };
  }

  // Transfer all staff from department (and children) to target, then delete
  async transferStaffAndDelete(
    tenantId: string,
    id: string,
    targetDepartmentId: string,
  ): Promise<{ transferredCount: number }> {
    const department = await this.findOne(tenantId, id);
    const targetDepartment = await this.findOne(tenantId, targetDepartmentId);

    // Validate target is not the same or a descendant
    const descendantIds = await this.getAllDescendantIds(tenantId, id);
    if (targetDepartmentId === id || descendantIds.includes(targetDepartmentId)) {
      throw new BadRequestException('Không thể chuyển nhân viên đến bộ phận đang xóa hoặc bộ phận con của nó');
    }

    const allDepartmentIds = [id, ...descendantIds];

    // Transfer all staff to target department
    const transferResult = await this.staffRepository.update(
      { tenantId, departmentId: In(allDepartmentIds) },
      { departmentId: targetDepartmentId },
    );

    // Delete all departments (children first, then parent)
    // Sort descendant IDs by depth (deepest first) - simple approach: reverse order
    for (const deptId of [...descendantIds].reverse()) {
      await this.departmentRepository.delete({ tenantId, id: deptId });
    }
    await this.departmentRepository.delete({ tenantId, id });

    return {
      transferredCount: transferResult.affected || 0,
    };
  }

  // Delete department (simple, no staff transfer)
  async delete(tenantId: string, id: string): Promise<void> {
    const department = await this.findOne(tenantId, id);

    // Get all descendant IDs
    const descendantIds = await this.getAllDescendantIds(tenantId, id);

    // Check if any staff exists in these departments
    const staffCount = await this.staffRepository.count({
      where: { tenantId, departmentId: In([id, ...descendantIds]) },
    });

    if (staffCount > 0) {
      throw new BadRequestException(
        `Không thể xóa bộ phận vì còn ${staffCount} nhân viên. Vui lòng chuyển nhân viên sang bộ phận khác trước.`,
      );
    }

    // Delete children first, then parent
    for (const deptId of [...descendantIds].reverse()) {
      await this.departmentRepository.delete({ tenantId, id: deptId });
    }
    await this.departmentRepository.delete({ tenantId, id });
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
