import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { StaffBranch, Staff, Branch, Brand } from '../../database/entities';
import { StaffBranchResponseDto } from './dto';

@Injectable()
export class StaffBranchService {
  constructor(
    @InjectRepository(StaffBranch)
    private staffBranchRepository: Repository<StaffBranch>,
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>,
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
    @InjectRepository(Brand)
    private brandRepository: Repository<Brand>,
  ) {}

  // Get all branches assigned to a staff member
  async getByStaffId(tenantId: string, staffId: string): Promise<StaffBranchResponseDto[]> {
    console.log(`[StaffBranchService.getByStaffId] tenantId=${tenantId}, staffId=${staffId}`);

    const staff = await this.staffRepository.findOne({
      where: { id: staffId, tenantId },
    });

    if (!staff) {
      console.log(`[StaffBranchService.getByStaffId] Staff not found: ${staffId}`);
      throw new NotFoundException('Không tìm thấy nhân viên');
    }

    const assignments = await this.staffBranchRepository.find({
      where: { staffId, tenantId },
      relations: ['branch', 'brand'],
      order: { isDefault: 'DESC', assignedAt: 'ASC' },
    });

    console.log(`[StaffBranchService.getByStaffId] Found ${assignments.length} assignments for staff ${staffId}`);

    return assignments.map(a => ({
      id: a.id,
      staffId: a.staffId,
      branchId: a.branchId,
      branchName: a.branch?.name || '',
      brandId: a.brandId,
      brandName: a.brand?.name || '',
      isDefault: a.isDefault,
      assignedAt: a.assignedAt,
    }));
  }

  // Assign a single branch to a staff member
  async assignBranch(
    tenantId: string,
    staffId: string,
    branchId: string,
    isDefault: boolean = false,
  ): Promise<StaffBranchResponseDto> {
    const staff = await this.staffRepository.findOne({
      where: { id: staffId, tenantId },
    });

    if (!staff) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }

    const branch = await this.branchRepository.findOne({
      where: { id: branchId, tenantId },
      relations: ['brand'],
    });

    if (!branch) {
      throw new NotFoundException('Không tìm thấy chi nhánh');
    }

    // Check if already assigned
    const existing = await this.staffBranchRepository.findOne({
      where: { staffId, branchId, tenantId },
    });

    if (existing) {
      // Update isDefault if needed
      if (isDefault && !existing.isDefault) {
        // Remove default from other assignments
        await this.staffBranchRepository.update(
          { staffId, tenantId, isDefault: true },
          { isDefault: false },
        );
        existing.isDefault = true;
        await this.staffBranchRepository.save(existing);
      }
      return this.mapToResponse(existing, branch);
    }

    // If this is the default, remove default from others
    if (isDefault) {
      await this.staffBranchRepository.update(
        { staffId, tenantId, isDefault: true },
        { isDefault: false },
      );
    }

    const assignment = this.staffBranchRepository.create({
      tenantId,
      staffId,
      branchId,
      brandId: branch.brandId,
      isDefault,
    });

    const saved = await this.staffBranchRepository.save(assignment);
    return this.mapToResponse(saved, branch);
  }

  // Remove a branch assignment
  async removeBranch(tenantId: string, staffId: string, branchId: string): Promise<void> {
    const result = await this.staffBranchRepository.delete({
      staffId,
      branchId,
      tenantId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy quyền chi nhánh này');
    }
  }

  // Set a branch as default for a staff member
  async setDefaultBranch(tenantId: string, staffId: string, branchId: string): Promise<void> {
    const assignment = await this.staffBranchRepository.findOne({
      where: { staffId, branchId, tenantId },
    });

    if (!assignment) {
      throw new NotFoundException('Nhân viên chưa được gán chi nhánh này');
    }

    // Remove default from all other assignments
    await this.staffBranchRepository.update(
      { staffId, tenantId, isDefault: true },
      { isDefault: false },
    );

    // Set this one as default
    assignment.isDefault = true;
    await this.staffBranchRepository.save(assignment);
  }

  // Bulk assign branches to a staff member (replace all assignments)
  async bulkAssign(
    tenantId: string,
    staffId: string,
    branchIds: string[],
    defaultBranchId?: string,
  ): Promise<StaffBranchResponseDto[]> {
    console.log(`[StaffBranchService.bulkAssign] tenantId=${tenantId}, staffId=${staffId}, branchIds=${JSON.stringify(branchIds)}, defaultBranchId=${defaultBranchId}`);

    const staff = await this.staffRepository.findOne({
      where: { id: staffId, tenantId },
    });

    if (!staff) {
      console.log(`[StaffBranchService.bulkAssign] Staff not found: ${staffId}`);
      throw new NotFoundException('Không tìm thấy nhân viên');
    }

    if (branchIds.length === 0) {
      // Remove all assignments
      console.log(`[StaffBranchService.bulkAssign] Removing all assignments for staff ${staffId}`);
      await this.staffBranchRepository.delete({ staffId, tenantId });
      return [];
    }

    // Validate branches
    const branches = await this.branchRepository.find({
      where: { id: In(branchIds), tenantId },
      relations: ['brand'],
    });

    console.log(`[StaffBranchService.bulkAssign] Found ${branches.length} branches out of ${branchIds.length} requested`);

    if (branches.length !== branchIds.length) {
      const foundIds = branches.map(b => b.id);
      const missingIds = branchIds.filter(id => !foundIds.includes(id));
      console.log(`[StaffBranchService.bulkAssign] Missing branches: ${JSON.stringify(missingIds)}`);
      throw new BadRequestException('Một số chi nhánh không tồn tại');
    }

    // Validate defaultBranchId
    if (defaultBranchId && !branchIds.includes(defaultBranchId)) {
      throw new BadRequestException('Chi nhánh mặc định phải nằm trong danh sách chi nhánh được gán');
    }

    // If no defaultBranchId specified, use the first one
    const actualDefaultBranchId = defaultBranchId || branchIds[0];

    // Delete all existing assignments
    const deleteResult = await this.staffBranchRepository.delete({ staffId, tenantId });
    console.log(`[StaffBranchService.bulkAssign] Deleted ${deleteResult.affected} existing assignments`);

    // Create new assignments
    const assignments = branches.map(branch =>
      this.staffBranchRepository.create({
        tenantId,
        staffId,
        branchId: branch.id,
        brandId: branch.brandId,
        isDefault: branch.id === actualDefaultBranchId,
      }),
    );

    const saved = await this.staffBranchRepository.save(assignments);
    console.log(`[StaffBranchService.bulkAssign] Saved ${saved.length} new assignments:`, saved.map(s => ({ id: s.id, branchId: s.branchId })));

    // Map to response with branch names
    return saved.map(a => {
      const branch = branches.find(b => b.id === a.branchId);
      return this.mapToResponse(a, branch);
    });
  }

  // Bulk assign branches to multiple staff members
  async bulkAssignToMultipleStaff(
    tenantId: string,
    staffIds: string[],
    branchIds: string[],
    defaultBranchId?: string,
  ): Promise<{ success: number; failed: number; results: Array<{ staffId: string; success: boolean; error?: string }> }> {
    const results: Array<{ staffId: string; success: boolean; error?: string }> = [];

    for (const staffId of staffIds) {
      try {
        await this.bulkAssign(tenantId, staffId, branchIds, defaultBranchId);
        results.push({ staffId, success: true });
      } catch (error: any) {
        results.push({ staffId, success: false, error: error.message });
      }
    }

    return {
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }

  private mapToResponse(assignment: StaffBranch, branch?: Branch): StaffBranchResponseDto {
    return {
      id: assignment.id,
      staffId: assignment.staffId,
      branchId: assignment.branchId,
      branchName: branch?.name || '',
      brandId: assignment.brandId,
      brandName: branch?.brand?.name || '',
      isDefault: assignment.isDefault,
      assignedAt: assignment.assignedAt,
    };
  }
}
