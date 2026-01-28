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
import { FoodPlatformAccount } from './food-platform-account.entity';
import { FoodPlatformExternalItem } from './food-platform-external-item.entity';

/**
 * Mapping Type
 */
export enum ItemMappingType {
  DIRECT = 'direct', // 1-1 mapping
  COMBO = 'combo', // Combo product
  VARIANT = 'variant', // Size/options mapping
}

/**
 * Food Platform Item Mapping Entity
 * Mapping món ăn từ platform với món ăn TechRes (theo thương hiệu)
 */
@Entity('food_platform_item_mappings')
@Index(['accountId'])
@Index(['externalItemId'])
@Index(['techresItemId'])
@Unique(['accountId', 'externalItemId']) // 1 external item chỉ map 1 lần per account
export class FoodPlatformItemMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, name: 'tenant_id' })
  tenantId: string;

  // Account reference
  @Column({ type: 'uuid', name: 'account_id' })
  accountId: string;

  @ManyToOne(() => FoodPlatformAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: FoodPlatformAccount;

  // External item reference
  @Column({ type: 'uuid', name: 'external_item_id' })
  externalItemId: string; // FK to food_platform_external_items

  @ManyToOne(() => FoodPlatformExternalItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'external_item_id' })
  externalItem: FoodPlatformExternalItem;

  // Cached external item info for quick access
  @Column({ type: 'varchar', length: 100, name: 'external_platform_item_id' })
  externalPlatformItemId: string; // Original itemID from platform

  @Column({ type: 'varchar', length: 255, name: 'external_item_name' })
  externalItemName: string;

  // TechRes item mapping (brand level)
  @Column({ type: 'varchar', length: 100, name: 'techres_brand_id' })
  techresBrandId: string; // FK to TechRes brands (UUID string)

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'techres_brand_name' })
  techresBrandName: string | null; // Cache brand name

  @Column({ type: 'varchar', length: 100, name: 'techres_item_id' })
  techresItemId: string; // FK to TechRes items (UUID string)

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'techres_item_name' })
  techresItemName: string | null; // Cache item name

  // Mapping type
  @Column({
    type: 'enum',
    enum: ItemMappingType,
    default: ItemMappingType.DIRECT,
    name: 'mapping_type',
  })
  mappingType: ItemMappingType;

  // Combo mapping (if mapping_type = combo)
  @Column({ type: 'jsonb', nullable: true, name: 'combo_items' })
  comboItems: { itemId: string; quantity: number; itemName?: string }[] | null;

  // Status
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  // Timestamps
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
