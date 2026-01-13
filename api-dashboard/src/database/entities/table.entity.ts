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
import { Area } from './area.entity';
import { Branch } from './branch.entity';

export enum TableStatus {
  AVAILABLE = 'available',    // Trống
  OCCUPIED = 'occupied',      // Có khách
  RESERVED = 'reserved',      // Đã đặt
  CLEANING = 'cleaning',      // Đang dọn
  MAINTENANCE = 'maintenance', // Bảo trì
}

@Entity('tables')
@Index(['tenantId', 'branchId'])
@Index(['tenantId', 'areaId'])
export class Table {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', length: 50 })
  @Index()
  tenantId: string;

  @Column({ name: 'branch_id' })
  branchId: string;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ name: 'area_id' })
  areaId: string;

  @ManyToOne(() => Area, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @Column({ length: 50 })
  name: string;

  @Column({ type: 'int', default: 4 })
  capacity: number;

  @Column({
    type: 'enum',
    enum: TableStatus,
    default: TableStatus.AVAILABLE,
  })
  status: TableStatus;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
