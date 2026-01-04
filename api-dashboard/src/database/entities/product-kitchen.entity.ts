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
import { Kitchen } from './kitchen.entity';

@Entity('product_kitchens')
@Index(['tenantId', 'productId'])
@Index(['tenantId', 'kitchenId'])
@Unique(['productId', 'kitchenId'])
export class ProductKitchen {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'kitchen_id' })
  kitchenId: string;

  @ManyToOne(() => Kitchen, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kitchen_id' })
  kitchen: Kitchen;
}
