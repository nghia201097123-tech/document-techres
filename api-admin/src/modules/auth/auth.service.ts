import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminUser } from '../../database/entities';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: Repository<AdminUser>,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.adminUserRepository.findOne({
      where: { email },
      relations: ['permissionGroup', 'permissionGroup.permissions'],
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // Update last login
    await this.adminUserRepository.update(user.id, { lastLogin: new Date() });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const token = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        permissionGroupId: user.permissionGroupId,
        permissionGroupName: user.permissionGroup?.name,
        permissions: user.permissionGroup?.permissions?.map((p) => p.code) || [],
      },
      token,
    };
  }

  async validateUser(userId: string): Promise<AdminUser> {
    const user = await this.adminUserRepository.findOne({
      where: { id: userId, isActive: true },
      relations: ['permissionGroup', 'permissionGroup.permissions'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async getProfile(userId: string) {
    const user = await this.adminUserRepository.findOne({
      where: { id: userId },
      relations: ['permissionGroup', 'permissionGroup.permissions'],
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      permissionGroupId: user.permissionGroupId,
      permissionGroupName: user.permissionGroup?.name,
      permissions: user.permissionGroup?.permissions?.map((p) => p.code) || [],
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    };
  }
}
