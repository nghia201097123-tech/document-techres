import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillTemplate, BillPrinterConfig } from '../../database/entities';
import { CreateBillTemplateDto, UpdateBillTemplateDto } from './dto';

@Injectable()
export class BillTemplatesService {
  constructor(
    @InjectRepository(BillTemplate)
    private readonly repository: Repository<BillTemplate>,
    @InjectRepository(BillPrinterConfig)
    private readonly printerConfigRepository: Repository<BillPrinterConfig>,
  ) {}

  /**
   * Lấy tất cả templates của tenant
   */
  async findAll(tenantId: string) {
    return this.repository.find({
      where: { tenantId },
      relations: ['brand'],
      order: { isActive: 'DESC', isDefault: 'DESC', sortOrder: 'ASC', name: 'ASC' },
    });
  }

  /**
   * Lấy templates theo thương hiệu (brand)
   * Mẫu in bill được xây dựng ở cấp thương hiệu
   */
  async findByBrand(tenantId: string, brandId: string) {
    return this.repository.find({
      where: { tenantId, brandId },
      relations: ['brand'],
      order: { isActive: 'DESC', isDefault: 'DESC', sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const template = await this.repository.findOne({
      where: { tenantId, id },
      relations: ['brand'],
    });
    if (!template) {
      throw new NotFoundException('Không tìm thấy mẫu bill');
    }
    return template;
  }

  async create(tenantId: string, createDto: CreateBillTemplateDto) {
    const template = this.repository.create({
      ...createDto,
      tenantId,
      isActive: true,
    });
    return this.repository.save(template);
  }

  async update(tenantId: string, id: string, updateDto: UpdateBillTemplateDto) {
    const template = await this.findOne(tenantId, id);
    Object.assign(template, updateDto);
    return this.repository.save(template);
  }

  async toggle(tenantId: string, id: string) {
    const template = await this.findOne(tenantId, id);
    template.isActive = !template.isActive;
    return this.repository.save(template);
  }

  /**
   * Đặt làm mẫu mặc định cho thương hiệu
   */
  async setDefault(tenantId: string, id: string) {
    const template = await this.findOne(tenantId, id);

    // Bỏ mặc định tất cả template khác của cùng thương hiệu
    await this.repository.update(
      { tenantId, brandId: template.brandId },
      { isDefault: false }
    );

    // Đặt template này làm mặc định
    template.isDefault = true;
    return this.repository.save(template);
  }

  async delete(tenantId: string, id: string) {
    const template = await this.findOne(tenantId, id);

    // Kiểm tra nếu là mẫu mặc định
    if (template.isDefault) {
      throw new BadRequestException(
        'Không thể xóa mẫu bill mặc định. Vui lòng đặt mẫu khác làm mặc định trước khi xóa.'
      );
    }

    // Kiểm tra nếu đang được sử dụng bởi printer config
    const usedByConfigs = await this.printerConfigRepository.count({
      where: { tenantId, templateId: id },
    });

    if (usedByConfigs > 0) {
      // Tự động cập nhật các printer config để không còn reference đến template này
      await this.printerConfigRepository.update(
        { tenantId, templateId: id },
        { templateId: null }
      );
    }

    await this.repository.remove(template);
    return {
      message: 'Đã xóa mẫu bill',
      updatedConfigs: usedByConfigs > 0 ? usedByConfigs : undefined
    };
  }
}
