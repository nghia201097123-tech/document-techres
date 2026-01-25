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
import { FoodPlatformAccount, FoodPlatformType } from './food-platform-account.entity';
import { FoodPlatformStoreMapping } from './food-platform-store-mapping.entity';

/**
 * Food Order Status
 */
export enum FoodOrderStatus {
  NEW = 'new', // Đơn mới, chờ xác nhận
  ACCEPTED = 'accepted', // Đã xác nhận
  PREPARING = 'preparing', // Đang chuẩn bị
  READY = 'ready', // Sẵn sàng giao
  DELIVERING = 'delivering', // Đang giao (có tài xế)
  COMPLETED = 'completed', // Hoàn thành
  CANCELLED = 'cancelled', // Đã hủy
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

  // Status
  @Column({
    type: 'enum',
    enum: FoodOrderStatus,
    default: FoodOrderStatus.NEW,
  })
  status: FoodOrderStatus;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'previous_status' })
  previousStatus: string; // For tracking status changes

  // Customer info
  @Column({ type: 'varchar', length: 255, name: 'customer_name' })
  customerName: string;

  @Column({ type: 'varchar', length: 20, name: 'customer_phone' })
  customerPhone: string;

  @Column({ type: 'text', nullable: true, name: 'customer_address' })
  customerAddress: string;

  @Column({ type: 'text', nullable: true, name: 'customer_note' })
  customerNote: string;

  // Items
  @Column({ type: 'jsonb', default: '[]' })
  items: FoodOrderItem[];

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

  @Column({ type: 'boolean', default: false, name: 'is_paid' })
  isPaid: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'payment_method' })
  paymentMethod: string; // GrabPay, COD, ShopeePay

  // Driver info
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'driver_name' })
  driverName: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'driver_phone' })
  driverPhone: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'driver_license_plate' })
  driverLicensePlate: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'estimated_delivery_time' })
  estimatedDeliveryTime: string | null;

  // Processing flags
  @Column({ type: 'boolean', default: false, name: 'is_auto_confirmed' })
  isAutoConfirmed: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_printed' })
  isPrinted: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'confirmed_at' })
  confirmedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'printed_at' })
  printedAt: Date;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'accepted_at' })
  acceptedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'prepared_at' })
  preparedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'cancelled_at' })
  cancelledAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'cancel_reason' })
  cancelReason: string;

  // Platform sync info
  @Column({ type: 'timestamp', nullable: true, name: 'platform_created_at' })
  platformCreatedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'platform_updated_at' })
  platformUpdatedAt: Date;

  @Column({ type: 'timestamp', name: 'last_sync_at', default: () => 'CURRENT_TIMESTAMP' })
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
