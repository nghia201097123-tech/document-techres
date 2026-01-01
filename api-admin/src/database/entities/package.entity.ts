import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Branch } from './branch.entity';

@Entity('packages')
export class Package {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ name: 'max_branches', default: 3 })
  maxBranches: number;

  @Column({ name: 'monthly_price', type: 'decimal', precision: 15, scale: 2, default: 0 })
  monthlyPrice: number;

  @Column({ name: 'yearly_price', type: 'decimal', precision: 15, scale: 2, default: 0 })
  yearlyPrice: number;

  @Column({ type: 'jsonb', default: {} })
  features: Record<string, boolean>;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Branch, (branch) => branch.package)
  branches: Branch[];
}
