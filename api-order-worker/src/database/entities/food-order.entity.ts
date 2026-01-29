import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * TechRes Order Status - Trạng thái đơn hàng phía TechRes
 * Flow: NEW -> CONFIRMED -> COMPLETED/CANCELLED
 */
export enum FoodOrderStatus {
  NEW = 'new', // Đơn mới, chờ xác nhận bởi nhân viên CCB
  CONFIRMED = 'confirmed', // Đã xác nhận bởi nhân viên CCB
  COMPLETED = 'completed', // Hoàn thành
  CANCELLED = 'cancelled', // Đã hủy
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

export enum FoodPlatformType {
  GRAB = 'grab',
  SHOPEE_FOOD = 'shopee_food',
  BEFOOD = 'befood',
}

@Entity('food_orders')
@Index(['tenantId', 'branchId'])
@Index(['platform', 'status'])
@Index(['createdAt'])
@Index(['externalOrderId', 'platform'], { unique: true })
export class FoodOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 100 })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'varchar', length: 100 })
  branchId: string;

  @Column({ name: 'external_order_id', type: 'varchar', length: 100 })
  externalOrderId: string;

  @Column({ name: 'order_code', type: 'varchar', length: 50 })
  orderCode: string;

  @Column({ type: 'enum', enum: FoodPlatformType })
  platform: FoodPlatformType;

  // TechRes Status - Trạng thái do CCB quản lý
  @Column({ type: 'enum', enum: FoodOrderStatus, default: FoodOrderStatus.NEW })
  status: FoodOrderStatus;

  // Merchant Status - Trạng thái từ Grab
  @Column({
    type: 'enum',
    enum: MerchantOrderStatus,
    default: MerchantOrderStatus.ORDER_IN_PREPARE,
    name: 'merchant_status',
  })
  merchantStatus: MerchantOrderStatus;

  @Column({ name: 'previous_status', type: 'varchar', length: 50, nullable: true })
  previousStatus: string;

  @Column({ name: 'previous_merchant_status', type: 'varchar', length: 50, nullable: true })
  previousMerchantStatus: string;

  // Customer info
  @Column({ name: 'customer_name', type: 'varchar', length: 255 })
  customerName: string;

  @Column({ name: 'customer_phone', type: 'varchar', length: 50, default: '' })
  customerPhone: string;

  @Column({ name: 'customer_address', type: 'text', default: '' })
  customerAddress: string;

  @Column({ name: 'customer_note', type: 'text', default: '' })
  customerNote: string;

  // Items (JSONB)
  @Column({ type: 'jsonb', default: [] })
  items: any[];

  // Pricing
  @Column({ type: 'bigint', default: 0 })
  subtotal: number;

  @Column({ name: 'delivery_fee', type: 'bigint', default: 0 })
  deliveryFee: number;

  @Column({ name: 'platform_fee', type: 'bigint', default: 0 })
  platformFee: number;

  @Column({ type: 'bigint', default: 0 })
  discount: number;

  @Column({ name: 'total_amount', type: 'bigint' })
  totalAmount: number;

  // Additional Grab fee fields
  @Column({ name: 'small_order_fee', type: 'bigint', default: 0 })
  smallOrderFee: number;

  @Column({ name: 'item_discount_amount', type: 'bigint', default: 0 })
  itemDiscountAmount: number;

  @Column({ name: 'promotion_amount', type: 'bigint', default: 0 })
  promotionAmount: number;

  // Payment
  @Column({ name: 'is_paid', type: 'boolean', default: true })
  isPaid: boolean;

  @Column({ name: 'payment_method', type: 'varchar', length: 50, default: '' })
  paymentMethod: string;

  // Driver info
  @Column({ name: 'driver_name', type: 'varchar', length: 255, nullable: true })
  driverName: string;

  @Column({ name: 'driver_phone', type: 'varchar', length: 50, nullable: true })
  driverPhone: string;

  @Column({ name: 'driver_avatar', type: 'text', nullable: true })
  driverAvatar: string;

  @Column({ name: 'driver_license_plate', type: 'varchar', length: 100, nullable: true })
  driverLicensePlate: string;

  @Column({ name: 'estimated_delivery_time', type: 'varchar', length: 255, nullable: true })
  estimatedDeliveryTime: string;

  // Scheduled order (đơn đặt trước)
  @Column({ name: 'is_scheduled_order', type: 'boolean', default: false })
  isScheduledOrder: boolean;

  @Column({ name: 'scheduled_delivery_time', type: 'varchar', length: 255, nullable: true })
  scheduledDeliveryTime: string;

  // Combined order (đơn ghép)
  @Column({ name: 'is_combined_order', type: 'boolean', default: false })
  isCombinedOrder: boolean;

  @Column({ name: 'parent_order_id', type: 'varchar', length: 100, nullable: true })
  parentOrderId: string;

  // Timestamps
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'platform_created_at', type: 'timestamptz', nullable: true })
  platformCreatedAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt: Date;

  @Column({ name: 'prepared_at', type: 'timestamptz', nullable: true })
  preparedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date;

  @Column({ name: 'last_sync_at', type: 'timestamptz', nullable: true })
  lastSyncAt: Date;

  // Account relation
  @Column({ name: 'account_id', type: 'uuid', nullable: true })
  accountId: string;

  // Raw data for debugging
  @Column({ name: 'raw_data', type: 'jsonb', nullable: true })
  rawData: any;
}
