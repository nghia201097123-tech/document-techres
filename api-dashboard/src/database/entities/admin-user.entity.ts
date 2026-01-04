import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PermissionGroup } from './permission-group.entity';

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  SUPPORT = 'support',
}

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ type: 'enum', enum: AdminRole, default: AdminRole.SUPPORT })
  role: AdminRole;

  @Column({ name: 'permission_group_id', nullable: true })
  permissionGroupId: string;

  @ManyToOne(() => PermissionGroup, (group) => group.adminUsers, { nullable: true })
  @JoinColumn({ name: 'permission_group_id' })
  permissionGroup: PermissionGroup;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login', type: 'timestamptz', nullable: true })
  lastLogin: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
