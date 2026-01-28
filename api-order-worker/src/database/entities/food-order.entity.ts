import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum FoodOrderStatus {
  NEW = 'new',
  ACCEPTED = 'accepted',
  PREPARING = 'preparing',
  READY = 'ready',
  DELIVERING = 'delivering',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
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

  @Column({ type: 'enum', enum: FoodOrderStatus, default: FoodOrderStatus.NEW })
  status: FoodOrderStatus;

  @Column({ name: 'previous_status', type: 'varchar', length: 50, nullable: true })
  previousStatus: string;

  // Customer info
  @Column({ name: 'customer_name', type: 'varchar', length: 255 })
  customerName: string;

  @Column({ name: 'customer_phone', type: 'varchar', length: 20, default: '' })
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

  // Payment
  @Column({ name: 'is_paid', type: 'boolean', default: true })
  isPaid: boolean;

  @Column({ name: 'payment_method', type: 'varchar', length: 50, default: '' })
  paymentMethod: string;

  // Driver info
  @Column({ name: 'driver_name', type: 'varchar', length: 255, nullable: true })
  driverName: string;

  @Column({ name: 'driver_phone', type: 'varchar', length: 20, nullable: true })
  driverPhone: string;

  @Column({ name: 'driver_avatar', type: 'text', nullable: true })
  driverAvatar: string;

  @Column({ name: 'driver_license_plate', type: 'varchar', length: 100, nullable: true })
  driverLicensePlate: string;

  @Column({ name: 'estimated_delivery_time', type: 'varchar', length: 255, nullable: true })
  estimatedDeliveryTime: string;

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
