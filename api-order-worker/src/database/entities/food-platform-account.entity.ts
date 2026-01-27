import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AccountStatus {
  PENDING = 'pending',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

export enum FoodPlatformType {
  GRAB = 'grab',
  SHOPEE_FOOD = 'shopee_food',
  BEFOOD = 'befood',
}

export enum AuthType {
  USERNAME_PASSWORD = 'username_password',
  PHONE_OTP = 'phone_otp',
}

@Entity('food_platform_accounts')
@Index(['tenantId', 'platform'])
@Index(['branchId'])
@Index(['status'])
export class FoodPlatformAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 50 })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId: string;

  @Column({ type: 'enum', enum: FoodPlatformType })
  platform: FoodPlatformType;

  @Column({ type: 'enum', enum: AuthType, name: 'auth_type' })
  authType: AuthType;

  @Column({ name: 'display_name', type: 'varchar', length: 100, nullable: true })
  displayName: string;

  @Column({ type: 'enum', enum: AccountStatus, default: AccountStatus.PENDING })
  status: AccountStatus;

  // Credentials
  @Column({ type: 'varchar', length: 255, nullable: true })
  username: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phoneNumber: string;

  // Tokens
  @Column({ name: 'access_token', type: 'text', nullable: true })
  accessToken: string;

  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken: string;

  @Column({ name: 'token_expires_at', type: 'timestamp', nullable: true })
  tokenExpiresAt: Date;

  // External merchant info (from platform)
  @Column({ name: 'external_merchant_id', type: 'varchar', length: 100, nullable: true })
  externalMerchantId: string;

  @Column({ name: 'external_merchant_name', type: 'varchar', length: 255, nullable: true })
  externalMerchantName: string;

  // Status flags
  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive: boolean;

  // Polling metadata
  @Column({ name: 'poll_interval_seconds', type: 'int', default: 30 })
  pollIntervalSeconds: number;

  @Column({ name: 'last_poll_at', type: 'timestamp', nullable: true })
  lastPollAt: Date;

  @Column({ name: 'next_poll_at', type: 'timestamp', nullable: true })
  nextPollAt: Date;

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
