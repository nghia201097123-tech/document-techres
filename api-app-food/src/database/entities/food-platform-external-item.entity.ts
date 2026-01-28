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

/**
 * Food Platform External Item Entity
 * Lưu trữ món ăn từ các platform bên ngoài (GrabFood, ShopeeFood, etc.)
 */
@Entity('food_platform_external_items')
@Index(['accountId'])
@Index(['externalCategoryId'])
@Unique(['accountId', 'externalItemId']) // 1 item ID chỉ tồn tại 1 lần per account
export class FoodPlatformExternalItem {
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

  // External item info
  @Column({ type: 'varchar', length: 100, name: 'external_item_id' })
  externalItemId: string; // itemID from platform

  @Column({ type: 'varchar', length: 255, name: 'external_item_name' })
  externalItemName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'bigint', default: 0, name: 'price_in_min' })
  priceInMin: number; // Price in smallest unit (VND)

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'price_display' })
  priceDisplay: string | null;

  @Column({ type: 'text', nullable: true, name: 'image_url' })
  imageUrl: string | null;

  // Category info
  @Column({ type: 'varchar', length: 100, name: 'external_category_id' })
  externalCategoryId: string;

  @Column({ type: 'varchar', length: 255, name: 'external_category_name' })
  externalCategoryName: string;

  // Status
  @Column({ type: 'int', default: 1, name: 'available_status' })
  availableStatus: number; // 1 = available, 0 = unavailable

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  // Mapping status
  @Column({ type: 'boolean', default: false, name: 'is_mapped' })
  isMapped: boolean;

  // Raw data from platform
  @Column({ type: 'jsonb', nullable: true, name: 'raw_data' })
  rawData: Record<string, unknown> | null;

  // Timestamps
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'synced_at' })
  syncedAt: Date | null;
}
