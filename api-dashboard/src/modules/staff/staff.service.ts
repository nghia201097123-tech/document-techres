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

  async create(tenantId: string, companyId: string, branchId: string, createDto: CreateStaffDto) {
    // Generate username from name
    const username = this.generateUsername(createDto.name);
    // Generate temporary password
    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Exclude role from DTO spread (role is enum in entity, string in DTO)
    const { role, ...restDto } = createDto;
    const staff = this.staffRepository.create({
      ...restDto,
      tenantId,
      companyId,
      branchId,
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

  private generateUsername(name: string): string {
    const normalized = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]/g, '');
    const random = Math.random().toString(36).substring(2, 6);
    return `${normalized}${random}`;
  }

  private generateTempPassword(): string {
    return Math.random().toString(36).substring(2, 10);
  }
}
