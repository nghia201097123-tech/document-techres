import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch, Brand } from '../../database/entities';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
  ) {}

  async create(createBranchDto: CreateBranchDto): Promise<Branch> {
    const brand = await this.brandRepository.findOne({
      where: { id: createBranchDto.brandId },
    });
    if (!brand) {
      throw new NotFoundException('Không tìm thấy thương hiệu');
    }

    const existing = await this.branchRepository.findOne({
      where: { code: createBranchDto.code },
    });
    if (existing) {
      throw new ConflictException('Mã chi nhánh đã tồn tại');
    }

    const branch = this.branchRepository.create(createBranchDto);
    return this.branchRepository.save(branch);
  }

  async findAll(paginationDto: PaginationDto & { brandId?: string }) {
    const { page = 1, limit = 10, search, brandId } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.branchRepository
      .createQueryBuilder('branch')
      .leftJoinAndSelect('branch.brand', 'brand')
      .leftJoinAndSelect('brand.company', 'company')
      .leftJoinAndSelect('branch.package', 'package');

    if (search) {
      queryBuilder.andWhere(
        '(branch.name ILIKE :search OR branch.code ILIKE :search OR branch.address ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (brandId) {
      queryBuilder.andWhere('branch.brandId = :brandId', { brandId });
    }

    queryBuilder.orderBy('branch.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: data.map((branch) => ({
        ...branch,
        brandName: branch.brand?.name,
        companyName: branch.brand?.company?.name,
        packageName: branch.package?.name,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Branch> {
    const branch = await this.branchRepository.findOne({
      where: { id },
      relations: ['brand', 'brand.company', 'package'],
    });

    if (!branch) {
      throw new NotFoundException('Không tìm thấy chi nhánh');
    }

    return branch;
  }

  async update(id: string, updateBranchDto: UpdateBranchDto): Promise<Branch> {
    const branch = await this.findOne(id);
    Object.assign(branch, updateBranchDto);
    return this.branchRepository.save(branch);
  }

  async remove(id: string): Promise<void> {
    const branch = await this.findOne(id);
    await this.branchRepository.remove(branch);
  }

  async toggleStatus(id: string): Promise<Branch> {
    const branch = await this.findOne(id);
    branch.isActive = !branch.isActive;
    return this.branchRepository.save(branch);
  }
}
