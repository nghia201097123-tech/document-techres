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
import { Company } from './company.entity';
import { Brand } from './brand.entity';
import { Branch } from './branch.entity';
import { StaffRole, Gender } from './enums';

@Entity('staff')
@Index('idx_staff_tenant', ['tenantId'])
@Index('idx_staff_branch', ['branchId'])
@Index('idx_staff_username', ['tenantId', 'username'], { unique: true })
export class Staff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // tenant_id = company.code, dùng để phân biệt dữ liệu giữa các tenant
  @Column({ name: 'tenant_id', length: 50 })
  tenantId: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'brand_id', nullable: true })
  brandId: string;

  @ManyToOne(() => Brand, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column({ name: 'branch_id' })
  branchId: string;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  // Thông tin cá nhân
  @Column({ length: 255 })
  name: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: Date;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender: Gender;

  @Column({ name: 'id_number', length: 20, nullable: true })
  idNumber: string; // CMND/CCCD

  @Column({ name: 'birth_place', type: 'text', nullable: true })
  birthPlace: string;

  // Địa chỉ
  @Column({ name: 'province_code', length: 10, nullable: true })
  provinceCode: string;

  @Column({ name: 'district_code', length: 10, nullable: true })
  districtCode: string;

  @Column({ name: 'ward_code', length: 10, nullable: true })
  wardCode: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  // Bộ phận (có thể link đến department entity sau)
  @Column({ name: 'department_id', nullable: true })
  departmentId: string;

  // Làm việc
  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date;

  // Đăng nhập
  @Column({ length: 50, nullable: true })
  username: string; // Tên đăng nhập (vd: tr000001)

  @Column({ name: 'password_hash', length: 255, nullable: true })
  passwordHash: string;

  @Column({ name: 'pin_code', length: 10, nullable: true })
  pinCode: string; // Mã PIN đăng nhập nhanh trên POS

  @Column({
    type: 'enum',
    enum: StaffRole,
    default: StaffRole.STAFF,
  })
  role: StaffRole;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
