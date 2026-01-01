import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Permission, PermissionGroup } from '../../database/entities';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { CreatePermissionGroupDto } from './dto/create-permission-group.dto';
import { UpdatePermissionGroupDto } from './dto/update-permission-group.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(PermissionGroup)
    private readonly permissionGroupRepository: Repository<PermissionGroup>,
  ) {}

  // Permission methods
  async createPermission(dto: CreatePermissionDto): Promise<Permission> {
    const existing = await this.permissionRepository.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException('Mã quyền đã tồn tại');
    const permission = this.permissionRepository.create(dto);
    return this.permissionRepository.save(permission);
  }

  async findAllPermissions(paginationDto: PaginationDto) {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;
    const queryBuilder = this.permissionRepository.createQueryBuilder('permission');
    if (search) {
      queryBuilder.andWhere('(permission.name ILIKE :search OR permission.code ILIKE :search)', { search: `%${search}%` });
    }
    queryBuilder.orderBy('permission.module', 'ASC').addOrderBy('permission.createdAt', 'DESC').skip(skip).take(limit);
    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findPermissionsByModule(module: string): Promise<Permission[]> {
    return this.permissionRepository.find({ where: { module, isActive: true }, order: { createdAt: 'ASC' } });
  }

  async findOnePermission(id: string): Promise<Permission> {
    const permission = await this.permissionRepository.findOne({ where: { id } });
    if (!permission) throw new NotFoundException('Không tìm thấy quyền');
    return permission;
  }

  async updatePermission(id: string, dto: UpdatePermissionDto): Promise<Permission> {
    const permission = await this.findOnePermission(id);
    Object.assign(permission, dto);
    return this.permissionRepository.save(permission);
  }

  async removePermission(id: string): Promise<void> {
    const permission = await this.findOnePermission(id);
    await this.permissionRepository.remove(permission);
  }

  // Permission Group methods
  async createPermissionGroup(dto: CreatePermissionGroupDto): Promise<PermissionGroup> {
    const existing = await this.permissionGroupRepository.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException('Mã nhóm quyền đã tồn tại');

    const group = this.permissionGroupRepository.create({
      name: dto.name,
      code: dto.code,
      description: dto.description,
    });

    if (dto.permissionIds && dto.permissionIds.length > 0) {
      group.permissions = await this.permissionRepository.find({ where: { id: In(dto.permissionIds) } });
    }

    return this.permissionGroupRepository.save(group);
  }

  async findAllPermissionGroups(paginationDto: PaginationDto) {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;
    const queryBuilder = this.permissionGroupRepository.createQueryBuilder('group');
    queryBuilder.leftJoinAndSelect('group.permissions', 'permissions');
    if (search) {
      queryBuilder.andWhere('(group.name ILIKE :search OR group.code ILIKE :search)', { search: `%${search}%` });
    }
    queryBuilder.orderBy('group.createdAt', 'DESC').skip(skip).take(limit);
    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOnePermissionGroup(id: string): Promise<PermissionGroup> {
    const group = await this.permissionGroupRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!group) throw new NotFoundException('Không tìm thấy nhóm quyền');
    return group;
  }

  async updatePermissionGroup(id: string, dto: UpdatePermissionGroupDto): Promise<PermissionGroup> {
    const group = await this.findOnePermissionGroup(id);

    if (dto.permissionIds) {
      group.permissions = await this.permissionRepository.find({ where: { id: In(dto.permissionIds) } });
    }

    Object.assign(group, {
      name: dto.name ?? group.name,
      code: dto.code ?? group.code,
      description: dto.description ?? group.description,
      isActive: dto.isActive ?? group.isActive,
    });

    return this.permissionGroupRepository.save(group);
  }

  async removePermissionGroup(id: string): Promise<void> {
    const group = await this.findOnePermissionGroup(id);
    await this.permissionGroupRepository.remove(group);
  }

  async togglePermissionGroupStatus(id: string): Promise<PermissionGroup> {
    const group = await this.findOnePermissionGroup(id);
    group.isActive = !group.isActive;
    return this.permissionGroupRepository.save(group);
  }
}
