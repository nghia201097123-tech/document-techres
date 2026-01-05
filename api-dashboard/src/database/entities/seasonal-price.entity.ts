import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Branch } from './branch.entity';
import { SeasonalPriceProduct } from './seasonal-price-product.entity';

export enum AdjustmentType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

@Entity('seasonal_prices')
@Index(['tenantId', 'branchId'])
export class SeasonalPrice {
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
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'adjustment_type', type: 'enum', enum: AdjustmentType, default: AdjustmentType.PERCENTAGE })
  adjustmentType: AdjustmentType;

  @Column({ name: 'adjustment_value', type: 'decimal', precision: 15, scale: 2, default: 0 })
  adjustmentValue: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => SeasonalPriceProduct, (spp) => spp.seasonalPrice, { cascade: true })
  seasonalPriceProducts: SeasonalPriceProduct[];
}
