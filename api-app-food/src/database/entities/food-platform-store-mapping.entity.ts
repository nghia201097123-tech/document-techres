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
 * Food Platform Store Mapping Entity
 * Mapping giữa cửa hàng trên platform và chi nhánh TechRes
 */
@Entity('food_platform_store_mappings')
@Index(['accountId'])
@Index(['branchId'])
@Index(['externalStoreId'])
@Unique(['accountId', 'externalStoreId']) // 1 store chỉ map 1 lần với 1 account
// Note: Removed @Unique(['branchId', 'accountId']) - 1 branch can be linked to multiple stores
export class FoodPlatformStoreMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, name: 'tenant_id' })
  tenantId: string;

  // Account reference
  @Column({ type: 'uuid', name: 'account_id' })
  accountId: string;

  @ManyToOne(() => FoodPlatformAccount, (account) => account.storeMappings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'account_id' })
  account: FoodPlatformAccount;

  // Merchant store info (from platform)
  @Column({ type: 'varchar', length: 100, name: 'external_store_id' })
  externalStoreId: string; // Store ID trên platform (GR-001)

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'external_merchant_id' })
  externalMerchantId: string | null; // Merchant ID trên platform (for BeFood)

  @Column({ type: 'varchar', length: 255, name: 'external_store_name' })
  externalStoreName: string; // Tên cửa hàng trên platform

  @Column({ type: 'text', nullable: true, name: 'external_store_address' })
  externalStoreAddress: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'external_store_phone' })
  externalStorePhone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'external_store_email' })
  externalStoreEmail: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_store_active' })
  isStoreActive: boolean; // Trạng thái trên platform

  // TechRes branch mapping
  @Column({ type: 'varchar', length: 50, name: 'branch_id' })
  branchId: string; // FK to branches (TechRes) - can be UUID or legacy int as string

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'branch_name' })
  branchName: string; // Cache tên chi nhánh

  // Mapping status
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  // Timestamps
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_synced_at' })
  lastSyncedAt: Date;
}
