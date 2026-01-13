import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Permission, DepartmentPermission, StaffPermission, Department, Staff } from '../../database/entities';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(DepartmentPermission)
    private readonly departmentPermissionRepository: Repository<DepartmentPermission>,
    @InjectRepository(StaffPermission)
    private readonly staffPermissionRepository: Repository<StaffPermission>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
  ) {}

  // Get all permissions (system-wide, no tenant filter)
  async findAllPermissions() {
    return this.permissionRepository.find({
      order: { module: 'ASC', name: 'ASC' },
    });
  }

  // Get permissions grouped by module
  async findPermissionsGrouped() {
    const permissions = await this.permissionRepository.find({
      order: { module: 'ASC', name: 'ASC' },
    });

    const grouped = permissions.reduce((acc, perm) => {
      if (!acc[perm.module]) {
        acc[perm.module] = [];
      }
      acc[perm.module].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);

    return grouped;
  }

  // Get permissions for a department
  async getDepartmentPermissions(tenantId: string, departmentId: string) {
    const permissions = await this.departmentPermissionRepository.find({
      where: { tenantId, departmentId },
      relations: ['permission'],
    });
    return permissions.map((dp) => dp.permission);
  }

  // Assign permissions to a department
  async assignDepartmentPermissions(
    tenantId: string,
    departmentId: string,
    permissionIds: string[],
  ) {
    // Verify department exists
    const department = await this.departmentRepository.findOne({
      where: { tenantId, id: departmentId },
    });
    if (!department) {
      throw new NotFoundException('Không tìm thấy bộ phận');
    }

    // Delete existing permissions
    await this.departmentPermissionRepository.delete({
      tenantId,
      departmentId,
    });

    // Create new permissions
    if (permissionIds.length > 0) {
      const newPermissions = permissionIds.map((permissionId) =>
        this.departmentPermissionRepository.create({
          tenantId,
          departmentId,
          permissionId,
        }),
      );
      await this.departmentPermissionRepository.save(newPermissions);
    }

    return this.getDepartmentPermissions(tenantId, departmentId);
  }

  // Get permissions for a staff member (own + department inherited)
  async getStaffPermissions(tenantId: string, staffId: string) {
    const staff = await this.staffRepository.findOne({
      where: { tenantId, id: staffId },
    });
    if (!staff) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }

    // Get staff's own permissions
    const staffPermissions = await this.staffPermissionRepository.find({
      where: { tenantId, staffId },
      relations: ['permission'],
    });
    const ownPermissions = staffPermissions.map((sp) => sp.permission);

    // Get department inherited permissions
    let departmentPermissions: Permission[] = [];
    if (staff.departmentId) {
      departmentPermissions = await this.getDepartmentPermissions(
        tenantId,
        staff.departmentId,
      );
    }

    // Merge and deduplicate
    const allPermissionIds = new Set<string>();
    const allPermissions: Permission[] = [];

    [...departmentPermissions, ...ownPermissions].forEach((perm) => {
      if (!allPermissionIds.has(perm.id)) {
        allPermissionIds.add(perm.id);
        allPermissions.push(perm);
      }
    });

    return {
      ownPermissions,
      departmentPermissions,
      allPermissions,
    };
  }

  // Get only staff's own permissions (not inherited)
  async getStaffOwnPermissions(tenantId: string, staffId: string) {
    const permissions = await this.staffPermissionRepository.find({
      where: { tenantId, staffId },
      relations: ['permission'],
    });
    return permissions.map((sp) => sp.permission);
  }

  // Assign permissions to a staff member
  async assignStaffPermissions(
    tenantId: string,
    staffId: string,
    permissionIds: string[],
  ) {
    // Verify staff exists
    const staff = await this.staffRepository.findOne({
      where: { tenantId, id: staffId },
    });
    if (!staff) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }

    // Delete existing permissions
    await this.staffPermissionRepository.delete({
      tenantId,
      staffId,
    });

    // Create new permissions
    if (permissionIds.length > 0) {
      const newPermissions = permissionIds.map((permissionId) =>
        this.staffPermissionRepository.create({
          tenantId,
          staffId,
          permissionId,
        }),
      );
      await this.staffPermissionRepository.save(newPermissions);
    }

    return this.getStaffPermissions(tenantId, staffId);
  }

  // Check if a staff has a specific permission
  async hasPermission(
    tenantId: string,
    staffId: string,
    permissionCode: string,
  ): Promise<boolean> {
    const { allPermissions } = await this.getStaffPermissions(tenantId, staffId);
    return allPermissions.some((p) => p.code === permissionCode);
  }

  // Get all permission codes for a staff
  async getStaffPermissionCodes(
    tenantId: string,
    staffId: string,
  ): Promise<string[]> {
    const { allPermissions } = await this.getStaffPermissions(tenantId, staffId);
    return allPermissions.map((p) => p.code);
  }
}
