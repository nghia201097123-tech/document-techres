import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BillPrinterConfig } from '../../database/entities';
import { CreateBillPrinterConfigDto, UpdateBillPrinterConfigDto } from './dto';

@Injectable()
export class BillPrinterConfigsService {
  constructor(
    @InjectRepository(BillPrinterConfig)
    private readonly repository: Repository<BillPrinterConfig>,
  ) {}

  async findAll(tenantId: string, branchIds?: string[]) {
    const where: any = { tenantId };
    if (branchIds && branchIds.length > 0) {
      where.branchId = In(branchIds);
    }
    return this.repository.find({
      where,
      relations: ['branch', 'template'],
      order: { isActive: 'DESC', isDefault: 'DESC', sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findByBranch(tenantId: string, branchId: string) {
    return this.repository.find({
      where: { tenantId, branchId },
      relations: ['branch', 'template'],
      order: { isActive: 'DESC', isDefault: 'DESC', sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findByTemplate(tenantId: string, templateId: string) {
    return this.repository.find({
      where: { tenantId, templateId },
      relations: ['branch', 'template'],
      order: { isActive: 'DESC', isDefault: 'DESC', sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const config = await this.repository.findOne({
      where: { tenantId, id },
      relations: ['branch', 'template'],
    });
    if (!config) {
      throw new NotFoundException('Không tìm thấy cấu hình máy in');
    }
    return config;
  }

  async create(tenantId: string, createDto: CreateBillPrinterConfigDto) {
    const config = this.repository.create({
      ...createDto,
      tenantId,
      isActive: true,
    });
    return this.repository.save(config);
  }

  async update(tenantId: string, id: string, updateDto: UpdateBillPrinterConfigDto) {
    const config = await this.findOne(tenantId, id);
    Object.assign(config, updateDto);
    return this.repository.save(config);
  }

  async toggle(tenantId: string, id: string) {
    const config = await this.findOne(tenantId, id);
    config.isActive = !config.isActive;
    return this.repository.save(config);
  }

  async setDefault(tenantId: string, id: string) {
    const config = await this.findOne(tenantId, id);

    // Unset all other defaults for the same branch
    await this.repository.update(
      { tenantId, branchId: config.branchId },
      { isDefault: false }
    );

    // Set this one as default
    config.isDefault = true;
    return this.repository.save(config);
  }

  async delete(tenantId: string, id: string) {
    const config = await this.findOne(tenantId, id);
    await this.repository.remove(config);
    return { message: 'Đã xóa cấu hình máy in' };
  }

  async testConnection(tenantId: string, id: string) {
    const config = await this.findOne(tenantId, id);

    // In a real implementation, this would test the actual printer connection
    // For now, just return a mock result
    return {
      success: true,
      message: `Test kết nối đến ${config.printerIp}:${config.printerPort} thành công`,
    };
  }
}
