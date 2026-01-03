import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Staff, Province, Ward, Department } from '../../database/entities';
import { CreateStaffDto, UpdateStaffDto, BulkImportStaffDto, BulkImportResultDto, BulkStaffItemDto } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
    @InjectRepository(Province)
    private readonly provinceRepository: Repository<Province>,
    @InjectRepository(Ward)
    private readonly wardRepository: Repository<Ward>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  async findAll(tenantId: string, branchId?: string) {
    const query = this.staffRepository
      .createQueryBuilder('staff')
      .leftJoinAndSelect('staff.branch', 'branch')
      .leftJoinAndSelect('staff.brand', 'brand')
      .where('staff.tenantId = :tenantId', { tenantId });

    if (branchId) {
      query.andWhere('staff.branchId = :branchId', { branchId });
    }

    const staffList = await query.orderBy('staff.name', 'ASC').getMany();

    // Get province/ward/department names
    const provinceCodes = [...new Set(staffList.map(s => s.provinceCode).filter(Boolean))] as string[];
    const wardCodes = [...new Set(staffList.map(s => s.wardCode).filter(Boolean))] as string[];
    const departmentIds = [...new Set(staffList.map(s => s.departmentId).filter(Boolean))] as string[];

    const [provinces, wards, departments] = await Promise.all([
      provinceCodes.length > 0
        ? this.provinceRepository.find({ where: { code: In(provinceCodes) } })
        : [],
      wardCodes.length > 0
        ? this.wardRepository.find({ where: { code: In(wardCodes) } })
        : [],
      departmentIds.length > 0
        ? this.departmentRepository.find({ where: { id: In(departmentIds) } })
        : [],
    ]);

    const provinceMap = new Map(provinces.map(p => [p.code, p.fullName]));
    const wardMap = new Map(wards.map(w => [w.code, w.fullName]));
    const departmentMap = new Map(departments.map(d => [d.id, d.name]));

    // Transform to include names
    return staffList.map(staff => ({
      ...staff,
      branchName: staff.branch?.name || null,
      brandName: staff.brand?.name || null,
      provinceName: staff.provinceCode ? provinceMap.get(staff.provinceCode) || null : null,
      wardName: staff.wardCode ? wardMap.get(staff.wardCode) || null : null,
      departmentName: staff.departmentId ? departmentMap.get(staff.departmentId) || null : null,
    }));
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

  async bulkImport(
    tenantId: string,
    companyId: string,
    bulkDto: BulkImportStaffDto,
  ): Promise<BulkImportResultDto> {
    const result: BulkImportResultDto = {
      created: 0,
      updated: 0,
      errors: [],
    };

    const prefix = bulkDto.usernamePrefix?.toLowerCase().substring(0, 2) || 'tr';

    for (let i = 0; i < bulkDto.items.length; i++) {
      const item = bulkDto.items[i];
      const rowNumber = i + 2; // Excel row (1-indexed + header)

      try {
        if (item.id) {
          // Update existing staff
          const staff = await this.staffRepository.findOne({
            where: { tenantId, id: item.id },
          });

          if (!staff) {
            result.errors.push({
              row: rowNumber,
              message: `Không tìm thấy nhân viên với ID: ${item.id}`,
            });
            continue;
          }

          // Update fields
          if (item.name) staff.name = item.name;
          if (item.phone) staff.phone = item.phone;
          if (item.email) staff.email = item.email;
          if (item.birthDate) staff.birthDate = new Date(item.birthDate);
          if (item.gender) staff.gender = item.gender;
          if (item.idNumber) staff.idNumber = item.idNumber;
          if (item.address) staff.address = item.address;
          if (item.provinceCode) staff.provinceCode = item.provinceCode;
          if (item.wardCode) staff.wardCode = item.wardCode;
          if (item.departmentId) staff.departmentId = item.departmentId;

          await this.staffRepository.save(staff);
          result.updated++;
        } else {
          // Create new staff - validate required fields
          if (!item.name) {
            result.errors.push({ row: rowNumber, message: 'Tên nhân viên là bắt buộc' });
            continue;
          }
          if (!item.birthDate) {
            result.errors.push({ row: rowNumber, message: 'Ngày sinh là bắt buộc' });
            continue;
          }
          if (!item.gender) {
            result.errors.push({ row: rowNumber, message: 'Giới tính là bắt buộc' });
            continue;
          }
          if (!item.address) {
            result.errors.push({ row: rowNumber, message: 'Địa chỉ là bắt buộc' });
            continue;
          }
          if (!item.departmentId) {
            result.errors.push({ row: rowNumber, message: 'Bộ phận là bắt buộc' });
            continue;
          }
          if (!item.brandId) {
            result.errors.push({ row: rowNumber, message: 'Thương hiệu là bắt buộc' });
            continue;
          }
          if (!item.branchId) {
            result.errors.push({ row: rowNumber, message: 'Chi nhánh là bắt buộc' });
            continue;
          }

          const username = await this.generateUsername(tenantId, prefix);
          const tempPassword = this.generateTempPassword();
          const passwordHash = await bcrypt.hash(tempPassword, 10);

          const staff = this.staffRepository.create({
            tenantId,
            companyId,
            name: item.name,
            birthDate: new Date(item.birthDate),
            gender: item.gender,
            address: item.address,
            provinceCode: item.provinceCode,
            wardCode: item.wardCode,
            departmentId: item.departmentId,
            brandId: item.brandId,
            branchId: item.branchId,
            phone: item.phone,
            email: item.email,
            idNumber: item.idNumber,
            username,
            passwordHash,
            isActive: true,
          });

          await this.staffRepository.save(staff);
          result.created++;
        }
      } catch (error) {
        result.errors.push({
          row: rowNumber,
          message: error.message || 'Lỗi không xác định',
        });
      }
    }

    return result;
  }
}
