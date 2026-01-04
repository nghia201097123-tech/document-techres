import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Product } from './product.entity';
import { ToppingGroup } from './topping-group.entity';

// Topping items inside a ToppingGroup
@Entity('topping_group_items')
@Index(['tenantId', 'groupId'])
@Unique(['groupId', 'toppingId'])
export class ToppingGroupItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ name: 'group_id' })
  groupId: string;

  @ManyToOne(() => ToppingGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: ToppingGroup;

  @Column({ name: 'topping_id' })
  toppingId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'topping_id' })
  topping: Product;

  // Price adjustment when this topping is selected (e.g., Size L +5000đ)
  @Column({ name: 'price_adjustment', type: 'decimal', precision: 15, scale: 2, default: 0 })
  priceAdjustment: number;

  // Max quantity of this topping that can be added
  @Column({ name: 'max_quantity', default: 5 })
  maxQuantity: number;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
