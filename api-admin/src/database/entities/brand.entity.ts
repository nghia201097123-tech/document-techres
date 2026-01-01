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
import { Company } from './company.entity';
import { Branch } from './branch.entity';

export enum BusinessModel {
  ORDER_ONLY = 'order_only',
  CCB_ONLY = 'ccb_only',
  FULL_SYSTEM = 'full_system',
}

@Entity('brands')
@Index('idx_brands_tenant', ['tenantId'])
export class Brand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // tenant_id = company.code, dùng để phân biệt dữ liệu giữa các tenant
  @Column({ name: 'tenant_id', length: 50 })
  tenantId: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, (company) => company.brands, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({
    name: 'business_model',
    type: 'enum',
    enum: BusinessModel,
    default: BusinessModel.FULL_SYSTEM,
  })
  businessModel: BusinessModel;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Branch, (branch) => branch.brand)
  branches: Branch[];
}
