import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Product } from './product.entity';
import { ToppingGroup } from './topping-group.entity';

// Junction table to assign ToppingGroups to Products
@Entity('product_topping_groups')
@Index(['tenantId', 'productId'])
@Unique(['productId', 'groupId'])
export class ProductToppingGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'group_id' })
  groupId: string;

  @ManyToOne(() => ToppingGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: ToppingGroup;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;
}
