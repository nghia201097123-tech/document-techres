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
import { SeasonalPrice } from './seasonal-price.entity';
import { Product } from './product.entity';

@Entity('seasonal_price_products')
@Index(['tenantId', 'seasonalPriceId'])
@Index(['tenantId', 'productId'])
@Unique(['seasonalPriceId', 'productId'])
export class SeasonalPriceProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ name: 'seasonal_price_id' })
  seasonalPriceId: string;

  @ManyToOne(() => SeasonalPrice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seasonal_price_id' })
  seasonalPrice: SeasonalPrice;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
