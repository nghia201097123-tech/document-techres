import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('bank_accounts')
@Index('idx_bank_accounts_tenant', ['tenantId'])
@Index('idx_bank_accounts_brand', ['brandId'])
export class BankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', length: 50 })
  tenantId: string;

  @Column({ name: 'brand_id' })
  brandId: string;

  // Optional: bank account per branch
  @Column({ name: 'branch_id', nullable: true })
  branchId: string;

  // Bank info
  @Column({ name: 'bank_code', length: 50 })
  bankCode: string;

  @Column({ name: 'bank_name', length: 255 })
  bankName: string;

  @Column({ name: 'account_number', length: 50 })
  accountNumber: string;

  @Column({ name: 'account_name', length: 255 })
  accountName: string;

  // For static QR code generation (VietQR)
  @Column({ name: 'bank_bin', length: 20, nullable: true })
  bankBin: string;

  // Template for transfer description (e.g., "TT {order_code}")
  @Column({ name: 'transfer_template', length: 255, nullable: true })
  transferTemplate: string;

  // Static QR code URL (pre-generated)
  @Column({ name: 'static_qr_url', type: 'text', nullable: true })
  staticQrUrl: string;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
