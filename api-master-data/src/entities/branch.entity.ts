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

  @Column({ name: 'tenant_id', length: 50, nullable: true })
  tenantId: string;

  @Column({ name: 'brand_id', type: 'uuid' })
  brandId: string;

  @ManyToOne(() => Brand, (brand) => brand.branches)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'store_code', length: 20, unique: true })
  storeCode: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ name: 'opening_hours', type: 'jsonb', nullable: true })
  openingHours: any;

  @Column({ name: 'model_type', length: 20, nullable: true })
  modelType: string;

  @Column({ name: 'package_id', type: 'uuid', nullable: true })
  packageId: string;

  @Column({ length: 20, default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
