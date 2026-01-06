import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Company, Brand, Branch, Department, Staff, StaffRole, BusinessModel } from '../../database/entities';
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
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
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
   * Tạo mã code từ tên (loại bỏ dấu, viết hoa, lấy chữ cái đầu)
   */
  private generateCodeFromName(name: string, prefix: string = ''): string {
    // Loại bỏ dấu tiếng Việt
    const normalized = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');

    // Lấy chữ cái đầu của mỗi từ
    const words = normalized.split(/\s+/).filter(w => w.length > 0);
    const initials = words.map(w => w[0].toUpperCase()).join('');

    // Thêm số ngẫu nhiên để tránh trùng
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    return `${prefix}${initials}${randomSuffix}`;
  }

  /**
   * Wizard tạo công ty 4 bước: Company + Brand + Branch + Staff
   * Bộ phận "Chủ nhà hàng" sẽ được tự động tạo ngầm
   * Mã (code) sẽ được tự động sinh từ alias/tên
   * Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
   */
  async createWithWizard(
    wizardDto: CreateCompanyWizardDto,
  ): Promise<CreateCompanyWizardResponseDto> {
    const {
      company: companyDto,
      brand: brandDto,
      branch: branchDto,
      staff: staffDto,
    } = wizardDto;

    // Company code = alias (đã validate uppercase từ DTO)
    const companyCode = companyDto.alias;

    // Validate unique company code (alias)
    const existingCompany = await this.companyRepository.findOne({
      where: { code: companyCode },
    });
    if (existingCompany) {
      throw new ConflictException('Tiên định danh (mã công ty) đã tồn tại');
    }

    // Kiểm tra alias đã tồn tại chưa
    const existingAlias = await this.companyRepository.findOne({
      where: { alias: companyDto.alias },
    });
    if (existingAlias) {
      throw new ConflictException('Tiên định danh đã tồn tại');
    }

    // Auto-generate brand code từ tên thương hiệu
    let brandCode = this.generateCodeFromName(brandDto.name, 'BR');
    let existingBrand = await this.brandRepository.findOne({
      where: { code: brandCode },
    });
    // Nếu trùng, thử lại với số khác
    while (existingBrand) {
      brandCode = this.generateCodeFromName(brandDto.name, 'BR');
      existingBrand = await this.brandRepository.findOne({
        where: { code: brandCode },
      });
    }

    // Auto-generate branch code từ tên chi nhánh
    let branchCode = this.generateCodeFromName(branchDto.name, 'CN');
    let existingBranch = await this.branchRepository.findOne({
      where: { code: branchCode },
    });
    // Nếu trùng, thử lại với số khác
    while (existingBranch) {
      branchCode = this.generateCodeFromName(branchDto.name, 'CN');
      existingBranch = await this.branchRepository.findOne({
        where: { code: branchCode },
      });
    }

    // Sử dụng transaction để tạo tất cả
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Bước 1: Tạo Company (địa chỉ 2 cấp: Tỉnh → Xã/Phường, không còn Quận/Huyện)
      const companyData: Partial<Company> = {
        name: companyDto.name,
        code: companyCode, // Auto-generated từ alias
        alias: companyDto.alias,
        logoUrl: companyDto.logoUrl,
        taxCode: companyDto.taxCode,
        addressDetail: companyDto.addressDetail,
        provinceCode: companyDto.provinceCode,
        wardCode: companyDto.wardCode,
        phone: companyDto.phone,
        email: companyDto.email,
        representative: companyDto.representative,
        isTrial: companyDto.isTrial,
        subscriptionPlan: companyDto.subscriptionPlan,
        maxBranches: companyDto.maxBranches,
        maxUsers: companyDto.maxUsers,
      };
      // Nếu dùng thử, set ngày hết hạn 15 ngày
      if (companyDto.isTrial) {
        const trialExpires = new Date();
        trialExpires.setDate(trialExpires.getDate() + 15);
        companyData.trialExpiresAt = trialExpires;
      }
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
        code: brandCode, // Auto-generated từ tên
        logoUrl: brandDto.logoUrl,
        description: brandDto.description,
        businessModel: brandDto.businessModel || BusinessModel.FULL_SYSTEM,
      });
      const savedBrand = await queryRunner.manager.save(brand);

      // Bước 3: Tạo Branch (Chi nhánh đầu tiên - địa chỉ 2 cấp)
      const branch = queryRunner.manager.create(Branch, {
        tenantId,
        brandId: savedBrand.id,
        name: branchDto.name,
        code: branchCode, // Auto-generated từ tên
        logoUrl: branchDto.logoUrl || brandDto.logoUrl,
        addressDetail: branchDto.addressDetail,
        provinceCode: branchDto.provinceCode,
        wardCode: branchDto.wardCode,
        phone: branchDto.phone,
        manager: branchDto.manager,
        businessModel: branchDto.businessModel || BusinessModel.CCB_ONLY,
        openTime: branchDto.openTime,
        closeTime: branchDto.closeTime,
        maxConnections: branchDto.maxConnections || 3,
      });
      const savedBranch = await queryRunner.manager.save(branch);

      // Bước 4: Tự động tạo Department "Chủ nhà hàng"
      const department = queryRunner.manager.create(Department, {
        tenantId,
        companyId: savedCompany.id,
        branchId: savedBranch.id,
        name: 'Chủ nhà hàng',
        code: 'CHUNHAHANG',
        description: 'Bộ phận chủ nhà hàng - tự động tạo khi khởi tạo công ty',
      });
      const savedDepartment = await queryRunner.manager.save(department);

      // Bước 5: Tạo Staff (Nhân viên đầu tiên - thuộc bộ phận Chủ nhà hàng)
      // Username: prefix (2 ký tự, mặc định "tr") + số tự động tăng 6 chữ số
      // Ví dụ: tr000001, ab000001
      const prefix = (staffDto.usernamePrefix || 'tr').toLowerCase().substring(0, 2);
      const username = await this.generateUsername(queryRunner, tenantId, prefix);
      const temporaryPassword = this.generateTemporaryPassword();
      const passwordHash = await bcrypt.hash(temporaryPassword, 10);

      const staffRole = staffDto.role === 'owner'
        ? StaffRole.OWNER
        : staffDto.role === 'manager'
        ? StaffRole.MANAGER
        : StaffRole.STAFF;

      const staff = queryRunner.manager.create(Staff, {
        tenantId,
        companyId: savedCompany.id,
        brandId: savedBrand.id,
        branchId: savedBranch.id,
        departmentId: savedDepartment.id,
        name: staffDto.name,
        email: staffDto.email,
        phone: staffDto.phone,
        username,
        passwordHash,
        role: staffRole,
      });
      const savedStaff = await queryRunner.manager.save(staff);

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
        department: {
          id: savedDepartment.id,
          name: savedDepartment.name,
          code: savedDepartment.code,
        },
        staff: {
          id: savedStaff.id,
          name: savedStaff.name,
          username: savedStaff.username,
          temporaryPassword,
        },
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

  /**
   * Tạo username theo pattern: prefix (2 ký tự) + số tự động tăng 6 chữ số
   * Ví dụ: tr000001, tr000002, ab000001
   */
  private async generateUsername(
    queryRunner: any,
    tenantId: string,
    prefix: string,
  ): Promise<string> {
    // Đếm số nhân viên hiện có trong tenant để lấy số tiếp theo
    const count = await queryRunner.manager.count(Staff, {
      where: { tenantId },
    });
    const nextNumber = count + 1;
    // Format: prefix (2 chars) + 6-digit padded number
    return `${prefix}${String(nextNumber).padStart(6, '0')}`;
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

  /**
   * Check if alias is available
   */
  async checkAlias(alias: string): Promise<{ available: boolean; alias: string }> {
    const existing = await this.companyRepository.findOne({
      where: [
        { alias: alias },
        { code: alias },
      ],
    });
    return {
      available: !existing,
      alias,
    };
  }

  /**
   * Quick Create - Tạo nhanh công ty với tên và tiên định danh
   * Tự động tạo brand, branch, department, staff
   */
  async quickCreate(companyName: string, alias: string, isTrial: boolean = false): Promise<CreateCompanyWizardResponseDto> {
    // Tạo email giả từ alias
    const email = `${alias.toLowerCase()}@restaurant.vn`;

    // Tạo wizard data với thông tin tự động
    const wizardDto: CreateCompanyWizardDto = {
      company: {
        name: companyName,
        alias,
        email,
        isTrial,
      },
      brand: {
        name: companyName,
        businessModel: BusinessModel.FULL_SYSTEM,
      },
      branch: {
        name: 'Chi nhánh chính',
        openTime: '08:00',
        closeTime: '22:00',
      },
      staff: {
        name: 'Chủ nhà hàng',
        usernamePrefix: 'tr',
        role: 'owner',
      },
    };

    return this.createWithWizard(wizardDto);
  }

  /**
   * Tạo alias từ tên công ty (lấy chữ cái đầu mỗi từ, viết hoa)
   */
  private generateAliasFromName(name: string): string {
    const normalized = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');

    const words = normalized.split(/\s+/).filter(w => w.length > 0);
    let alias = words.map(w => w[0].toUpperCase()).join('');

    // Đảm bảo alias có ít nhất 3 ký tự
    if (alias.length < 3) {
      alias = normalized.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
    }

    // Thêm số ngẫu nhiên để tránh trùng
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${alias}${randomSuffix}`;
  }

  /**
   * Clone - Nhân bản công ty
   */
  async clone(
    sourceCompanyId: string,
    newCompanyName: string,
    newAlias: string,
    newEmail: string,
    isTrial: boolean = false,
    cloneOptions: {
      brands: boolean;
      branches: boolean;
      products: boolean;
      categories: boolean;
      staff: boolean;
    },
  ): Promise<CreateCompanyWizardResponseDto> {
    // Tìm công ty nguồn
    const sourceCompany = await this.companyRepository.findOne({
      where: { id: sourceCompanyId },
    });
    if (!sourceCompany) {
      throw new NotFoundException('Không tìm thấy công ty nguồn');
    }

    // Validate unique alias
    const existingAlias = await this.companyRepository.findOne({
      where: { alias: newAlias },
    });
    if (existingAlias) {
      throw new ConflictException('Tiên định danh đã tồn tại');
    }

    // Lấy thông tin brands, branches từ công ty nguồn
    const sourceBrands = await this.brandRepository.find({
      where: { tenantId: sourceCompany.code },
    });

    const firstBrand = sourceBrands[0];
    const sourceBranches = firstBrand
      ? await this.branchRepository.find({ where: { brandId: firstBrand.id } })
      : [];

    // Tạo wizard data từ thông tin công ty nguồn
    const wizardDto: CreateCompanyWizardDto = {
      company: {
        name: newCompanyName,
        alias: newAlias,
        email: newEmail,
        isTrial,
        taxCode: sourceCompany.taxCode,
        phone: sourceCompany.phone,
        representative: sourceCompany.representative,
      },
      brand: {
        name: firstBrand?.name || newCompanyName,
        description: firstBrand?.description,
        businessModel: firstBrand?.businessModel || BusinessModel.FULL_SYSTEM,
      },
      branch: {
        name: sourceBranches[0]?.name || 'Chi nhánh chính',
        phone: sourceBranches[0]?.phone,
        openTime: sourceBranches[0]?.openTime || '08:00',
        closeTime: sourceBranches[0]?.closeTime || '22:00',
      },
      staff: {
        name: 'Chủ nhà hàng',
        usernamePrefix: 'tr',
        role: 'owner',
      },
    };

    // Tạo công ty mới
    const result = await this.createWithWizard(wizardDto);

    // TODO: Nếu cloneOptions.products = true, clone danh mục và sản phẩm
    // TODO: Nếu cloneOptions.categories = true, clone danh mục
    // Đây là các tính năng mở rộng có thể thêm sau

    return result;
  }

  /**
   * Lấy thông tin chi tiết để clone
   */
  async getDetailsForClone(id: string) {
    const company = await this.findOne(id);
    const tenantId = company.code;

    const brandsCount = await this.brandRepository.count({ where: { tenantId } });
    const branchesCount = await this.branchRepository.count({ where: { tenantId } });
    const staffCount = await this.staffRepository.count({ where: { tenantId } });

    // TODO: Add products and categories count when those entities are available

    return {
      company,
      brandsCount,
      branchesCount,
      productsCount: 0, // Placeholder
      categoriesCount: 0, // Placeholder
      staffCount,
    };
  }

  /**
   * Bulk Create - Tạo công ty với nhiều chi nhánh cùng lúc
   */
  async createWithBranches(
    dto: CreateCompanyWizardDto & {
      additionalBranches?: Array<{
        name: string;
        addressDetail?: string;
        provinceCode?: string;
        wardCode?: string;
        phone?: string;
      }>;
    },
  ): Promise<CreateCompanyWizardResponseDto & {
    additionalBranches?: Array<{ id: string; name: string; code: string }>;
  }> {
    // Tạo công ty với wizard (tạo company, brand, branch chính, department, staff)
    const result = await this.createWithWizard(dto);

    // Nếu có chi nhánh bổ sung
    if (dto.additionalBranches && dto.additionalBranches.length > 0) {
      const tenantId = result.company.code;
      const brandId = result.brand.id;
      const additionalBranches: Array<{ id: string; name: string; code: string }> = [];

      for (const branchData of dto.additionalBranches) {
        // Auto-generate branch code từ tên chi nhánh
        let branchCode = this.generateCodeFromName(branchData.name, 'CN');
        let existingBranch = await this.branchRepository.findOne({
          where: { code: branchCode },
        });
        // Nếu trùng, thử lại với số khác
        while (existingBranch) {
          branchCode = this.generateCodeFromName(branchData.name, 'CN');
          existingBranch = await this.branchRepository.findOne({
            where: { code: branchCode },
          });
        }

        const branch = this.branchRepository.create({
          tenantId,
          brandId,
          name: branchData.name,
          code: branchCode,
          addressDetail: branchData.addressDetail,
          provinceCode: branchData.provinceCode,
          wardCode: branchData.wardCode,
          phone: branchData.phone,
          openTime: '08:00',
          closeTime: '22:00',
          maxConnections: 3,
        });
        const savedBranch = await this.branchRepository.save(branch);

        additionalBranches.push({
          id: savedBranch.id,
          name: savedBranch.name,
          code: savedBranch.code,
        });
      }

      return {
        ...result,
        additionalBranches,
      };
    }

    return result;
  }
}
