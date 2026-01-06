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
import { Brand } from './brand.entity';
import { Branch } from './branch.entity';

export enum EInvoiceProvider {
  FPT = 'fpt',
  VNPT = 'vnpt',
  MISA = 'misa',
  VIETTEL = 'viettel',
  MIFI = 'mifi',
  INVOICE = 'invoice',
  HILO = 'hilo',
}

@Entity('einvoice_configs')
@Index('idx_einvoice_configs_tenant', ['tenantId'])
@Index('idx_einvoice_configs_brand', ['brandId'])
export class EInvoiceConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', length: 50 })
  tenantId: string;

  @Column({ name: 'brand_id' })
  brandId: string;

  @ManyToOne(() => Brand, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  // Optional: config per branch
  @Column({ name: 'branch_id', nullable: true })
  branchId: string;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({
    type: 'enum',
    enum: EInvoiceProvider,
  })
  provider: EInvoiceProvider;

  // Company tax info
  @Column({ name: 'tax_code', length: 20 })
  taxCode: string;

  @Column({ name: 'company_name', length: 255 })
  companyName: string;

  @Column({ name: 'company_address', type: 'text', nullable: true })
  companyAddress: string;

  // Invoice template
  @Column({ name: 'invoice_template', length: 50, nullable: true })
  invoiceTemplate: string;

  @Column({ name: 'invoice_series', length: 20, nullable: true })
  invoiceSeries: string;

  // API credentials
  @Column({ name: 'api_url', type: 'text', nullable: true })
  apiUrl: string;

  @Column({ name: 'api_username', length: 255, nullable: true })
  apiUsername: string;

  @Column({ name: 'api_password', length: 255, nullable: true })
  apiPassword: string;

  @Column({ name: 'api_token', type: 'text', nullable: true })
  apiToken: string;

  // Additional config as JSON
  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any>;

  // Auto issue invoice when order is paid
  @Column({ name: 'auto_issue', default: false })
  autoIssue: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
