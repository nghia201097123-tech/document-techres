import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Staff } from './staff.entity';
import { Branch } from './branch.entity';
import { Brand } from './brand.entity';

@Entity('staff_branches')
@Index('idx_staff_branches_tenant', ['tenantId'])
@Index('idx_staff_branches_staff', ['staffId'])
@Index('idx_staff_branches_branch', ['branchId'])
@Unique('uq_staff_branch', ['staffId', 'branchId'])
export class StaffBranch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // tenant_id = company.code, dùng để phân biệt dữ liệu giữa các tenant
  @Column({ name: 'tenant_id', length: 50 })
  tenantId: string;

  @Column({ name: 'staff_id' })
  staffId: string;

  @ManyToOne(() => Staff, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_id' })
  staff: Staff;

  @Column({ name: 'branch_id' })
  branchId: string;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ name: 'brand_id' })
  brandId: string;

  @ManyToOne(() => Brand, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  // Chi nhánh mặc định khi đăng nhập
  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;
}
