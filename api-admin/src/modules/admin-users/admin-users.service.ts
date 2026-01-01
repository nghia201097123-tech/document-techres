import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminUser, PermissionGroup } from '../../database/entities';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: Repository<AdminUser>,
    @InjectRepository(PermissionGroup)
    private readonly permissionGroupRepository: Repository<PermissionGroup>,
  ) {}

  async create(dto: CreateAdminUserDto): Promise<AdminUser> {
    const existing = await this.adminUserRepository.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email đã tồn tại');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const adminUser = this.adminUserRepository.create({
      email: dto.email,
      password: hashedPassword,
      fullName: dto.fullName,
      phone: dto.phone,
      role: dto.role,
    });

    if (dto.permissionGroupId) {
      const permissionGroup = await this.permissionGroupRepository.findOne({ where: { id: dto.permissionGroupId } });
      if (permissionGroup) {
        adminUser.permissionGroup = permissionGroup;
      }
    }

    const saved = await this.adminUserRepository.save(adminUser);
    delete saved.password;
    return saved;
  }

  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.adminUserRepository.createQueryBuilder('user');
    queryBuilder.leftJoinAndSelect('user.permissionGroup', 'permissionGroup');
    queryBuilder.select([
      'user.id', 'user.email', 'user.fullName', 'user.phone', 'user.role', 'user.isActive', 'user.createdAt', 'user.lastLoginAt',
      'permissionGroup.id', 'permissionGroup.name', 'permissionGroup.code',
    ]);

    if (search) {
      queryBuilder.andWhere('(user.email ILIKE :search OR user.fullName ILIKE :search)', { search: `%${search}%` });
    }

    queryBuilder.orderBy('user.createdAt', 'DESC').skip(skip).take(limit);
    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<AdminUser> {
    const user = await this.adminUserRepository.findOne({
      where: { id },
      relations: ['permissionGroup', 'permissionGroup.permissions'],
      select: ['id', 'email', 'fullName', 'phone', 'role', 'isActive', 'createdAt', 'lastLoginAt'],
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  async findByEmail(email: string): Promise<AdminUser | null> {
    return this.adminUserRepository.findOne({
      where: { email },
      relations: ['permissionGroup', 'permissionGroup.permissions'],
    });
  }

  async update(id: string, dto: UpdateAdminUserDto): Promise<AdminUser> {
    const user = await this.findOne(id);

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    if (dto.permissionGroupId) {
      const permissionGroup = await this.permissionGroupRepository.findOne({ where: { id: dto.permissionGroupId } });
      if (permissionGroup) {
        user.permissionGroup = permissionGroup;
      }
    }

    Object.assign(user, dto);
    const saved = await this.adminUserRepository.save(user);
    delete saved.password;
    return saved;
  }

  async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.adminUserRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) throw new BadRequestException('Mật khẩu hiện tại không đúng');

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.adminUserRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.adminUserRepository.remove(user);
  }

  async toggleStatus(id: string): Promise<AdminUser> {
    const user = await this.findOne(id);
    user.isActive = !user.isActive;
    const saved = await this.adminUserRepository.save(user);
    delete saved.password;
    return saved;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.adminUserRepository.update(id, { lastLoginAt: new Date() });
  }
}
