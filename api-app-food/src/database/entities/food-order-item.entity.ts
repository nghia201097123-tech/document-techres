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
import { FoodOrder } from './food-order.entity';

/**
 * Food Order Item Status
 */
export enum FoodOrderItemStatus {
  PENDING = 'pending', // Chờ xử lý
  PREPARING = 'preparing', // Đang làm
  READY = 'ready', // Đã xong
  SERVED = 'served', // Đã phục vụ
  CANCELLED = 'cancelled', // Đã hủy
}

/**
 * Food Order Item Entity
 * Lưu trữ chi tiết từng món trong đơn hàng food
 */
@Entity('food_order_items')
@Index(['orderId'])
@Index(['externalProductId'])
@Index(['techresProductId'])
export class FoodOrderItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relation to FoodOrder
  @ManyToOne(() => FoodOrder, (order) => order.orderItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: FoodOrder;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  // Product info from platform
  @Column({ type: 'varchar', length: 255, name: 'product_name' })
  productName: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'external_product_id' })
  externalProductId: string | null;

  // Quantity & Price
  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'bigint', default: 0, name: 'unit_price' })
  unitPrice: number;

  @Column({ type: 'bigint', default: 0, name: 'total_price' })
  totalPrice: number;

  // Item discount (nếu có giảm giá riêng cho món)
  @Column({ type: 'bigint', default: 0, name: 'discount_amount' })
  discountAmount: number;

  // Options & Notes
  @Column({ type: 'text', nullable: true })
  note: string | null; // "Ít đá, nhiều đường"

  @Column({ type: 'text', nullable: true })
  options: string | null; // "Size L, Thêm trân châu"

  // Modifiers (JSON for flexibility)
  @Column({ type: 'jsonb', nullable: true })
  modifiers: ModifierInfo[] | null;

  // Techres mapping (for future integration)
  @Column({ type: 'int', nullable: true, name: 'techres_product_id' })
  techresProductId: number | null;

  @Column({ type: 'int', nullable: true, name: 'techres_brand_id' })
  techresBrandId: number | null;

  // Item status (for kitchen display)
  @Column({
    type: 'enum',
    enum: FoodOrderItemStatus,
    default: FoodOrderItemStatus.PENDING,
  })
  status: FoodOrderItemStatus;

  // Sort order within the order
  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder: number;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/**
 * Modifier info interface
 */
export interface ModifierInfo {
  groupName: string; // "Topping", "Size", "Đường"
  modifierName: string; // "Trân châu", "L", "50%"
  price: number; // Additional price
  quantity?: number;
}
