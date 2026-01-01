import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
} from 'typeorm';
import { PermissionGroup } from './permission-group.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  code: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50 })
  module: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToMany(() => PermissionGroup, (group) => group.permissions)
  permissionGroups: PermissionGroup[];
}
