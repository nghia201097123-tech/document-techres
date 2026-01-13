import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', length: 50, nullable: true })
  tenantId: string;

  @Column({ name: 'brand_id', type: 'uuid', nullable: true })
  brandId: string;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string;

  @Column({ length: 50, nullable: true })
  code: string;

  @Column({ length: 255 })
  name: string;

  // Tên không dấu để tìm kiếm
  @Column({ name: 'search_name', length: 255, nullable: true })
  searchName: string;

  // Tên viết tắt để tìm kiếm nhanh (VD: "ccdc" cho "Cơm chiên dương châu")
  @Column({ length: 50, nullable: true })
  abbreviation: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  price: number;

  @Column({ name: 'cost_price', type: 'decimal', precision: 15, scale: 2, default: 0, nullable: true })
  costPrice: number;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string;

  @Column({ length: 50, nullable: true })
  unit: string;

  @Column({ name: 'vat_rate', type: 'decimal', precision: 5, scale: 2, default: 0, nullable: true })
  vatRate: number;

  @Column({ name: 'product_type', length: 50, default: 'single', nullable: true })
  productType: string;

  @Column({ name: 'is_available', type: 'boolean', default: true, nullable: true })
  isAvailable: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'preparation_time', type: 'int', default: 0, nullable: true })
  preparationTime: number;

  @Column({ name: 'print_dish', type: 'boolean', default: true, nullable: true })
  printDish: boolean;

  @Column({ name: 'print_label', type: 'boolean', default: false, nullable: true })
  printLabel: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
