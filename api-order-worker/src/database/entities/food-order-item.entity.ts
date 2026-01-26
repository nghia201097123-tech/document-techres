import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FoodOrder } from './food-order.entity';

@Entity('food_order_items')
export class FoodOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => FoodOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: FoodOrder;

  @Column({ name: 'external_product_id', type: 'varchar', length: 100, nullable: true })
  externalProductId: string;

  @Column({ name: 'product_name', type: 'varchar', length: 255 })
  productName: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'unit_price', type: 'bigint' })
  unitPrice: number;

  @Column({ name: 'total_price', type: 'bigint' })
  totalPrice: number;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'text', nullable: true })
  options: string;
}
