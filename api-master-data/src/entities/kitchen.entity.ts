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
import { Branch } from './branch.entity';

export enum PrintMode {
  INDIVIDUAL = 'individual', // In từng món riêng lẻ
  LIST = 'list', // In danh sách món
}

@Entity('kitchens')
@Index(['tenantId', 'branchId'])
export class Kitchen {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ name: 'branch_id' })
  branchId: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'printer_name', nullable: true })
  printerName: string;

  @Column({ name: 'printer_ip', nullable: true })
  printerIp: string;

  @Column({ name: 'printer_port', type: 'int', nullable: true, default: 9100 })
  printerPort: number;

  @Column({ name: 'paper_size', type: 'varchar', length: 50, nullable: true, default: '80mm' })
  paperSize: string;

  @Column({
    name: 'print_mode',
    type: 'varchar',
    length: 50,
    default: 'list',
  })
  printMode: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
