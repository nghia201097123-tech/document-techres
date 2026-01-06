import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Voucher } from '../../database/entities';
import { CreateVoucherDto, UpdateVoucherDto } from './dto';

@Injectable()
export class VouchersService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
  ) {}

  async findAll(tenantId: string, brandId?: string) {
    const where: any = { tenantId };
    if (brandId) {
      where.brandId = brandId;
    }
    return this.voucherRepository.find({
      where,
      order: { isActive: 'DESC', sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const voucher = await this.voucherRepository.findOne({
      where: { tenantId, id },
    });
    if (!voucher) {
      throw new NotFoundException('Không tìm thấy voucher');
    }
    return voucher;
  }

  async findByCode(tenantId: string, code: string) {
    const voucher = await this.voucherRepository.findOne({
      where: { tenantId, code },
    });
    if (!voucher) {
      throw new NotFoundException('Không tìm thấy voucher');
    }
    return voucher;
  }

  async create(tenantId: string, brandId: string, createDto: CreateVoucherDto) {
    // Check if code already exists
    const existingVoucher = await this.voucherRepository.findOne({
      where: { code: createDto.code.toUpperCase() },
    });
    if (existingVoucher) {
      throw new ConflictException('Mã voucher đã tồn tại');
    }

    const voucher = this.voucherRepository.create({
      ...createDto,
      code: createDto.code.toUpperCase(),
      tenantId,
      brandId,
      isActive: true,
      usageCount: 0,
    });
    return this.voucherRepository.save(voucher);
  }

  async update(tenantId: string, id: string, updateDto: UpdateVoucherDto) {
    const voucher = await this.findOne(tenantId, id);
    Object.assign(voucher, updateDto);
    return this.voucherRepository.save(voucher);
  }

  async toggleActive(tenantId: string, id: string) {
    const voucher = await this.findOne(tenantId, id);
    voucher.isActive = !voucher.isActive;
    return this.voucherRepository.save(voucher);
  }

  async delete(tenantId: string, id: string) {
    const voucher = await this.findOne(tenantId, id);
    await this.voucherRepository.remove(voucher);
    return { message: 'Đã xóa voucher' };
  }
}
