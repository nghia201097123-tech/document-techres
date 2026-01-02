import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Staff, Company } from '../../database/entities';
import { LoginDto, ChangePasswordDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Đăng nhập với tenant_id + username + password
   * tenant_id = company.code (tiên định danh)
   */
  async login(loginDto: LoginDto) {
    const { tenantId, username, password } = loginDto;

    // 1. Kiểm tra công ty tồn tại và đang hoạt động
    const company = await this.companyRepository.findOne({
      where: { code: tenantId.toUpperCase(), isActive: true },
    });

    if (!company) {
      throw new UnauthorizedException('Mã công ty không tồn tại hoặc đã bị tạm ngưng');
    }

    // 2. Tìm nhân viên theo tenant_id và username
    const staff = await this.staffRepository.findOne({
      where: {
        tenantId: tenantId.toUpperCase(),
        username: username,
        isActive: true,
      },
      relations: ['branch', 'brand'],
    });

    if (!staff) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không chính xác');
    }

    // 3. Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(password, staff.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không chính xác');
    }

    // 4. Cập nhật thời gian đăng nhập
    await this.staffRepository.update(staff.id, {
      lastLoginAt: new Date(),
    });

    // 5. Tạo JWT token
    const payload = {
      sub: staff.id,
      tenantId: staff.tenantId,
      companyId: staff.companyId,
      branchId: staff.branchId,
      username: staff.username,
      role: staff.role,
    };

    const token = this.jwtService.sign(payload);

    // 6. Trả về thông tin đăng nhập
    return {
      staff: {
        id: staff.id,
        tenantId: staff.tenantId,
        companyId: staff.companyId,
        brandId: staff.brandId,
        branchId: staff.branchId,
        departmentId: staff.departmentId,
        name: staff.name,
        avatarUrl: staff.avatarUrl,
        phone: staff.phone,
        email: staff.email,
        username: staff.username,
        role: staff.role,
        isActive: staff.isActive,
        lastLoginAt: new Date().toISOString(),
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt,
      },
      company: {
        id: company.id,
        code: company.code,
        name: company.name,
        logoUrl: company.logoUrl,
        taxCode: company.taxCode,
        email: company.email,
        phone: company.phone,
        isActive: company.isActive,
      },
      token,
    };
  }

  /**
   * Đổi mật khẩu
   */
  async changePassword(staffId: string, dto: ChangePasswordDto) {
    const staff = await this.staffRepository.findOne({
      where: { id: staffId },
    });

    if (!staff) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }

    // Kiểm tra mật khẩu hiện tại
    const isPasswordValid = await bcrypt.compare(dto.currentPassword, staff.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mật khẩu hiện tại không chính xác');
    }

    // Hash mật khẩu mới
    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    // Cập nhật
    await this.staffRepository.update(staff.id, {
      passwordHash: newPasswordHash,
    });

    return { message: 'Đổi mật khẩu thành công' };
  }

  /**
   * Lấy thông tin user hiện tại từ token
   */
  async getMe(staffId: string) {
    const staff = await this.staffRepository.findOne({
      where: { id: staffId },
      relations: ['branch', 'brand'],
    });

    if (!staff) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }

    const company = await this.companyRepository.findOne({
      where: { code: staff.tenantId },
    });

    return {
      staff: {
        id: staff.id,
        tenantId: staff.tenantId,
        companyId: staff.companyId,
        brandId: staff.brandId,
        branchId: staff.branchId,
        departmentId: staff.departmentId,
        name: staff.name,
        avatarUrl: staff.avatarUrl,
        phone: staff.phone,
        email: staff.email,
        username: staff.username,
        role: staff.role,
        isActive: staff.isActive,
        lastLoginAt: staff.lastLoginAt,
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt,
      },
      company: company
        ? {
            id: company.id,
            code: company.code,
            name: company.name,
            logoUrl: company.logoUrl,
            taxCode: company.taxCode,
            email: company.email,
            phone: company.phone,
            isActive: company.isActive,
          }
        : null,
    };
  }
}
