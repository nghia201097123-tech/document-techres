import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminUser, PermissionGroup, AdminRole } from '../../database/entities';
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

  async create(dto: CreateAdminUserDto): Promise<Omit<AdminUser, 'passwordHash'>> {
    const existing = await this.adminUserRepository.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email đã tồn tại');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const adminUser = this.adminUserRepository.create({
      email: dto.email,
      passwordHash: hashedPassword,
      name: dto.fullName,
      phone: dto.phone,
      role: dto.role as AdminRole,
    });

    if (dto.permissionGroupId) {
      const permissionGroup = await this.permissionGroupRepository.findOne({ where: { id: dto.permissionGroupId } });
      if (permissionGroup) {
        adminUser.permissionGroup = permissionGroup;
      }
    }

    const saved = await this.adminUserRepository.save(adminUser);
    const { passwordHash, ...result } = saved;
    return result as Omit<AdminUser, 'passwordHash'>;
  }

  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.adminUserRepository.createQueryBuilder('user');
    queryBuilder.leftJoinAndSelect('user.permissionGroup', 'permissionGroup');
    queryBuilder.select([
      'user.id', 'user.email', 'user.name', 'user.phone', 'user.role', 'user.isActive', 'user.createdAt', 'user.lastLogin',
      'permissionGroup.id', 'permissionGroup.name', 'permissionGroup.code',
    ]);

    if (search) {
      queryBuilder.andWhere('(user.email ILIKE :search OR user.name ILIKE :search)', { search: `%${search}%` });
    }

    queryBuilder.orderBy('user.createdAt', 'DESC').skip(skip).take(limit);
    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<AdminUser> {
    const user = await this.adminUserRepository.findOne({
      where: { id },
      relations: ['permissionGroup', 'permissionGroup.permissions'],
      select: ['id', 'email', 'name', 'phone', 'role', 'isActive', 'createdAt', 'lastLogin'],
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

  async update(id: string, dto: UpdateAdminUserDto): Promise<Omit<AdminUser, 'passwordHash'>> {
    const user = await this.adminUserRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    if (dto.permissionGroupId) {
      const permissionGroup = await this.permissionGroupRepository.findOne({ where: { id: dto.permissionGroupId } });
      if (permissionGroup) {
        user.permissionGroup = permissionGroup;
      }
    }

    if (dto.fullName) user.name = dto.fullName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.role) user.role = dto.role as AdminRole;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    const saved = await this.adminUserRepository.save(user);
    const { passwordHash, ...result } = saved;
    return result as Omit<AdminUser, 'passwordHash'>;
  }

  async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.adminUserRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) throw new BadRequestException('Mật khẩu hiện tại không đúng');

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.adminUserRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.adminUserRepository.remove(user);
  }

  async toggleStatus(id: string): Promise<Omit<AdminUser, 'passwordHash'>> {
    const user = await this.adminUserRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    user.isActive = !user.isActive;
    const saved = await this.adminUserRepository.save(user);
    const { passwordHash, ...result } = saved;
    return result as Omit<AdminUser, 'passwordHash'>;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.adminUserRepository.update(id, { lastLogin: new Date() });
  }
}
