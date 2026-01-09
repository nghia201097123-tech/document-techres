import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as bcrypt from 'bcrypt';
import { Company, Brand, Branch, Department, Staff, StaffRole, BusinessModel } from '../../database/entities';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import {
  CreateCompanyWizardDto,
  CreateCompanyWizardResponseDto,
} from './dto/create-company-wizard.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { DashboardSyncService } from '../../common/services/dashboard-sync.service';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);
  private readonly oauthApiUrl: string;
  private readonly dashboardApiUrl: string;

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
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly dashboardSyncService: DashboardSyncService,
  ) {
    // URL của api-oauth service
    this.oauthApiUrl = this.configService.get('OAUTH_API_URL') || 'http://localhost:3005';
    // URL của api-dashboard service
    this.dashboardApiUrl = this.configService.get('DASHBOARD_API_URL') || 'http://localhost:4002';
  }

  /**
   * Sync single company to dashboard API (non-blocking)
   */
  private async syncCompanyToDashboard(company: Company): Promise<void> {
    try {
      await this.dashboardSyncService.syncCompany({
        id: company.id,
        code: company.code,
        name: company.name,
        logoUrl: company.logoUrl,
        isActive: company.isActive,
      });
    } catch (error) {
      this.logger.error(`Failed to sync company ${company.code}: ${error}`);
    }
  }

  async create(createCompanyDto: CreateCompanyDto): Promise<any> {
    const existing = await this.companyRepository.findOne({
      where: { code: createCompanyDto.code },
    });

    if (existing) {
      throw new ConflictException('Mã công ty đã tồn tại');
    }

    // Map logo from DTO to logoUrl in entity
    const { logo, ...restDto } = createCompanyDto as any;
    const companyData: Partial<Company> = { ...restDto };
    if (logo !== undefined) {
      companyData.logoUrl = logo;
    }

    const company = this.companyRepository.create(companyData);
    const saved = await this.companyRepository.save(company);

    // Sync to dashboard API (non-blocking)
    this.syncCompanyToDashboard(saved);

    return this.transformCompany(saved);
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

      // Sau khi tạo công ty thành công, tạo tenant user trong api-oauth
      await this.createTenantUserInOAuth({
        tenantId,
        username,
        password: temporaryPassword,
        name: staffDto.name,
        email: staffDto.email,
        phone: staffDto.phone,
        role: staffRole,
        branchId: savedBranch.id,
      });

      // Sync dữ liệu sang api-dashboard
      await this.syncToDashboard({
        company: {
          id: savedCompany.id,
          code: savedCompany.code,
          name: savedCompany.name,
          logoUrl: savedCompany.logoUrl,
          isActive: true,
        },
        brand: {
          id: savedBrand.id,
          tenantId,
          companyId: savedCompany.id,
          name: savedBrand.name,
          code: savedBrand.code,
          logoUrl: savedBrand.logoUrl,
          description: savedBrand.description,
          businessModel: savedBrand.businessModel,
          isActive: true,
        },
        branch: {
          id: savedBranch.id,
          tenantId,
          brandId: savedBrand.id,
          name: savedBranch.name,
          code: savedBranch.code,
          logoUrl: savedBranch.logoUrl,
          addressDetail: savedBranch.addressDetail,
          provinceCode: savedBranch.provinceCode,
          wardCode: savedBranch.wardCode,
          phone: savedBranch.phone,
          manager: savedBranch.manager,
          openTime: savedBranch.openTime,
          closeTime: savedBranch.closeTime,
          businessModel: savedBranch.businessModel,
          isActive: true,
        },
        department: {
          id: savedDepartment.id,
          tenantId,
          branchId: savedBranch.id,
          name: savedDepartment.name,
          code: savedDepartment.code,
          description: savedDepartment.description,
          isActive: true,
        },
        staff: {
          id: savedStaff.id,
          tenantId,
          branchId: savedBranch.id,
          companyId: savedCompany.id,
          brandId: savedBrand.id,
          departmentId: savedDepartment.id,
          name: savedStaff.name,
          phone: savedStaff.phone,
          email: savedStaff.email,
          role: savedStaff.role,
          username: savedStaff.username,
          isActive: true,
        },
      });

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
   * Tạo tenant user trong api-oauth service
   * Được gọi sau khi tạo công ty thành công
   */
  private async createTenantUserInOAuth(data: {
    tenantId: string;
    username: string;
    password: string;
    name: string;
    email?: string;
    phone?: string;
    role: StaffRole;
    branchId?: string;
  }): Promise<void> {
    const url = `${this.oauthApiUrl}/api/v1/auth/tenant-users`;
    this.logger.log(`Creating tenant user in OAuth service: ${url}`);
    this.logger.log(`Data: tenantId=${data.tenantId}, username=${data.username}, name=${data.name}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, {
          tenantId: data.tenantId,
          username: data.username,
          password: data.password,
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: data.role,
          branchId: data.branchId,
        }),
      );

      this.logger.log(`✅ Tenant user created in OAuth service: ${response.data.username}`);
    } catch (error: any) {
      // Log detailed error information
      this.logger.error(`❌ Failed to create tenant user in OAuth service`);
      this.logger.error(`URL: ${url}`);
      this.logger.error(`Tenant: ${data.tenantId}, Username: ${data.username}`);
      this.logger.error(`Error: ${error.message}`);

      if (error.response) {
        // Server responded with error status
        this.logger.error(`Status: ${error.response.status}`);
        this.logger.error(`Response: ${JSON.stringify(error.response.data)}`);
      } else if (error.code) {
        // Network error (ECONNREFUSED, etc.)
        this.logger.error(`Error code: ${error.code}`);
        this.logger.error(`Có thể api-oauth chưa chạy hoặc URL không đúng`);
      }
      // Không throw error để không ảnh hưởng flow chính
    }
  }

  /**
   * Sync dữ liệu company/brand/branch/staff sang api-dashboard
   * Được gọi sau khi tạo công ty thành công
   */
  private async syncToDashboard(data: {
    company: {
      id: string;
      code: string;
      name: string;
      logoUrl?: string;
      isActive: boolean;
    };
    brand: {
      id: string;
      tenantId: string;
      companyId: string;
      name: string;
      code?: string;
      logoUrl?: string;
      description?: string;
      businessModel?: string;
      isActive: boolean;
    };
    branch: {
      id: string;
      tenantId: string;
      brandId: string;
      name: string;
      code?: string;
      logoUrl?: string;
      addressDetail?: string;
      provinceCode?: string;
      wardCode?: string;
      phone?: string;
      manager?: string;
      openTime?: string;
      closeTime?: string;
      businessModel?: string;
      isActive: boolean;
    };
    department?: {
      id: string;
      tenantId: string;
      branchId: string;
      name: string;
      code?: string;
      description?: string;
      isActive: boolean;
    };
    staff?: {
      id: string;
      tenantId: string;
      branchId: string;
      companyId?: string;
      brandId?: string;
      departmentId?: string;
      name: string;
      phone?: string;
      email?: string;
      role?: string;
      username?: string;
      isActive: boolean;
    };
  }): Promise<void> {
    const url = `${this.dashboardApiUrl}/api/sync/company`;
    this.logger.log(`Syncing company data to Dashboard: ${url}`);
    this.logger.log(`Company: ${data.company.code}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, data),
      );

      this.logger.log(`✅ Company data synced to Dashboard: ${response.data.message}`);
    } catch (error: any) {
      this.logger.error(`❌ Failed to sync company data to Dashboard`);
      this.logger.error(`URL: ${url}`);
      this.logger.error(`Company: ${data.company.code}`);
      this.logger.error(`Error: ${error.message}`);

      if (error.response) {
        this.logger.error(`Status: ${error.response.status}`);
        this.logger.error(`Response: ${JSON.stringify(error.response.data)}`);
      } else if (error.code) {
        this.logger.error(`Error code: ${error.code}`);
        this.logger.error(`Có thể api-dashboard chưa chạy hoặc URL không đúng`);
      }
      // Không throw error để không ảnh hưởng flow chính
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
    // Find the highest existing username number with this prefix in this tenant
    // This prevents collisions even if some staff were deleted or sync failed
    const existingStaff = await queryRunner.manager
      .createQueryBuilder(Staff, 'staff')
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
    return `${prefix}${String(nextNumber).padStart(6, '0')}`;
  }

  /**
   * Transform company entity to response (map logoUrl to logo)
   */
  private transformCompany(company: Company): any {
    const { logoUrl, ...rest } = company as any;
    return {
      ...rest,
      logo: logoUrl,
    };
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
      data: data.map(company => this.transformCompany(company)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<any> {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: ['brands'],
    });

    if (!company) {
      throw new NotFoundException('Không tìm thấy công ty');
    }

    return this.transformCompany(company);
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

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<any> {
    const company = await this.companyRepository.findOne({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Không tìm thấy công ty');
    }

    if (updateCompanyDto.code && updateCompanyDto.code !== company.code) {
      const existing = await this.companyRepository.findOne({
        where: { code: updateCompanyDto.code },
      });
      if (existing) {
        throw new ConflictException('Mã công ty đã tồn tại');
      }
    }

    // Map logo from DTO to logoUrl in entity
    const { logo, ...restDto } = updateCompanyDto as any;
    if (logo !== undefined) {
      company.logoUrl = logo;
    }
    Object.assign(company, restDto);
    const saved = await this.companyRepository.save(company);

    // Sync to dashboard API (non-blocking)
    this.syncCompanyToDashboard(saved);

    return this.transformCompany(saved);
  }

  async remove(id: string): Promise<void> {
    const company = await this.companyRepository.findOne({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Không tìm thấy công ty');
    }

    await this.companyRepository.remove(company);
  }

  async toggleStatus(id: string): Promise<any> {
    const company = await this.companyRepository.findOne({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Không tìm thấy công ty');
    }

    company.isActive = !company.isActive;
    const saved = await this.companyRepository.save(company);

    // Sync to dashboard API (non-blocking)
    this.syncCompanyToDashboard(saved);

    return this.transformCompany(saved);
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
