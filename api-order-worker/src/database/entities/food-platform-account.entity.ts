import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AccountStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  PENDING = 'PENDING',
  ERROR = 'ERROR',
}

export enum FoodPlatformType {
  GRAB = 'GRAB',
  SHOPEE_FOOD = 'SHOPEE_FOOD',
  BEFOOD = 'BEFOOD',
}

@Entity('food_platform_accounts')
@Index(['tenantId', 'branchId'])
@Index(['platform', 'status'])
export class FoodPlatformAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 100 })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'varchar', length: 100 })
  branchId: string;

  @Column({ type: 'enum', enum: FoodPlatformType })
  platform: FoodPlatformType;

  @Column({ name: 'display_name', type: 'varchar', length: 255, nullable: true })
  displayName: string;

  @Column({ type: 'enum', enum: AccountStatus, default: AccountStatus.PENDING })
  status: AccountStatus;

  // Credentials (encrypted)
  @Column({ type: 'varchar', length: 255, nullable: true })
  username: string;

  @Column({ type: 'text', nullable: true })
  password: string;

  @Column({ name: 'access_token', type: 'text', nullable: true })
  accessToken: string;

  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken: string;

  @Column({ name: 'token_expires_at', type: 'timestamp', nullable: true })
  tokenExpiresAt: Date;

  // External IDs
  @Column({ name: 'external_merchant_id', type: 'varchar', length: 100, nullable: true })
  externalMerchantId: string;

  @Column({ name: 'external_store_id', type: 'varchar', length: 100, nullable: true })
  externalStoreId: string;

  // Polling metadata
  @Column({ name: 'last_poll_at', type: 'timestamp', nullable: true })
  lastPollAt: Date;

  @Column({ name: 'error_count', type: 'int', default: 0 })
  errorCount: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
