import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from '../../database/entities';
import { CreateCouponDto, UpdateCouponDto } from './dto';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
  ) {}

  async findAll(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId && branchId !== 'all') {
      where.branchId = branchId;
    }
    return this.couponRepository.find({
      where,
      order: { isActive: 'DESC', sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const coupon = await this.couponRepository.findOne({
      where: { tenantId, id },
    });
    if (!coupon) {
      throw new NotFoundException('Không tìm thấy coupon');
    }
    return coupon;
  }

  async findByCode(tenantId: string, branchId: string, code: string) {
    const coupon = await this.couponRepository.findOne({
      where: { tenantId, branchId, code },
    });
    if (!coupon) {
      throw new NotFoundException('Không tìm thấy coupon với mã này');
    }
    return coupon;
  }

  async create(tenantId: string, branchId: string, createDto: CreateCouponDto) {
    // Validate date range if provided
    if (createDto.startDate && createDto.endDate) {
      if (new Date(createDto.startDate) > new Date(createDto.endDate)) {
        throw new BadRequestException('Ngày bắt đầu không được lớn hơn ngày kết thúc');
      }
    }

    // Check if code already exists in this branch
    const existingCoupon = await this.couponRepository.findOne({
      where: { tenantId, branchId, code: createDto.code },
    });
    if (existingCoupon) {
      throw new BadRequestException('Mã coupon đã tồn tại trong chi nhánh này');
    }

    const coupon = this.couponRepository.create({
      ...createDto,
      tenantId,
      branchId,
      isActive: true,
    });
    const saved = await this.couponRepository.save(coupon);
    return this.findOne(tenantId, saved.id);
  }

  async update(tenantId: string, id: string, updateDto: UpdateCouponDto) {
    const coupon = await this.findOne(tenantId, id);

    // Validate date range if provided
    const startDate = updateDto.startDate || coupon.startDate?.toString();
    const endDate = updateDto.endDate || coupon.endDate?.toString();
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('Ngày bắt đầu không được lớn hơn ngày kết thúc');
    }

    // Check if new code conflicts with existing
    if (updateDto.code && updateDto.code !== coupon.code) {
      const existingCoupon = await this.couponRepository.findOne({
        where: { tenantId, branchId: coupon.branchId, code: updateDto.code },
      });
      if (existingCoupon) {
        throw new BadRequestException('Mã coupon đã tồn tại trong chi nhánh này');
      }
    }

    Object.assign(coupon, updateDto);
    await this.couponRepository.save(coupon);
    return this.findOne(tenantId, id);
  }

  async toggleActive(tenantId: string, id: string) {
    const coupon = await this.findOne(tenantId, id);
    coupon.isActive = !coupon.isActive;
    await this.couponRepository.save(coupon);
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string) {
    const coupon = await this.findOne(tenantId, id);
    await this.couponRepository.remove(coupon);
    return { message: 'Đã xóa coupon' };
  }

  /**
   * Validate coupon for use by cashier
   */
  async validateCoupon(
    tenantId: string,
    branchId: string,
    code: string,
    orderAmount: number,
  ): Promise<{
    valid: boolean;
    coupon?: Coupon;
    discountAmount?: number;
    requiresApproval?: boolean;
    message?: string;
  }> {
    const coupon = await this.couponRepository.findOne({
      where: { tenantId, branchId, code, isActive: true },
    });

    if (!coupon) {
      return { valid: false, message: 'Coupon không tồn tại hoặc đã bị vô hiệu hóa' };
    }

    // Check date validity
    const now = new Date();
    if (coupon.startDate && new Date(coupon.startDate) > now) {
      return { valid: false, message: 'Coupon chưa đến thời gian sử dụng' };
    }
    if (coupon.endDate && new Date(coupon.endDate) < now) {
      return { valid: false, message: 'Coupon đã hết hạn' };
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, message: 'Coupon đã hết lượt sử dụng' };
    }

    // Check daily limit
    if (coupon.dailyLimit) {
      const today = new Date().toISOString().split('T')[0];
      const lastUsage = coupon.lastUsageDate?.toISOString().split('T')[0];

      if (lastUsage === today && coupon.dailyUsageCount >= coupon.dailyLimit) {
        return { valid: false, message: 'Coupon đã hết lượt sử dụng trong ngày' };
      }
    }

    // Check minimum order amount
    if (coupon.minOrderAmount && orderAmount < Number(coupon.minOrderAmount)) {
      return {
        valid: false,
        message: `Đơn hàng tối thiểu ${Number(coupon.minOrderAmount).toLocaleString('vi-VN')}đ để sử dụng coupon này`
      };
    }

    // Calculate discount
    let discountAmount: number;
    if (coupon.couponType === 'percentage') {
      discountAmount = orderAmount * Number(coupon.discountValue) / 100;
      if (coupon.maxDiscount && discountAmount > Number(coupon.maxDiscount)) {
        discountAmount = Number(coupon.maxDiscount);
      }
    } else {
      discountAmount = Number(coupon.discountValue);
    }

    // Check if approval is required
    let requiresApproval = false;
    if (coupon.requiresApproval) {
      if (!coupon.approvalThreshold || discountAmount >= Number(coupon.approvalThreshold)) {
        requiresApproval = true;
      }
    }

    return {
      valid: true,
      coupon,
      discountAmount,
      requiresApproval,
    };
  }

  /**
   * Use coupon (increment usage count)
   */
  async useCoupon(tenantId: string, id: string) {
    const coupon = await this.findOne(tenantId, id);

    const today = new Date().toISOString().split('T')[0];
    const lastUsage = coupon.lastUsageDate?.toISOString().split('T')[0];

    // Reset daily count if new day
    if (lastUsage !== today) {
      coupon.dailyUsageCount = 0;
    }

    coupon.usageCount += 1;
    coupon.dailyUsageCount += 1;
    coupon.lastUsageDate = new Date();

    await this.couponRepository.save(coupon);
    return coupon;
  }
}
