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

  // Tiên định danh - viết tắt tên công ty để đăng nhập (tự động gợi ý từ tên)
  @Column({ length: 20, unique: true, nullable: true })
  alias: string;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string;

  @Column({ name: 'tax_code', length: 50, nullable: true })
  taxCode: string;

  // Địa chỉ chi tiết (số nhà, đường)
  @Column({ name: 'address_detail', type: 'text', nullable: true })
  addressDetail: string;

  // Mã tỉnh/thành phố (theo QĐ 19/2025/QĐ-TTg - 34 tỉnh sau sáp nhập 07/2025)
  @Column({ name: 'province_code', length: 10, nullable: true })
  provinceCode: string;

  // Mã phường/xã (liên kết trực tiếp với tỉnh, không qua quận/huyện)
  @Column({ name: 'ward_code', length: 10, nullable: true })
  wardCode: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 255, nullable: true })
  representative: string;

  // Dùng thử hay chính thức
  @Column({ name: 'is_trial', default: false })
  isTrial: boolean;

  // Ngày hết hạn dùng thử (15 ngày từ khi tạo)
  @Column({ name: 'trial_expires_at', type: 'timestamp', nullable: true })
  trialExpiresAt: Date;

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
