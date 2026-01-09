import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Branch } from './branch.entity';

@Entity('brands')
export class Brand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', length: 50 })
  tenantId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50, nullable: true })
  code: string;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => Branch, (branch) => branch.brand)
  branches: Branch[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
