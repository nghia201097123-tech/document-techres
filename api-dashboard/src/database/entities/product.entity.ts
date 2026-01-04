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
import { Brand } from './brand.entity';

export enum ProductType {
  FOOD = 'food',
  DRINK = 'drink',
  OTHER = 'other',
  TOPPING = 'topping',
  COMBO = 'combo',
}

export enum SellingType {
  PORTION = 'portion', // Bán theo phần
  WEIGHT = 'weight',   // Bán theo ký
}

@Entity('products')
@Index(['tenantId', 'brandId'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', nullable: true })
  @Index()
  tenantId: string;

  @Column({ name: 'brand_id', nullable: true })
  brandId: string;

  @ManyToOne(() => Brand)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column({ unique: true, nullable: true })
  code: string;

  @Column({ nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  price: number;

  @Column({ name: 'vat_rate', type: 'decimal', precision: 5, scale: 2, default: 10 })
  vatRate: number;

  @Column({
    type: 'enum',
    enum: ProductType,
    default: ProductType.FOOD,
  })
  type: ProductType;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  // Thời gian chế biến (phút)
  @Column({ name: 'preparation_time', type: 'int', default: 0 })
  preparationTime: number;

  // Giá vốn
  @Column({ name: 'cost_price', type: 'decimal', precision: 15, scale: 2, default: 0 })
  costPrice: number;

  // Loại bán (theo phần hoặc theo ký)
  @Column({
    name: 'selling_type',
    type: 'enum',
    enum: SellingType,
    default: SellingType.PORTION,
  })
  sellingType: SellingType;

  // Đơn vị tính
  @Column({ nullable: true })
  unit: string;

  // Setup in ấn
  @Column({ name: 'print_dish', default: true })
  printDish: boolean;

  @Column({ name: 'print_label', default: false })
  printLabel: boolean;

  @Column({ name: 'print_seafood', default: false })
  printSeafood: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
