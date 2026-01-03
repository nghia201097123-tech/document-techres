import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from '../../database/entities';
import { CreateStaffDto, UpdateStaffDto } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
  ) {}

  async findAll(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId) {
      where.branchId = branchId;
    }
    return this.staffRepository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const staff = await this.staffRepository.findOne({
      where: { tenantId, id },
      relations: ['branch'],
    });
    if (!staff) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }
    return staff;
  }

  async create(tenantId: string, companyId: string, createDto: CreateStaffDto) {
    // Generate username with pattern: prefix (2 chars) + auto-increment (6 digits)
    // Example: tr000001, tr000002, ...
    const prefix = createDto.usernamePrefix?.toLowerCase().substring(0, 2) || 'tr';
    const username = await this.generateUsername(tenantId, prefix);

    // Generate temporary password
    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Exclude role and usernamePrefix from DTO spread
    // brandId, branchId, departmentId now come from DTO
    const { role, usernamePrefix, birthDate, ...restDto } = createDto;
    const staff = this.staffRepository.create({
      ...restDto,
      tenantId,
      companyId,
      birthDate: birthDate ? new Date(birthDate) : undefined,
      username,
      passwordHash,
      isActive: true,
    });

    const saved = await this.staffRepository.save(staff);
    return {
      ...saved,
      temporaryPassword: tempPassword,
    };
  }

  async update(tenantId: string, id: string, updateDto: UpdateStaffDto) {
    const staff = await this.findOne(tenantId, id);
    Object.assign(staff, updateDto);
    return this.staffRepository.save(staff);
  }

  async toggleActive(tenantId: string, id: string) {
    const staff = await this.findOne(tenantId, id);
    staff.isActive = !staff.isActive;
    return this.staffRepository.save(staff);
  }

  async resetPassword(tenantId: string, id: string) {
    const staff = await this.findOne(tenantId, id);
    const tempPassword = this.generateTempPassword();
    staff.passwordHash = await bcrypt.hash(tempPassword, 10);
    await this.staffRepository.save(staff);
    return { temporaryPassword: tempPassword };
  }

  private async generateUsername(tenantId: string, prefix: string): Promise<string> {
    // Count existing staff in this tenant to get next number
    const count = await this.staffRepository.count({ where: { tenantId } });
    const nextNumber = count + 1;
    // Format: prefix (2 chars) + 6-digit padded number
    // Example: tr000001, tr000002, ...
    return `${prefix}${String(nextNumber).padStart(6, '0')}`;
  }

  private generateTempPassword(): string {
    return Math.random().toString(36).substring(2, 10);
  }
}
