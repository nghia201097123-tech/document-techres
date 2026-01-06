import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch, Brand } from '../../database/entities';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchListDto } from './dto/branch-list.dto';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
  ) {}

  /**
   * Transform branch entity to response (map logoUrl to logo)
   */
  private transformBranch(branch: Branch): any {
    const { logoUrl, ...rest } = branch as any;
    return {
      ...rest,
      logo: logoUrl,
    };
  }

  async create(createBranchDto: CreateBranchDto): Promise<any> {
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

    // Map logo from DTO to logoUrl in entity
    const { logo, ...restDto } = createBranchDto as any;
    const branchData: Partial<Branch> = {
      ...restDto,
      tenantId: brand.tenantId,
    };
    if (logo !== undefined) {
      branchData.logoUrl = logo;
    }

    const branch = this.branchRepository.create(branchData);
    const saved = await this.branchRepository.save(branch);
    return this.transformBranch(saved);
  }

  async findAll(query: BranchListDto) {
    const { page = 1, limit = 10, search, brandId, companyId } = query;
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

    if (companyId) {
      queryBuilder.andWhere('brand.companyId = :companyId', { companyId });
    }

    queryBuilder.orderBy('branch.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: data.map((branch) => ({
        ...this.transformBranch(branch),
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

  async findOne(id: string): Promise<any> {
    const branch = await this.branchRepository.findOne({
      where: { id },
      relations: ['brand', 'brand.company', 'package'],
    });

    if (!branch) {
      throw new NotFoundException('Không tìm thấy chi nhánh');
    }

    return this.transformBranch(branch);
  }

  async update(id: string, updateBranchDto: UpdateBranchDto): Promise<any> {
    const branch = await this.branchRepository.findOne({
      where: { id },
    });

    if (!branch) {
      throw new NotFoundException('Không tìm thấy chi nhánh');
    }

    // Map logo from DTO to logoUrl in entity
    const { logo, ...restDto } = updateBranchDto as any;
    if (logo !== undefined) {
      branch.logoUrl = logo;
    }
    Object.assign(branch, restDto);
    const saved = await this.branchRepository.save(branch);
    return this.transformBranch(saved);
  }

  async remove(id: string): Promise<void> {
    const branch = await this.branchRepository.findOne({
      where: { id },
    });

    if (!branch) {
      throw new NotFoundException('Không tìm thấy chi nhánh');
    }

    await this.branchRepository.remove(branch);
  }

  async toggleStatus(id: string): Promise<any> {
    const branch = await this.branchRepository.findOne({
      where: { id },
    });

    if (!branch) {
      throw new NotFoundException('Không tìm thấy chi nhánh');
    }

    branch.isActive = !branch.isActive;
    const saved = await this.branchRepository.save(branch);
    return this.transformBranch(saved);
  }
}
