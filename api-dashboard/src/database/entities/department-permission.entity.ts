import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { Department } from './department.entity';
import { Permission } from './permission.entity';

@Entity('department_permissions')
@Index('idx_dept_perm_tenant', ['tenantId'])
@Index('idx_dept_perm_department', ['departmentId'])
@Index('idx_dept_perm_unique', ['departmentId', 'permissionId'], { unique: true })
export class DepartmentPermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', length: 50 })
  tenantId: string;

  @Column({ name: 'department_id' })
  departmentId: string;

  @ManyToOne(() => Department, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'permission_id' })
  permissionId: string;

  @ManyToOne(() => Permission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
