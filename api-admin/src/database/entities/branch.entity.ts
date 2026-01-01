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
import { Brand, BusinessModel } from './brand.entity';
import { Package } from './package.entity';

@Entity('branches')
@Index('idx_branches_tenant', ['tenantId'])
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // tenant_id = company.code, dùng để phân biệt dữ liệu giữa các tenant
  @Column({ name: 'tenant_id', length: 50 })
  tenantId: string;

  @Column({ name: 'brand_id' })
  brandId: string;

  @ManyToOne(() => Brand, (brand) => brand.branches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column({ name: 'package_id', nullable: true })
  packageId: string;

  @ManyToOne(() => Package, (pkg) => pkg.branches, { nullable: true })
  @JoinColumn({ name: 'package_id' })
  package: Package;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50, unique: true })
  code: string;

  // Logo chi nhánh (nếu khác logo thương hiệu)
  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 255, nullable: true })
  manager: string;

  // Mô hình sử dụng (mặc định kế thừa từ brand)
  @Column({
    name: 'business_model',
    type: 'enum',
    enum: BusinessModel,
    default: BusinessModel.CCB_ONLY,
  })
  businessModel: BusinessModel;

  @Column({ name: 'open_time', type: 'time', nullable: true })
  openTime: string;

  @Column({ name: 'close_time', type: 'time', nullable: true })
  closeTime: string;

  // Số cổng kết nối tối đa
  @Column({ name: 'max_connections', type: 'int', default: 3 })
  maxConnections: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
