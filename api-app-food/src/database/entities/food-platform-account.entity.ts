import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { FoodPlatformPort } from './food-platform-port.entity';
import { FoodPlatformStoreMapping } from './food-platform-store-mapping.entity';

/**
 * Food Platform Account Status
 */
export enum AccountStatus {
  PENDING = 'pending', // Chờ đăng nhập
  CONNECTING = 'connecting', // Đang xác thực (OTP flow)
  CONNECTED = 'connected', // Đã kết nối thành công
  DISCONNECTED = 'disconnected', // Ngắt kết nối
  ERROR = 'error', // Lỗi xác thực
}

/**
 * Authentication Type
 */
export enum AuthType {
  USERNAME_PASSWORD = 'username_password',
  PHONE_OTP = 'phone_otp',
}

/**
 * Food Platform Type
 */
export enum FoodPlatformType {
  GRAB = 'grab',
  SHOPEE_FOOD = 'shopee_food',
  BEFOOD = 'befood',
}

/**
 * Food Platform Account Entity
 * Lưu trữ thông tin tài khoản merchant đã liên kết
 */
@Entity('food_platform_accounts')
@Index(['tenantId', 'platform'])
@Index(['branchId'])
@Index(['status'])
@Index(['nextPollAt'])
export class FoodPlatformAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'uuid', nullable: true, name: 'branch_id' })
  branchId: string;

  // Platform info
  @Column({
    type: 'enum',
    enum: FoodPlatformType,
  })
  platform: FoodPlatformType;

  @Column({
    type: 'enum',
    enum: AuthType,
    name: 'auth_type',
  })
  authType: AuthType;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'display_name' })
  displayName: string;

  // Credentials (encrypted)
  @Column({ type: 'varchar', length: 255, nullable: true })
  username: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string; // Encrypted

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'phone_number' })
  phoneNumber: string;

  // OTP session
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'otp_session_id' })
  otpSessionId: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'otp_expires_at' })
  otpExpiresAt: Date | null;

  // Tokens
  @Column({ type: 'text', nullable: true, name: 'access_token' })
  accessToken: string | null;

  @Column({ type: 'text', nullable: true, name: 'refresh_token' })
  refreshToken: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'token_expires_at' })
  tokenExpiresAt: Date | null;

  // External merchant info (from platform)
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'external_merchant_id' })
  externalMerchantId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'external_merchant_name' })
  externalMerchantName: string | null;

  // Status
  @Column({
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.PENDING,
  })
  status: AccountStatus;

  @Column({ type: 'boolean', default: false, name: 'is_active' })
  isActive: boolean;

  // Auto-confirm settings
  @Column({ type: 'boolean', default: true, name: 'auto_confirm_enabled' })
  autoConfirmEnabled: boolean;

  @Column({ type: 'boolean', default: true, name: 'auto_print_enabled' })
  autoPrintEnabled: boolean;

  // Polling config
  @Column({ type: 'int', default: 30, name: 'poll_interval_seconds' })
  pollIntervalSeconds: number;

  @Column({ type: 'timestamp', nullable: true, name: 'last_poll_at' })
  lastPollAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'next_poll_at' })
  nextPollAt: Date;

  // Error tracking
  @Column({ type: 'int', default: 0, name: 'error_count' })
  errorCount: number;

  @Column({ type: 'text', nullable: true, name: 'last_error' })
  lastError: string | null;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => FoodPlatformPort, (port) => port.accounts, { nullable: true })
  @JoinColumn({ name: 'port_id' })
  port: FoodPlatformPort;

  @Column({ type: 'uuid', nullable: true, name: 'port_id' })
  portId: string;

  @OneToMany(() => FoodPlatformStoreMapping, (mapping) => mapping.account)
  storeMappings: FoodPlatformStoreMapping[];
}
