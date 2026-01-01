import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Company, Brand, Branch, Staff, StaffRole } from '../../database/entities';
import { BusinessModel } from '../../database/entities/brand.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import {
  CreateCompanyWizardDto,
  CreateCompanyWizardResponseDto,
} from './dto/create-company-wizard.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    const existing = await this.companyRepository.findOne({
      where: { code: createCompanyDto.code },
    });

    if (existing) {
      throw new ConflictException('Mã công ty đã tồn tại');
    }

    const company = this.companyRepository.create(createCompanyDto);
    return this.companyRepository.save(company);
  }

  /**
   * Wizard tạo công ty 3 bước: Company + Brand + Branch
   * Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
   */
  async createWithWizard(
    wizardDto: CreateCompanyWizardDto,
  ): Promise<CreateCompanyWizardResponseDto> {
    const { company: companyDto, brand: brandDto, branch: branchDto, owner: ownerDto } = wizardDto;

    // Validate unique codes trước khi tạo
    const existingCompany = await this.companyRepository.findOne({
      where: { code: companyDto.code },
    });
    if (existingCompany) {
      throw new ConflictException('Mã công ty đã tồn tại');
    }

    const existingBrand = await this.brandRepository.findOne({
      where: { code: brandDto.code },
    });
    if (existingBrand) {
      throw new ConflictException('Mã thương hiệu đã tồn tại');
    }

    const existingBranch = await this.branchRepository.findOne({
      where: { code: branchDto.code },
    });
    if (existingBranch) {
      throw new ConflictException('Mã chi nhánh đã tồn tại');
    }

    // Sử dụng transaction để tạo tất cả
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Bước 1: Tạo Company
      const companyData: Partial<Company> = {
        name: companyDto.name,
        code: companyDto.code,
        logoUrl: companyDto.logoUrl,
        taxCode: companyDto.taxCode,
        address: companyDto.address,
        phone: companyDto.phone,
        email: companyDto.email,
        representative: companyDto.representative,
        subscriptionPlan: companyDto.subscriptionPlan,
        maxBranches: companyDto.maxBranches,
        maxUsers: companyDto.maxUsers,
      };
      if (companyDto.subscriptionExpiresAt) {
        companyData.subscriptionExpiresAt = new Date(companyDto.subscriptionExpiresAt);
      }
      const company = queryRunner.manager.create(Company, companyData);
      const savedCompany = await queryRunner.manager.save(company);

      // tenant_id = company.code
      const tenantId = savedCompany.code;

      // Bước 2: Tạo Brand (Thương hiệu đầu tiên)
      const brand = queryRunner.manager.create(Brand, {
        tenantId,
        companyId: savedCompany.id,
        name: brandDto.name,
        code: brandDto.code,
        logoUrl: brandDto.logoUrl,
        description: brandDto.description,
        businessModel: brandDto.businessModel || BusinessModel.FULL_SYSTEM,
      });
      const savedBrand = await queryRunner.manager.save(brand);

      // Bước 3: Tạo Branch (Chi nhánh đầu tiên)
      const branch = queryRunner.manager.create(Branch, {
        tenantId,
        brandId: savedBrand.id,
        name: branchDto.name,
        code: branchDto.code,
        logoUrl: branchDto.logoUrl || brandDto.logoUrl, // Mặc định dùng logo thương hiệu
        address: branchDto.address,
        phone: branchDto.phone,
        email: branchDto.email,
        manager: branchDto.manager,
        businessModel: branchDto.businessModel || BusinessModel.CCB_ONLY,
        openTime: branchDto.openTime,
        closeTime: branchDto.closeTime,
        maxConnections: branchDto.maxConnections || 3,
      });
      const savedBranch = await queryRunner.manager.save(branch);

      // Bước 4: Tạo Owner (tùy chọn)
      let savedOwner: Staff | null = null;
      let temporaryPassword: string | null = null;

      if (ownerDto) {
        // Tạo username mặc định: owner hoặc lấy từ email
        const username = ownerDto.email?.split('@')[0] || 'owner';
        temporaryPassword = this.generateTemporaryPassword();
        const passwordHash = await bcrypt.hash(temporaryPassword, 10);

        const owner = queryRunner.manager.create(Staff, {
          tenantId,
          companyId: savedCompany.id,
          brandId: savedBrand.id,
          branchId: savedBranch.id,
          name: ownerDto.name || companyDto.representative || 'Owner',
          email: ownerDto.email || companyDto.email,
          phone: ownerDto.phone || companyDto.phone,
          username,
          passwordHash,
          role: StaffRole.OWNER,
        });
        savedOwner = await queryRunner.manager.save(owner);
      }

      await queryRunner.commitTransaction();

      return {
        company: {
          id: savedCompany.id,
          name: savedCompany.name,
          code: savedCompany.code,
        },
        brand: {
          id: savedBrand.id,
          name: savedBrand.name,
          code: savedBrand.code,
        },
        branch: {
          id: savedBranch.id,
          name: savedBranch.name,
          code: savedBranch.code,
        },
        owner: savedOwner
          ? {
              id: savedOwner.id,
              username: savedOwner.username,
              temporaryPassword: temporaryPassword!,
            }
          : undefined,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Tạo mật khẩu tạm thời (8 ký tự ngẫu nhiên)
   */
  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.companyRepository
      .createQueryBuilder('company')
      .loadRelationCountAndMap('company.brandCount', 'company.brands');

    if (search) {
      queryBuilder.andWhere(
        '(company.name ILIKE :search OR company.code ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy('company.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: ['brands'],
    });

    if (!company) {
      throw new NotFoundException('Không tìm thấy công ty');
    }

    return company;
  }

  async findByCode(code: string): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { code },
      relations: ['brands'],
    });

    if (!company) {
      throw new NotFoundException('Không tìm thấy công ty');
    }

    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findOne(id);

    if (updateCompanyDto.code && updateCompanyDto.code !== company.code) {
      const existing = await this.companyRepository.findOne({
        where: { code: updateCompanyDto.code },
      });
      if (existing) {
        throw new ConflictException('Mã công ty đã tồn tại');
      }
    }

    Object.assign(company, updateCompanyDto);
    return this.companyRepository.save(company);
  }

  async remove(id: string): Promise<void> {
    const company = await this.findOne(id);
    await this.companyRepository.remove(company);
  }

  async toggleStatus(id: string): Promise<Company> {
    const company = await this.findOne(id);
    company.isActive = !company.isActive;
    return this.companyRepository.save(company);
  }
}
