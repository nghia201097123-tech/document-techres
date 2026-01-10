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
import { ProductNote } from './product-note.entity';

@Entity('product_note_assignments')
@Index(['tenantId', 'productId'])
@Unique(['productId', 'noteId'])
export class ProductNoteAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'note_id' })
  noteId: string;

  @ManyToOne(() => ProductNote, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'note_id' })
  note: ProductNote;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;
}
