import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Branch } from './branch.entity';

export enum CouponType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum CouponApprovalStatus {
  NOT_REQUIRED = 'not_required',    // Không cần phê duyệt
  PENDING = 'pending',              // Đang chờ phê duyệt
  APPROVED = 'approved',            // Đã được phê duyệt
  REJECTED = 'rejected',            // Bị từ chối
}

@Entity('coupons')
@Index(['tenantId', 'branchId'])
@Index(['code'])
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ name: 'branch_id' })
  branchId: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column()
  code: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'coupon_type', type: 'enum', enum: CouponType, default: CouponType.PERCENTAGE })
  couponType: CouponType;

  @Column({ name: 'discount_value', type: 'decimal', precision: 15, scale: 2, default: 0 })
  discountValue: number;

  @Column({ name: 'max_discount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  maxDiscount: number;

  @Column({ name: 'min_order_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  minOrderAmount: number;

  // Giới hạn sử dụng tổng
  @Column({ name: 'usage_limit', nullable: true })
  usageLimit: number;

  @Column({ name: 'usage_count', default: 0 })
  usageCount: number;

  // Giới hạn sử dụng mỗi ngày
  @Column({ name: 'daily_limit', nullable: true })
  dailyLimit: number;

  @Column({ name: 'daily_usage_count', default: 0 })
  dailyUsageCount: number;

  @Column({ name: 'last_usage_date', type: 'date', nullable: true })
  lastUsageDate: Date;

  // Yêu cầu phê duyệt từ quản lý
  @Column({ name: 'requires_approval', default: false })
  requiresApproval: boolean;

  // Giá trị tối thiểu để yêu cầu phê duyệt (VD: giảm > 500k cần phê duyệt)
  @Column({ name: 'approval_threshold', type: 'decimal', precision: 15, scale: 2, nullable: true })
  approvalThreshold: number;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
