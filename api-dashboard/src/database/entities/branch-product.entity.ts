import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Branch } from './branch.entity';
import { Product } from './product.entity';

@Entity('branch_products')
@Unique(['branchId', 'productId'])
@Index(['tenantId', 'branchId'])
@Index(['tenantId', 'productId'])
export class BranchProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', nullable: true })
  @Index()
  tenantId: string;

  @Column({ name: 'branch_id' })
  branchId: string;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  // Món có bán tại chi nhánh này không
  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  // Giá riêng cho chi nhánh (null = dùng giá gốc từ product)
  @Column({ name: 'custom_price', type: 'decimal', precision: 15, scale: 2, nullable: true })
  customPrice: number | null;

  // Thứ tự hiển thị riêng cho chi nhánh
  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
