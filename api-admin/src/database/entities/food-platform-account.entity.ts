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
import { Branch } from './branch.entity';

/**
 * Loại nền tảng food delivery
 */
export enum FoodPlatformType {
  GRAB = 'grab',
  BEFOOD = 'befood',
  SHOPEE_FOOD = 'shopee_food',
}

/**
 * Loại xác thực
 */
export enum FoodPlatformAuthType {
  USERNAME_PASSWORD = 'username_password', // Grab, BeFood
  PHONE_OTP = 'phone_otp', // ShopeeFood
}

/**
 * Trạng thái kết nối
 */
export enum FoodPlatformStatus {
  PENDING = 'pending', // Chờ kết nối (chưa nhập thông tin đăng nhập)
  CONNECTING = 'connecting', // Đang kết nối (chờ OTP)
  CONNECTED = 'connected', // Đã kết nối thành công
  DISCONNECTED = 'disconnected', // Ngắt kết nối (token hết hạn, lỗi)
  ERROR = 'error', // Lỗi kết nối
}

@Entity('food_platform_accounts')
@Index('idx_food_platform_tenant', ['tenantId'])
@Index('idx_food_platform_branch', ['branchId'])
export class FoodPlatformAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // tenant_id = company.code
  @Column({ name: 'tenant_id', length: 50 })
  tenantId: string;

  @Column({ name: 'branch_id' })
  branchId: string;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  // Tên hiển thị (VD: "Grab Food - Chi nhánh Q1")
  @Column({ length: 255 })
  name: string;

  // Loại nền tảng
  @Column({
    type: 'enum',
    enum: FoodPlatformType,
    enumName: 'food_platform_type',
  })
  platform: FoodPlatformType;

  // Loại xác thực
  @Column({
    name: 'auth_type',
    type: 'enum',
    enum: FoodPlatformAuthType,
    enumName: 'food_platform_auth_type',
    default: FoodPlatformAuthType.USERNAME_PASSWORD,
  })
  authType: FoodPlatformAuthType;

  // Trạng thái kết nối
  @Column({
    type: 'enum',
    enum: FoodPlatformStatus,
    enumName: 'food_platform_status',
    default: FoodPlatformStatus.PENDING,
  })
  status: FoodPlatformStatus;

  // ====== Thông tin đăng nhập (encrypted) ======

  // Username hoặc SĐT
  @Column({ length: 100, nullable: true })
  username: string;

  // Password (encrypted) - chỉ dùng cho Grab, BeFood
  @Column({ type: 'text', nullable: true })
  password: string;

  // SĐT cho OTP (ShopeeFood)
  @Column({ name: 'phone_number', length: 20, nullable: true })
  phoneNumber: string;

  // ====== Thông tin sau khi đăng nhập thành công ======

  // ID merchant trên platform
  @Column({ name: 'external_merchant_id', length: 100, nullable: true })
  externalMerchantId: string;

  // Tên cửa hàng trên platform
  @Column({ name: 'external_store_name', length: 255, nullable: true })
  externalStoreName: string;

  // Access token
  @Column({ name: 'access_token', type: 'text', nullable: true })
  accessToken: string;

  // Refresh token
  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken: string;

  // Token hết hạn
  @Column({ name: 'token_expires_at', type: 'timestamp', nullable: true })
  tokenExpiresAt: Date;

  // ====== Cấu hình polling ======

  // Khoảng thời gian poll (giây), mặc định 30s
  @Column({ name: 'poll_interval_seconds', type: 'int', default: 30 })
  pollIntervalSeconds: number;

  // Lần poll tiếp theo
  @Column({ name: 'next_poll_at', type: 'timestamp', nullable: true })
  nextPollAt: Date;

  // Lần poll gần nhất
  @Column({ name: 'last_poll_at', type: 'timestamp', nullable: true })
  lastPollAt: Date;

  // ====== Error tracking ======

  // Số lần lỗi liên tiếp
  @Column({ name: 'error_count', type: 'int', default: 0 })
  errorCount: number;

  // Lỗi gần nhất
  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string;

  // Lần lỗi gần nhất
  @Column({ name: 'last_error_at', type: 'timestamp', nullable: true })
  lastErrorAt: Date;

  // ====== OTP flow (ShopeeFood) ======

  // Session ID cho OTP flow
  @Column({ name: 'otp_session_id', length: 100, nullable: true })
  otpSessionId: string;

  // OTP hết hạn
  @Column({ name: 'otp_expires_at', type: 'timestamp', nullable: true })
  otpExpiresAt: Date;

  // ====== Metadata ======

  // Dữ liệu bổ sung từ platform (JSON)
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Thứ tự hiển thị
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  // Kích hoạt
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
