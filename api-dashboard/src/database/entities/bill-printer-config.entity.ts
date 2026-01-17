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
import { BillTemplate } from './bill-template.entity';

export enum PrinterConnectionType {
  NETWORK = 'network',
  BLUETOOTH = 'bluetooth',
  USB = 'usb',
  SUNMI = 'sunmi',
}

@Entity('bill_printer_configs')
@Index(['tenantId', 'branchId'])
export class BillPrinterConfig {
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

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // ============ CONNECTION CONFIG ============
  @Column({
    name: 'connection_type',
    type: 'varchar',
    length: 50,
    default: PrinterConnectionType.NETWORK,
  })
  connectionType: string;

  @Column({ name: 'printer_ip', length: 50, nullable: true })
  printerIp: string;

  @Column({ name: 'printer_port', type: 'int', default: 9100 })
  printerPort: number;

  @Column({ name: 'printer_mac', length: 50, nullable: true })
  printerMac: string;

  @Column({ name: 'printer_usb_path', length: 200, nullable: true })
  printerUsbPath: string;

  // ============ TEMPLATE CONFIG ============
  @Column({ name: 'template_id', nullable: true })
  templateId: string;

  @ManyToOne(() => BillTemplate, { nullable: true })
  @JoinColumn({ name: 'template_id' })
  template: BillTemplate;

  // ============ PRINT CONFIG ============
  @Column({ name: 'paper_width', type: 'int', default: 80 })
  paperWidth: number;

  @Column({ name: 'font_size', length: 20, default: 'normal' })
  fontSize: string; // extra_small, small, normal, large, extra_large

  @Column({ name: 'line_spacing', type: 'float', default: 0.7 })
  lineSpacing: number; // 0.3-1.0

  @Column({ name: 'auto_print_on_payment', default: true })
  autoPrintOnPayment: boolean;

  @Column({ name: 'print_preview', default: false })
  printPreview: boolean;

  @Column({ name: 'number_of_copies', type: 'int', default: 1 })
  numberOfCopies: number;

  @Column({ name: 'cut_paper', default: true })
  cutPaper: boolean;

  @Column({ name: 'open_cash_drawer', default: true })
  openCashDrawer: boolean;

  @Column({ name: 'beep_after_print', default: true })
  beepAfterPrint: boolean;

  // ============ RETRY CONFIG ============
  @Column({ name: 'retry_count', type: 'int', default: 3 })
  retryCount: number;

  @Column({ name: 'retry_delay_ms', type: 'int', default: 1000 })
  retryDelayMs: number;

  @Column({ name: 'connection_timeout_ms', type: 'int', default: 5000 })
  connectionTimeoutMs: number;

  // ============ STATUS ============
  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
