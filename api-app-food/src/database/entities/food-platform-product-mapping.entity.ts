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
import { FoodPlatformStoreMapping } from './food-platform-store-mapping.entity';

/**
 * Mapping Type
 */
export enum ProductMappingType {
  DIRECT = 'direct', // 1-1 mapping
  COMBO = 'combo', // Combo product
  VARIANT = 'variant', // Size/options mapping
}

/**
 * Variant Mapping Interface
 */
export interface VariantMapping {
  [variantName: string]: {
    techresProductId: number;
    multiplier?: number;
  };
}

/**
 * Food Platform Product Mapping Entity
 * Mapping sản phẩm merchant với sản phẩm TechRes (Future feature)
 */
@Entity('food_platform_product_mappings')
@Index(['storeMappingId'])
@Index(['productId'])
@Unique(['storeMappingId', 'externalProductId'])
export class FoodPlatformProductMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, name: 'tenant_id' })
  tenantId: string;

  // Store mapping reference
  @Column({ type: 'uuid', name: 'store_mapping_id' })
  storeMappingId: string;

  @ManyToOne(() => FoodPlatformStoreMapping, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_mapping_id' })
  storeMapping: FoodPlatformStoreMapping;

  // Merchant product info
  @Column({ type: 'varchar', length: 100, name: 'external_product_id' })
  externalProductId: string; // Product ID trên platform

  @Column({ type: 'varchar', length: 255, name: 'external_product_name' })
  externalProductName: string; // Tên sản phẩm trên platform

  @Column({ type: 'bigint', nullable: true, name: 'external_product_price' })
  externalProductPrice: number; // Giá trên platform

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'external_category' })
  externalCategory: string; // Danh mục trên platform

  // TechRes product mapping
  @Column({ type: 'int', nullable: true, name: 'product_id' })
  productId: number; // FK to TechRes products

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'product_name' })
  productName: string; // Cache tên sản phẩm TechRes

  // Mapping type
  @Column({
    type: 'enum',
    enum: ProductMappingType,
    default: ProductMappingType.DIRECT,
    name: 'mapping_type',
  })
  mappingType: ProductMappingType;

  @Column({ type: 'jsonb', nullable: true, name: 'variant_mapping' })
  variantMapping: VariantMapping; // For size/options mapping

  // Combo mapping (if mapping_type = combo)
  @Column({ type: 'jsonb', nullable: true, name: 'combo_items' })
  comboItems: { productId: number; quantity: number }[];

  // Status
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_synced' })
  isSynced: boolean; // Đã sync stock chưa

  // Confidence (for auto-mapping)
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidence: number; // Auto-mapping confidence score

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
