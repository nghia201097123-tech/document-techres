import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Brand } from './brand.entity';

@Entity('branches')
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', length: 50 })
  tenantId: string;

  @Column({ name: 'brand_id', type: 'uuid', nullable: true })
  brandId: string;

  @ManyToOne(() => Brand, (brand) => brand.branches)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50, nullable: true })
  code: string;

  @Column({ name: 'address_detail', type: 'text', nullable: true })
  address: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
