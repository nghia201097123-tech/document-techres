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
import { Branch } from './branch.entity';

/**
 * Chế độ in của bếp
 * - TICKET: In phiếu bếp (nhiều món trên 1 tờ)
 * - LABEL: In tem (1 tem cho mỗi món/ly)
 * - BOTH: In cả phiếu và tem
 */
export enum KitchenPrintMode {
  TICKET = 'TICKET',
  LABEL = 'LABEL',
  BOTH = 'BOTH',
}

/**
 * Loại bếp
 */
export enum KitchenType {
  KITCHEN = 'kitchen',     // Bếp chính
  BAR = 'bar',             // Quầy bar/đồ uống
  GRILL = 'grill',         // Bếp nướng
  DESSERT = 'dessert',     // Tráng miệng
  SEAFOOD = 'seafood',     // Hải sản
  HOTPOT = 'hotpot',       // Lẩu
  BAKERY = 'bakery',       // Bánh
  OTHER = 'other',         // Khác
}

@Entity('kitchens')
@Index(['tenantId', 'branchId'])
export class Kitchen {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ name: 'branch_id' })
  branchId: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column()
  name: string;

  @Column({
    name: 'kitchen_type',
    type: 'varchar',
    length: 50,
    nullable: true,
    default: KitchenType.KITCHEN,
  })
  kitchenType: string;

  @Column({ name: 'printer_name', nullable: true })
  printerName: string;

  @Column({ name: 'printer_ip', nullable: true })
  printerIp: string;

  @Column({ name: 'printer_port', type: 'int', nullable: true, default: 9100 })
  printerPort: number;

  @Column({ name: 'paper_width', type: 'int', nullable: true, default: 80 })
  paperWidth: number;

  @Column({
    name: 'print_mode',
    type: 'varchar',
    length: 20,
    default: KitchenPrintMode.TICKET,
  })
  printMode: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // ========== TICKET PRINTING CONFIG ==========
  @Column({ name: 'ticket_cut_after_print', default: true })
  ticketCutAfterPrint: boolean;

  @Column({ name: 'ticket_print_items_separately', default: false })
  ticketPrintItemsSeparately: boolean;

  @Column({ name: 'ticket_copies', type: 'int', default: 1 })
  ticketCopies: number;

  // ========== LABEL PRINTING CONFIG ==========
  @Column({ name: 'label_print_price', default: false })
  labelPrintPrice: boolean;

  @Column({ name: 'label_print_store_name', default: false })
  labelPrintStoreName: boolean;

  @Column({ name: 'label_print_order_number', default: true })
  labelPrintOrderNumber: boolean;

  @Column({ name: 'label_print_table_name', default: true })
  labelPrintTableName: boolean;

  @Column({ name: 'label_print_time', default: true })
  labelPrintTime: boolean;

  @Column({ name: 'label_store_name', nullable: true })
  labelStoreName: string;

  @Column({ name: 'label_reverse', default: false })
  labelReverse: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
