import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Staff, Province, Ward, Department } from '../../database/entities';
import { CreateStaffDto, UpdateStaffDto, BulkImportStaffDto, BulkImportResultDto, BulkStaffItemDto } from './dto';
import * as bcrypt from 'bcrypt';

// Pattern for initial owner username (e.g., tr000001, ab000001)
const INITIAL_OWNER_USERNAME_PATTERN = /^[a-z]{2}000001$/;

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);
  private readonly oauthApiUrl: string;

  constructor(
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
    @InjectRepository(Province)
    private readonly provinceRepository: Repository<Province>,
    @InjectRepository(Ward)
    private readonly wardRepository: Repository<Ward>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    // Default to localhost:4002 for development
    this.oauthApiUrl = this.configService.get('OAUTH_API_URL', 'http://localhost:4002');
  }

  async findAll(tenantId: string, branchId?: string) {
    const query = this.staffRepository
      .createQueryBuilder('staff')
      .leftJoinAndSelect('staff.branch', 'branch')
      .leftJoinAndSelect('staff.brand', 'brand')
      .where('staff.tenantId = :tenantId', { tenantId });

    // Only filter by branchId if it's a valid UUID (not "all" or empty)
    const isValidUUID = branchId && branchId !== 'all' && branchId !== '' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(branchId);
    if (isValidUUID) {
      query.andWhere('staff.branchId = :branchId', { branchId });
    }

    const staffList = await query.orderBy('staff.isActive', 'DESC').addOrderBy('staff.name', 'ASC').getMany();

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

    const provinceMap = new Map<string, string>(provinces.map(p => [p.code, p.fullName] as [string, string]));
    const wardMap = new Map<string, string>(wards.map(w => [w.code, w.fullName] as [string, string]));
    const departmentMap = new Map<string, string>(departments.map(d => [d.id, d.name] as [string, string]));

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
    const enriched = await this.enrichStaffData(saved);
    return {
      ...enriched,
      temporaryPassword: tempPassword,
    };
  }

  async update(tenantId: string, id: string, updateDto: UpdateStaffDto) {
    const staff = await this.findOne(tenantId, id);
    // Only update fields that are explicitly provided (not undefined)
    // This prevents clearing fields when they're not in the request
    Object.keys(updateDto).forEach((key) => {
      const value = (updateDto as any)[key];
      if (value !== undefined) {
        (staff as any)[key] = value;
      }
    });
    const saved = await this.staffRepository.save(staff);

    // Return with enriched data (names for province, ward, department)
    return this.enrichStaffData(saved);
  }

  private async enrichStaffData(staff: Staff) {
    const [province, ward, department] = await Promise.all([
      staff.provinceCode
        ? this.provinceRepository.findOne({ where: { code: staff.provinceCode } })
        : null,
      staff.wardCode
        ? this.wardRepository.findOne({ where: { code: staff.wardCode } })
        : null,
      staff.departmentId
        ? this.departmentRepository.findOne({ where: { id: staff.departmentId } })
        : null,
    ]);

    return {
      ...staff,
      provinceName: province?.fullName || null,
      wardName: ward?.fullName || null,
      departmentName: department?.name || null,
    };
  }

  async toggleActive(tenantId: string, id: string) {
    const staff = await this.findOne(tenantId, id);

    // Protect initial owner account from deactivation
    if (staff.isActive && this.isInitialOwnerAccount(staff)) {
      throw new ForbiddenException('Không thể tắt hoạt động tài khoản chủ nhà hàng');
    }

    staff.isActive = !staff.isActive;
    return this.staffRepository.save(staff);
  }

  async resetPassword(tenantId: string, id: string) {
    const staff = await this.findOne(tenantId, id);
    const tempPassword = this.generateTempPassword();
    staff.passwordHash = await bcrypt.hash(tempPassword, 10);
    await this.staffRepository.save(staff);

    // Sync password with api-oauth
    await this.syncPasswordToOAuth(tenantId, staff.username, tempPassword);

    return { temporaryPassword: tempPassword };
  }

  /**
   * Sync password to api-oauth service
   * This ensures the User table in api-oauth has the same password
   */
  private async syncPasswordToOAuth(tenantId: string, username: string, newPassword: string): Promise<void> {
    try {
      const url = `${this.oauthApiUrl}/api/v1/auth/tenant-users/password`;
      this.logger.log(`Syncing password for user ${username} to api-oauth`);

      await firstValueFrom(
        this.httpService.put(url, {
          tenantId,
          username,
          newPassword,
        }),
      );

      this.logger.log(`Password synced successfully for user ${username}`);
    } catch (error) {
      // Log the error but don't fail the operation
      // The password is already updated in api-dashboard, just log the sync failure
      this.logger.error(`Failed to sync password to api-oauth for user ${username}: ${error.message}`);
      // Optionally, you could throw here if you want the operation to fail
      // throw new Error(`Failed to sync password with authentication service: ${error.message}`);
    }
  }

  async delete(tenantId: string, id: string) {
    const staff = await this.findOne(tenantId, id);

    // Protect initial owner account from deletion
    if (this.isInitialOwnerAccount(staff)) {
      throw new ForbiddenException('Không thể xóa tài khoản chủ nhà hàng');
    }

    await this.staffRepository.remove(staff);
    return { message: 'Đã xóa nhân viên' };
  }

  private async generateUsername(tenantId: string, prefix: string): Promise<string> {
    // Find the highest existing username number with this prefix in this tenant
    // This prevents collisions even if some staff were deleted or sync failed
    const existingStaff = await this.staffRepository
      .createQueryBuilder('staff')
      .where('staff.tenantId = :tenantId', { tenantId })
      .andWhere('staff.username LIKE :prefix', { prefix: `${prefix}%` })
      .select('staff.username')
      .orderBy('staff.username', 'DESC')
      .limit(1)
      .getOne();

    let nextNumber = 1;
    if (existingStaff?.username) {
      // Extract number from username (e.g., tr000005 -> 5)
      const numPart = existingStaff.username.substring(prefix.length);
      const currentMax = parseInt(numPart, 10);
      if (!isNaN(currentMax)) {
        nextNumber = currentMax + 1;
      }
    }

    // Format: prefix (2 chars) + 6-digit padded number
    // Example: tr000001, tr000002, ...
    return `${prefix}${String(nextNumber).padStart(6, '0')}`;
  }

  private generateTempPassword(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  /**
   * Check if staff is the initial owner account (e.g., tr000001, ab000001)
   * Initial owner accounts cannot be deleted or deactivated
   */
  private isInitialOwnerAccount(staff: Staff): boolean {
    return INITIAL_OWNER_USERNAME_PATTERN.test(staff.username);
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

  /**
   * Bulk update department for multiple staff
   */
  async bulkUpdateDepartment(
    tenantId: string,
    staffIds: string[],
    departmentId: string,
  ): Promise<{ success: number; failed: number; errors: { staffId: string; message: string }[] }> {
    const result = { success: 0, failed: 0, errors: [] as { staffId: string; message: string }[] };

    for (const staffId of staffIds) {
      try {
        const staff = await this.staffRepository.findOne({
          where: { tenantId, id: staffId },
        });

        if (!staff) {
          result.errors.push({ staffId, message: 'Không tìm thấy nhân viên' });
          result.failed++;
          continue;
        }

        staff.departmentId = departmentId;
        await this.staffRepository.save(staff);
        result.success++;
      } catch (error) {
        result.errors.push({ staffId, message: error.message || 'Lỗi không xác định' });
        result.failed++;
      }
    }

    return result;
  }

  /**
   * Bulk update branch for multiple staff
   */
  async bulkUpdateBranch(
    tenantId: string,
    staffIds: string[],
    branchId: string,
  ): Promise<{ success: number; failed: number; errors: { staffId: string; message: string }[] }> {
    const result = { success: 0, failed: 0, errors: [] as { staffId: string; message: string }[] };

    for (const staffId of staffIds) {
      try {
        const staff = await this.staffRepository.findOne({
          where: { tenantId, id: staffId },
        });

        if (!staff) {
          result.errors.push({ staffId, message: 'Không tìm thấy nhân viên' });
          result.failed++;
          continue;
        }

        staff.branchId = branchId;
        await this.staffRepository.save(staff);
        result.success++;
      } catch (error) {
        result.errors.push({ staffId, message: error.message || 'Lỗi không xác định' });
        result.failed++;
      }
    }

    return result;
  }

  /**
   * Bulk toggle active status for multiple staff
   */
  async bulkToggleActive(
    tenantId: string,
    staffIds: string[],
    isActive: boolean,
  ): Promise<{ success: number; failed: number; errors: { staffId: string; message: string }[] }> {
    const result = { success: 0, failed: 0, errors: [] as { staffId: string; message: string }[] };

    for (const staffId of staffIds) {
      try {
        const staff = await this.staffRepository.findOne({
          where: { tenantId, id: staffId },
        });

        if (!staff) {
          result.errors.push({ staffId, message: 'Không tìm thấy nhân viên' });
          result.failed++;
          continue;
        }

        // Protect initial owner account from deactivation
        if (!isActive && this.isInitialOwnerAccount(staff)) {
          result.errors.push({ staffId, message: 'Không thể tắt hoạt động tài khoản chủ nhà hàng' });
          result.failed++;
          continue;
        }

        staff.isActive = isActive;
        await this.staffRepository.save(staff);
        result.success++;
      } catch (error) {
        result.errors.push({ staffId, message: error.message || 'Lỗi không xác định' });
        result.failed++;
      }
    }

    return result;
  }

  /**
   * Bulk reset password for multiple staff
   */
  async bulkResetPassword(
    tenantId: string,
    staffIds: string[],
    newPassword?: string,
  ): Promise<{
    success: number;
    failed: number;
    errors: { staffId: string; message: string }[];
    passwords: { staffId: string; username: string; password: string }[];
  }> {
    const result = {
      success: 0,
      failed: 0,
      errors: [] as { staffId: string; message: string }[],
      passwords: [] as { staffId: string; username: string; password: string }[],
    };

    for (const staffId of staffIds) {
      try {
        const staff = await this.staffRepository.findOne({
          where: { tenantId, id: staffId },
        });

        if (!staff) {
          result.errors.push({ staffId, message: 'Không tìm thấy nhân viên' });
          result.failed++;
          continue;
        }

        const password = newPassword || this.generateTempPassword();
        const passwordHash = await bcrypt.hash(password, 10);

        staff.passwordHash = passwordHash;
        await this.staffRepository.save(staff);

        // Sync password with api-oauth
        await this.syncPasswordToOAuth(tenantId, staff.username, password);

        result.passwords.push({ staffId, username: staff.username, password });
        result.success++;
      } catch (error) {
        result.errors.push({ staffId, message: error.message || 'Lỗi không xác định' });
        result.failed++;
      }
    }

    return result;
  }

  /**
   * Bulk delete multiple staff
   */
  async bulkDelete(
    tenantId: string,
    staffIds: string[],
  ): Promise<{ success: number; failed: number; errors: { staffId: string; message: string }[] }> {
    const result = { success: 0, failed: 0, errors: [] as { staffId: string; message: string }[] };

    for (const staffId of staffIds) {
      try {
        const staff = await this.staffRepository.findOne({
          where: { tenantId, id: staffId },
        });

        if (!staff) {
          result.errors.push({ staffId, message: 'Không tìm thấy nhân viên' });
          result.failed++;
          continue;
        }

        // Protect initial owner account from deletion
        if (this.isInitialOwnerAccount(staff)) {
          result.errors.push({ staffId, message: 'Không thể xóa tài khoản chủ nhà hàng' });
          result.failed++;
          continue;
        }

        await this.staffRepository.remove(staff);
        result.success++;
      } catch (error) {
        result.errors.push({ staffId, message: error.message || 'Lỗi không xác định' });
        result.failed++;
      }
    }

    return result;
  }
}
