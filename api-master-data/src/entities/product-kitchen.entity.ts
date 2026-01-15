import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  Unique,
} from 'typeorm';

/**
 * Product-Kitchen Assignment Entity
 * Maps products to kitchens for print routing
 *
 * One product can be assigned to multiple kitchens
 * One kitchen can have multiple products assigned
 */
@Entity('product_kitchens')
@Unique(['productId', 'kitchenId'])
@Index(['tenantId', 'productId'])
@Index(['tenantId', 'kitchenId'])
export class ProductKitchen {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'kitchen_id' })
  kitchenId: string;
}
