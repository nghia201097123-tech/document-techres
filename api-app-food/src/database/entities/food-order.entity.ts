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
  Unique,
} from 'typeorm';
import { FoodPlatformAccount, FoodPlatformType } from './food-platform-account.entity';
import { FoodPlatformStoreMapping } from './food-platform-store-mapping.entity';
import { FoodOrderItemEntity } from './food-order-item.entity';

/**
 * TechRes Order Status - Trạng thái đơn hàng phía TechRes
 * Flow: NEW -> CONFIRMED -> COMPLETED/CANCELLED
 */
export enum FoodOrderStatus {
  NEW = 'new', // Đơn mới, chờ xác nhận bởi nhân viên CCB
  CONFIRMED = 'confirmed', // Đã xác nhận bởi nhân viên CCB
  COMPLETED = 'completed', // Hoàn thành (tự động khi merchant hoàn tất)
  CANCELLED = 'cancelled', // Đã hủy (bởi nhân viên hoặc tự động khi merchant huỷ)
}

/**
 * Merchant Order Status - Trạng thái đơn hàng từ Grab
 * Lưu trực tiếp giá trị enum từ Grab API
 */
export enum MerchantOrderStatus {
  // Trạng thái chưa kết thúc
  ORDER_IN_PREPARE = 'ORDER_IN_PREPARE', // Đang xử lý
  ORDER_EXECUTING = 'ORDER_EXECUTING', // Đang giao

  // Trạng thái đã kết thúc
  COMPLETED = 'COMPLETED', // Hoàn tất

  // Trạng thái huỷ (đã kết thúc)
  CANCELLED = 'CANCELLED', // Huỷ chung
  CANCELLED_MAX = 'CANCELLED_MAX', // Huỷ do quá thời gian
  CANCELLED_PASSENGER = 'CANCELLED_PASSENGER', // Khách huỷ
  CANCELLED_OPERATOR = 'CANCELLED_OPERATOR', // Operator huỷ
  FAILED = 'FAILED', // Thất bại
}

/**
 * Food Order Item
 */
export interface FoodOrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  note?: string;
  options?: string;
  externalProductId?: string;
  techresProductId?: number; // Mapped product ID (future)
}

/**
 * Food Order Entity
 * Lưu trữ đơn hàng từ các food platform
 */
@Entity('food_orders')
@Index(['tenantId', 'branchId'])
@Index(['platform', 'status'])
@Index(['createdAt'])
@Index(['lastSyncAt'])
@Unique(['externalOrderId', 'platform']) // Mỗi đơn chỉ lưu 1 lần
export class FoodOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'varchar', length: 50, name: 'branch_id' })
  branchId: string; // Can be UUID or legacy int as string

  // External order info
  @Column({ type: 'varchar', length: 100, name: 'external_order_id' })
  externalOrderId: string; // Order ID từ platform

  @Column({ type: 'varchar', length: 50, name: 'order_code' })
  orderCode: string; // #GR12345, #SF98765

  @Column({
    type: 'enum',
    enum: FoodPlatformType,
  })
  platform: FoodPlatformType;

  // TechRes Status - Trạng thái do CCB quản lý
  @Column({
    type: 'enum',
    enum: FoodOrderStatus,
    default: FoodOrderStatus.NEW,
  })
  status: FoodOrderStatus;

  // Merchant Status - Trạng thái từ Grab
  @Column({
    type: 'enum',
    enum: MerchantOrderStatus,
    default: MerchantOrderStatus.ORDER_IN_PREPARE,
    name: 'merchant_status',
  })
  merchantStatus: MerchantOrderStatus;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'previous_status' })
  previousStatus: string; // For tracking TechRes status changes

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'previous_merchant_status' })
  previousMerchantStatus: string; // For tracking merchant status changes

  // Customer info
  @Column({ type: 'varchar', length: 255, name: 'customer_name' })
  customerName: string;

  @Column({ type: 'varchar', length: 20, name: 'customer_phone' })
  customerPhone: string;

  @Column({ type: 'text', nullable: true, name: 'customer_address' })
  customerAddress: string;

  @Column({ type: 'text', nullable: true, name: 'customer_note' })
  customerNote: string;

  // Items (JSONB - deprecated, use orderItems relation instead)
  @Column({ type: 'jsonb', default: '[]' })
  items: FoodOrderItem[];

  // Order Items relation (normalized table)
  @OneToMany(() => FoodOrderItemEntity, (item) => item.order, { cascade: true, eager: false })
  orderItems: FoodOrderItemEntity[];

  // Payment
  @Column({ type: 'bigint', default: 0 })
  subtotal: number;

  @Column({ type: 'bigint', default: 0, name: 'delivery_fee' })
  deliveryFee: number;

  @Column({ type: 'bigint', default: 0, name: 'platform_fee' })
  platformFee: number;

  @Column({ type: 'bigint', default: 0 })
  discount: number;

  @Column({ type: 'bigint', default: 0, name: 'total_amount' })
  totalAmount: number;

  // Additional Grab fee fields
  @Column({ type: 'bigint', default: 0, name: 'small_order_fee' })
  smallOrderFee: number;

  @Column({ type: 'bigint', default: 0, name: 'item_discount_amount' })
  itemDiscountAmount: number;

  @Column({ type: 'bigint', default: 0, name: 'promotion_amount' })
  promotionAmount: number;

  @Column({ type: 'boolean', default: false, name: 'is_paid' })
  isPaid: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'payment_method' })
  paymentMethod: string; // GrabPay, COD, ShopeePay

  // Driver info
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'driver_name' })
  driverName: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'driver_phone' })
  driverPhone: string | null;

  @Column({ type: 'text', nullable: true, name: 'driver_avatar' })
  driverAvatar: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'driver_license_plate' })
  driverLicensePlate: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'estimated_delivery_time' })
  estimatedDeliveryTime: string | null;

  // Scheduled order (đơn đặt trước)
  @Column({ type: 'boolean', default: false, name: 'is_scheduled_order' })
  isScheduledOrder: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'scheduled_delivery_time' })
  scheduledDeliveryTime: string | null;

  // Combined order (đơn ghép)
  @Column({ type: 'boolean', default: false, name: 'is_combined_order' })
  isCombinedOrder: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'parent_order_id' })
  parentOrderId: string | null;

  // Processing flags
  @Column({ type: 'boolean', default: false, name: 'is_auto_confirmed' })
  isAutoConfirmed: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_printed' })
  isPrinted: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'confirmed_at' })
  confirmedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'printed_at' })
  printedAt: Date;

  // Timestamps
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'accepted_at' })
  acceptedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'prepared_at' })
  preparedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  completedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'cancelled_at' })
  cancelledAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'cancel_reason' })
  cancelReason: string;

  // Platform sync info
  @Column({ type: 'timestamptz', nullable: true, name: 'platform_created_at' })
  platformCreatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'platform_updated_at' })
  platformUpdatedAt: Date;

  @Column({ type: 'timestamptz', name: 'last_sync_at', default: () => 'CURRENT_TIMESTAMP' })
  lastSyncAt: Date;

  // Relations
  @ManyToOne(() => FoodPlatformAccount, { nullable: true })
  @JoinColumn({ name: 'account_id' })
  account: FoodPlatformAccount;

  @Column({ type: 'uuid', nullable: true, name: 'account_id' })
  accountId: string;

  @ManyToOne(() => FoodPlatformStoreMapping, { nullable: true })
  @JoinColumn({ name: 'store_mapping_id' })
  storeMapping: FoodPlatformStoreMapping;

  @Column({ type: 'uuid', nullable: true, name: 'store_mapping_id' })
  storeMappingId: string;

  // Raw data from platform (for debugging)
  @Column({ type: 'jsonb', nullable: true, name: 'raw_data' })
  rawData: Record<string, unknown> | null;
}
