import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BillTemplate } from '../../database/entities';
import { CreateBillTemplateDto, UpdateBillTemplateDto } from './dto';

@Injectable()
export class BillTemplatesService {
  constructor(
    @InjectRepository(BillTemplate)
    private readonly repository: Repository<BillTemplate>,
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
    await this.repository.remove(template);
    return { message: 'Đã xóa mẫu bill' };
  }
}
