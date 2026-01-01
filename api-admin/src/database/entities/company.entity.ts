import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Brand } from './brand.entity';
import { SubscriptionPlan } from './enums';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  // Code đóng vai trò là tenant_id, dùng để login và phân biệt dữ liệu
  @Column({ length: 50, unique: true })
  code: string;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string;

  @Column({ name: 'tax_code', length: 50, nullable: true })
  taxCode: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 255, nullable: true })
  representative: string;

  // SaaS Subscription fields
  @Column({
    name: 'subscription_plan',
    type: 'enum',
    enum: SubscriptionPlan,
    default: SubscriptionPlan.BASIC,
  })
  subscriptionPlan: SubscriptionPlan;

  @Column({ name: 'subscription_expires_at', type: 'timestamp', nullable: true })
  subscriptionExpiresAt: Date;

  @Column({ name: 'max_branches', type: 'int', default: 1 })
  maxBranches: number;

  @Column({ name: 'max_users', type: 'int', default: 10 })
  maxUsers: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Brand, (brand) => brand.company)
  brands: Brand[];
}
