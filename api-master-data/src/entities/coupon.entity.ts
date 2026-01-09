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

  @Column({ name: 'coupon_type', type: 'varchar', default: 'percentage' })
  couponType: string;

  @Column({ name: 'discount_value', type: 'decimal', precision: 15, scale: 2, default: 0 })
  discountValue: number;

  @Column({ name: 'max_discount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  maxDiscount: number;

  @Column({ name: 'min_order_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  minOrderAmount: number;

  @Column({ name: 'usage_limit', nullable: true })
  usageLimit: number;

  @Column({ name: 'usage_count', default: 0 })
  usageCount: number;

  @Column({ name: 'daily_limit', nullable: true })
  dailyLimit: number;

  @Column({ name: 'daily_usage_count', default: 0 })
  dailyUsageCount: number;

  @Column({ name: 'last_usage_date', type: 'date', nullable: true })
  lastUsageDate: Date;

  @Column({ name: 'requires_approval', default: false })
  requiresApproval: boolean;

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
