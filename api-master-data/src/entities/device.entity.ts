import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'device_id', length: 255, unique: true })
  deviceId: string;

  @Column({ name: 'device_name', length: 255, nullable: true })
  deviceName: string;

  @Column({ name: 'device_type', length: 50, default: 'android' })
  deviceType: string;

  @Column({ name: 'app_version', length: 20, nullable: true })
  appVersion: string;

  @Column({ name: 'last_sync_at', type: 'timestamp', nullable: true })
  lastSyncAt: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
