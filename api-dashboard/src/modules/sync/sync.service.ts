import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Company, Brand, Branch, Department, Staff } from '../../database/entities';
import {
  SyncCompanyDataDto,
  SyncCompanyDto,
  SyncBrandDto,
  SyncBranchDto,
  SyncDepartmentDto,
  SyncStaffDto,
} from './dto/sync.dto';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

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

  /**
   * Sync company data from api-admin
   * Creates or updates company, brand, branch, department, and staff
   */
  async syncCompanyData(dto: SyncCompanyDataDto): Promise<{ success: boolean; message: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Sync Company
      await this.syncCompany(queryRunner, dto.company);
      this.logger.log(`Synced company: ${dto.company.name} (${dto.company.code})`);

      // 2. Sync Brand
      await this.syncBrand(queryRunner, dto.brand);
      this.logger.log(`Synced brand: ${dto.brand.name}`);

      // 3. Sync Branch
      await this.syncBranch(queryRunner, dto.branch);
      this.logger.log(`Synced branch: ${dto.branch.name}`);

      // 4. Sync Department (if provided)
      if (dto.department) {
        await this.syncDepartment(queryRunner, dto.department);
        this.logger.log(`Synced department: ${dto.department.name}`);
      }

      // 5. Sync Staff (if provided)
      if (dto.staff) {
        await this.syncStaff(queryRunner, dto.staff);
        this.logger.log(`Synced staff: ${dto.staff.name}`);
      }

      // 6. Sync additional branches (if provided)
      if (dto.additionalBranches && dto.additionalBranches.length > 0) {
        for (const branch of dto.additionalBranches) {
          await this.syncBranch(queryRunner, branch);
          this.logger.log(`Synced additional branch: ${branch.name}`);
        }
      }

      await queryRunner.commitTransaction();
      this.logger.log(`✅ Company data synced successfully: ${dto.company.code}`);

      return {
        success: true,
        message: `Company ${dto.company.code} synced successfully`,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`❌ Failed to sync company data: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async syncCompany(queryRunner: any, dto: SyncCompanyDto): Promise<void> {
    const existing = await queryRunner.manager.findOne(Company, {
      where: { id: dto.id },
    });

    if (existing) {
      // Update existing company
      await queryRunner.manager.update(Company, dto.id, {
        code: dto.code,
        name: dto.name,
        logoUrl: dto.logoUrl,
        isActive: dto.isActive ?? true,
      });
    } else {
      // Insert new company
      await queryRunner.manager.insert(Company, {
        id: dto.id,
        code: dto.code,
        name: dto.name,
        logoUrl: dto.logoUrl,
        isActive: dto.isActive ?? true,
      });
    }
  }

  private async syncBrand(queryRunner: any, dto: SyncBrandDto): Promise<void> {
    const existing = await queryRunner.manager.findOne(Brand, {
      where: { id: dto.id },
    });

    if (existing) {
      // Update existing brand
      await queryRunner.manager.update(Brand, dto.id, {
        tenantId: dto.tenantId,
        companyId: dto.companyId,
        name: dto.name,
        code: dto.code,
        logoUrl: dto.logoUrl,
        description: dto.description,
        businessModel: dto.businessModel,
        isActive: dto.isActive ?? true,
      });
    } else {
      // Insert new brand
      await queryRunner.manager.insert(Brand, {
        id: dto.id,
        tenantId: dto.tenantId,
        companyId: dto.companyId,
        name: dto.name,
        code: dto.code,
        logoUrl: dto.logoUrl,
        description: dto.description,
        businessModel: dto.businessModel,
        isActive: dto.isActive ?? true,
      });
    }
  }

  private async syncBranch(queryRunner: any, dto: SyncBranchDto): Promise<void> {
    const existing = await queryRunner.manager.findOne(Branch, {
      where: { id: dto.id },
    });

    if (existing) {
      // Update existing branch
      await queryRunner.manager.update(Branch, dto.id, {
        tenantId: dto.tenantId,
        brandId: dto.brandId,
        name: dto.name,
        code: dto.code,
        logoUrl: dto.logoUrl,
        addressDetail: dto.addressDetail || dto.address,
        provinceCode: dto.provinceCode,
        wardCode: dto.wardCode,
        phone: dto.phone,
        email: dto.email,
        manager: dto.manager,
        openTime: dto.openTime,
        closeTime: dto.closeTime,
        businessModel: dto.businessModel,
        isActive: dto.isActive ?? true,
      });
    } else {
      // Insert new branch
      await queryRunner.manager.insert(Branch, {
        id: dto.id,
        tenantId: dto.tenantId,
        brandId: dto.brandId,
        name: dto.name,
        code: dto.code,
        logoUrl: dto.logoUrl,
        addressDetail: dto.addressDetail || dto.address,
        provinceCode: dto.provinceCode,
        wardCode: dto.wardCode,
        phone: dto.phone,
        email: dto.email,
        manager: dto.manager,
        openTime: dto.openTime,
        closeTime: dto.closeTime,
        businessModel: dto.businessModel,
        isActive: dto.isActive ?? true,
      });
    }
  }

  private async syncDepartment(queryRunner: any, dto: SyncDepartmentDto): Promise<void> {
    const existing = await queryRunner.manager.findOne(Department, {
      where: { id: dto.id },
    });

    if (existing) {
      // Update existing department
      await queryRunner.manager.update(Department, dto.id, {
        tenantId: dto.tenantId,
        branchId: dto.branchId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        isActive: dto.isActive ?? true,
      });
    } else {
      // Insert new department
      await queryRunner.manager.insert(Department, {
        id: dto.id,
        tenantId: dto.tenantId,
        branchId: dto.branchId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        isActive: dto.isActive ?? true,
      });
    }
  }

  private async syncStaff(queryRunner: any, dto: SyncStaffDto): Promise<void> {
    const existing = await queryRunner.manager.findOne(Staff, {
      where: { id: dto.id },
    });

    if (existing) {
      // Update existing staff
      await queryRunner.manager.update(Staff, dto.id, {
        tenantId: dto.tenantId,
        branchId: dto.branchId,
        companyId: dto.companyId,
        brandId: dto.brandId,
        departmentId: dto.departmentId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        avatarUrl: dto.avatarUrl,
        role: dto.role,
        username: dto.username,
        isActive: dto.isActive ?? true,
      });
    } else {
      // Insert new staff
      await queryRunner.manager.insert(Staff, {
        id: dto.id,
        tenantId: dto.tenantId,
        branchId: dto.branchId,
        companyId: dto.companyId,
        brandId: dto.brandId,
        departmentId: dto.departmentId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        avatarUrl: dto.avatarUrl,
        role: dto.role,
        username: dto.username,
        isActive: dto.isActive ?? true,
      });
    }
  }

  /**
   * Sync a single brand
   */
  async syncSingleBrand(dto: SyncBrandDto): Promise<{ success: boolean }> {
    const existing = await this.brandRepository.findOne({
      where: { id: dto.id },
    });

    if (existing) {
      await this.brandRepository.update(dto.id, {
        tenantId: dto.tenantId,
        companyId: dto.companyId,
        name: dto.name,
        code: dto.code,
        logoUrl: dto.logoUrl,
        description: dto.description,
        businessModel: dto.businessModel as any,
        isActive: dto.isActive ?? true,
      });
    } else {
      await this.brandRepository.insert({
        id: dto.id,
        tenantId: dto.tenantId,
        companyId: dto.companyId,
        name: dto.name,
        code: dto.code,
        logoUrl: dto.logoUrl,
        description: dto.description,
        businessModel: dto.businessModel as any,
        isActive: dto.isActive ?? true,
      });
    }

    return { success: true };
  }

  /**
   * Sync a single branch
   */
  async syncSingleBranch(dto: SyncBranchDto): Promise<{ success: boolean }> {
    const existing = await this.branchRepository.findOne({
      where: { id: dto.id },
    });

    if (existing) {
      await this.branchRepository.update(dto.id, {
        tenantId: dto.tenantId,
        brandId: dto.brandId,
        name: dto.name,
        code: dto.code,
        logoUrl: dto.logoUrl,
        addressDetail: dto.addressDetail || dto.address,
        provinceCode: dto.provinceCode,
        wardCode: dto.wardCode,
        phone: dto.phone,
        email: dto.email,
        manager: dto.manager,
        openTime: dto.openTime,
        closeTime: dto.closeTime,
        businessModel: dto.businessModel as any,
        isActive: dto.isActive ?? true,
      });
    } else {
      await this.branchRepository.insert({
        id: dto.id,
        tenantId: dto.tenantId,
        brandId: dto.brandId,
        name: dto.name,
        code: dto.code,
        logoUrl: dto.logoUrl,
        addressDetail: dto.addressDetail || dto.address,
        provinceCode: dto.provinceCode,
        wardCode: dto.wardCode,
        phone: dto.phone,
        email: dto.email,
        manager: dto.manager,
        openTime: dto.openTime,
        closeTime: dto.closeTime,
        businessModel: dto.businessModel as any,
        isActive: dto.isActive ?? true,
      });
    }

    return { success: true };
  }
}
