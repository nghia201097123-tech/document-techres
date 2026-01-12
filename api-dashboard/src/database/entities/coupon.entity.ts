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
  PERCENTAGE = 'percentage',  // Giảm theo %
  FIXED = 'fixed',            // Giảm số tiền cố định
}

export enum CouponApplyTo {
  BILL = 'bill',              // Áp dụng cho toàn hóa đơn
  ITEM = 'item',              // Áp dụng cho món cụ thể
  CATEGORY = 'category',      // Áp dụng cho danh mục
}

export enum CouponApprovalStatus {
  NOT_REQUIRED = 'not_required',    // Không cần phê duyệt
  PENDING = 'pending',              // Đang chờ phê duyệt
  APPROVED = 'approved',            // Đã được phê duyệt
  REJECTED = 'rejected',            // Bị từ chối
}

export enum CouponActivationType {
  MANUAL = 'manual',          // Nhập mã thủ công
  AUTO = 'auto',              // Tự động áp dụng khi đủ điều kiện
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

  // Áp dụng cho: bill (hóa đơn), item (món), category (danh mục)
  @Column({ name: 'apply_to', type: 'enum', enum: CouponApplyTo, default: CouponApplyTo.BILL })
  applyTo: CouponApplyTo;

  // Cách kích hoạt: manual (nhập mã), auto (tự động)
  @Column({ name: 'activation_type', type: 'enum', enum: CouponActivationType, default: CouponActivationType.MANUAL })
  activationType: CouponActivationType;

  @Column({ name: 'discount_value', type: 'decimal', precision: 15, scale: 2, default: 0 })
  discountValue: number;

  @Column({ name: 'max_discount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  maxDiscount: number;

  @Column({ name: 'min_order_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  minOrderAmount: number;

  // Số lượng tối thiểu của món để áp dụng (chỉ dùng cho item/category)
  @Column({ name: 'min_quantity', type: 'int', default: 1 })
  minQuantity: number;

  // Danh sách product IDs được áp dụng (JSON array) - chỉ dùng khi apply_to = 'item'
  @Column({ name: 'product_ids', type: 'simple-json', nullable: true })
  productIds: string[];

  // Danh sách category IDs được áp dụng (JSON array) - chỉ dùng khi apply_to = 'category'
  @Column({ name: 'category_ids', type: 'simple-json', nullable: true })
  categoryIds: string[];

  // Có thể kết hợp với coupon khác không
  @Column({ name: 'is_combinable', default: false })
  isCombinable: boolean;

  // Độ ưu tiên khi áp dụng (số nhỏ = ưu tiên cao)
  @Column({ name: 'priority', type: 'int', default: 100 })
  priority: number;

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
