import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BillTemplate, BillPrinterConfig } from '../../database/entities';
import { CreateBillTemplateDto, UpdateBillTemplateDto, UpdateBillTemplateWithPrinterDto } from './dto';

@Injectable()
export class BillTemplatesService {
  constructor(
    @InjectRepository(BillTemplate)
    private readonly repository: Repository<BillTemplate>,
    @InjectRepository(BillPrinterConfig)
    private readonly printerConfigRepository: Repository<BillPrinterConfig>,
  ) {}

  async findAll(tenantId: string, branchIds?: string[]) {
    const where: any = { tenantId };
    if (branchIds && branchIds.length > 0) {
      where.branchId = In(branchIds);
    }
    return this.repository.find({
      where,
      relations: ['branch'],
      order: { isActive: 'DESC', isDefault: 'DESC', sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findByBranch(tenantId: string, branchId: string) {
    return this.repository.find({
      where: { tenantId, branchId },
      relations: ['branch'],
      order: { isActive: 'DESC', isDefault: 'DESC', sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const template = await this.repository.findOne({
      where: { tenantId, id },
      relations: ['branch'],
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

  async setDefault(tenantId: string, id: string) {
    const template = await this.findOne(tenantId, id);

    // Unset all other defaults for the same branch
    await this.repository.update(
      { tenantId, branchId: template.branchId },
      { isDefault: false }
    );

    // Set this one as default
    template.isDefault = true;
    return this.repository.save(template);
  }

  async delete(tenantId: string, id: string) {
    const template = await this.findOne(tenantId, id);

    // Clear template_id from printer configs that use this template
    await this.printerConfigRepository.update(
      { tenantId, templateId: id },
      { templateId: null }
    );

    await this.repository.remove(template);
    return { message: 'Đã xóa mẫu bill' };
  }

  /**
   * Cập nhật template và printer config cùng lúc
   * Dùng cho UI đã gộp chung template và printer config vào 1 màn hình
   */
  async updateWithPrinter(tenantId: string, id: string, dto: UpdateBillTemplateWithPrinterDto) {
    // Tách printer config fields ra khỏi template fields
    const {
      printerConfigId,
      connectionType,
      printerIp,
      printerPort,
      printerMac,
      printerUsbPath,
      autoPrintOnPayment,
      printPreview,
      retryCount,
      retryDelayMs,
      connectionTimeoutMs,
      ...templateData
    } = dto;

    // 1. Cập nhật template
    const template = await this.findOne(tenantId, id);
    Object.assign(template, templateData);
    const savedTemplate = await this.repository.save(template);

    // 2. Cập nhật hoặc tạo printer config (nếu có thông tin máy in)
    const hasPrinterInfo = printerIp || printerMac || printerUsbPath || connectionType;

    if (hasPrinterInfo) {
      const printerData = {
        connectionType: connectionType || 'network',
        printerIp,
        printerPort: printerPort || 9100,
        printerMac,
        printerUsbPath,
        autoPrintOnPayment: autoPrintOnPayment ?? true,
        printPreview: printPreview ?? false,
        retryCount: retryCount ?? 3,
        retryDelayMs: retryDelayMs ?? 1000,
        connectionTimeoutMs: connectionTimeoutMs ?? 5000,
        // Copy from template
        paperWidth: templateData.paperWidth || savedTemplate.paperWidth,
        numberOfCopies: templateData.numberOfCopies || savedTemplate.numberOfCopies,
        cutPaper: templateData.cutPaper ?? savedTemplate.cutPaper,
        openCashDrawer: templateData.openCashDrawer ?? savedTemplate.openCashDrawer,
        beepAfterPrint: templateData.beepAfterPrint ?? savedTemplate.beepAfterPrint,
      };

      if (printerConfigId) {
        // Cập nhật printer config đã tồn tại
        const printerConfig = await this.printerConfigRepository.findOne({
          where: { id: printerConfigId, tenantId },
        });
        if (printerConfig) {
          Object.assign(printerConfig, printerData);
          await this.printerConfigRepository.save(printerConfig);
        }
      } else {
        // Tìm printer config theo templateId hoặc tạo mới
        let printerConfig = await this.printerConfigRepository.findOne({
          where: { templateId: id, tenantId },
        });

        if (printerConfig) {
          Object.assign(printerConfig, printerData);
          await this.printerConfigRepository.save(printerConfig);
        } else {
          // Tạo mới printer config
          const newPrinterConfig = this.printerConfigRepository.create({
            tenantId,
            branchId: savedTemplate.branchId,
            name: `Máy in - ${savedTemplate.name}`,
            templateId: savedTemplate.id,
            isActive: true,
            ...printerData,
          });
          await this.printerConfigRepository.save(newPrinterConfig);
        }
      }
    }

    return savedTemplate;
  }
}
