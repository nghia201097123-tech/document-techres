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
import { TransactionCategory, TransactionType } from './transaction-category.entity';
import { PaymentMethod } from './payment-method.entity';
import { BankAccount } from './bank-account.entity';
import { Staff } from './staff.entity';

/**
 * Trạng thái phiếu thu chi
 */
export enum VoucherStatus {
  DRAFT = 'draft',           // Phiếu nháp
  PENDING = 'pending',       // Chờ duyệt
  APPROVED = 'approved',     // Đã duyệt
  CANCELLED = 'cancelled',   // Đã hủy
}

/**
 * Loại phương thức thanh toán
 */
export enum PaymentType {
  CASH = 'cash',             // Tiền mặt - Sổ quỹ tiền mặt
  BANK = 'bank',             // Chuyển khoản - Sổ tiền gửi ngân hàng
}

/**
 * Phiếu thu chi - Đáp ứng yêu cầu 7 sổ thuế:
 * - Sổ quỹ tiền mặt (Cash Book)
 * - Sổ tiền gửi ngân hàng (Bank Book)
 * - Sổ nhật ký chung (General Journal)
 */
@Entity('transaction_vouchers')
@Index(['tenantId', 'brandId'])
@Index(['tenantId', 'branchId'])
@Index(['voucherNumber'], { unique: true })
@Index(['voucherDate'])
@Index(['transactionType'])
@Index(['status'])
export class TransactionVoucher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ name: 'brand_id' })
  brandId: string;

  @ManyToOne(() => Brand)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column({ name: 'branch_id' })
  branchId: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  // ===== Thông tin phiếu =====

  /**
   * Số phiếu - Auto-generated theo format: PT-YYYYMMDD-XXXX hoặc PC-YYYYMMDD-XXXX
   * PT = Phiếu thu, PC = Phiếu chi
   */
  @Column({ name: 'voucher_number', unique: true })
  voucherNumber: string;

  /**
   * Loại phiếu: Thu (income) hoặc Chi (expense)
   */
  @Column({ name: 'transaction_type', type: 'enum', enum: TransactionType })
  transactionType: TransactionType;

  /**
   * Ngày lập phiếu
   */
  @Column({ name: 'voucher_date', type: 'date' })
  voucherDate: Date;

  // ===== Danh mục =====

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @ManyToOne(() => TransactionCategory, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: TransactionCategory;

  // ===== Số tiền =====

  /**
   * Số tiền (VNĐ)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amount: number;

  // ===== Phương thức thanh toán =====

  /**
   * Loại thanh toán: Tiền mặt hoặc Chuyển khoản
   * Dùng để phân loại vào Sổ quỹ tiền mặt hoặc Sổ tiền gửi ngân hàng
   */
  @Column({ name: 'payment_type', type: 'enum', enum: PaymentType, default: PaymentType.CASH })
  paymentType: PaymentType;

  @Column({ name: 'payment_method_id', nullable: true })
  paymentMethodId: string;

  @ManyToOne(() => PaymentMethod, { nullable: true })
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethod: PaymentMethod;

  @Column({ name: 'bank_account_id', nullable: true })
  bankAccountId: string;

  @ManyToOne(() => BankAccount, { nullable: true })
  @JoinColumn({ name: 'bank_account_id' })
  bankAccount: BankAccount;

  // ===== Thông tin đối tác =====

  /**
   * Người nộp tiền (phiếu thu) / Người nhận tiền (phiếu chi)
   */
  @Column({ name: 'counterparty_name', nullable: true })
  counterpartyName: string;

  /**
   * Địa chỉ đối tác
   */
  @Column({ name: 'counterparty_address', nullable: true })
  counterpartyAddress: string;

  /**
   * Mã số thuế đối tác (dùng cho xuất hóa đơn)
   */
  @Column({ name: 'counterparty_tax_code', nullable: true })
  counterpartyTaxCode: string;

  // ===== Nội dung =====

  /**
   * Lý do thu/chi
   */
  @Column({ type: 'text' })
  reason: string;

  /**
   * Ghi chú bổ sung
   */
  @Column({ type: 'text', nullable: true })
  notes: string;

  // ===== File đính kèm =====

  /**
   * Danh sách URL file đính kèm (hóa đơn, chứng từ...)
   */
  @Column({ type: 'simple-array', nullable: true })
  attachments: string[];

  // ===== Trạng thái & Duyệt =====

  @Column({ type: 'enum', enum: VoucherStatus, default: VoucherStatus.DRAFT })
  status: VoucherStatus;

  /**
   * Người lập phiếu
   */
  @Column({ name: 'created_by_id', nullable: true })
  createdById: string;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: Staff;

  /**
   * Người duyệt phiếu
   */
  @Column({ name: 'approved_by_id', nullable: true })
  approvedById: string;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy: Staff;

  /**
   * Ngày duyệt
   */
  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date;

  /**
   * Lý do hủy (nếu bị hủy)
   */
  @Column({ name: 'cancelled_reason', type: 'text', nullable: true })
  cancelledReason: string;

  // ===== Tham chiếu =====

  /**
   * Mã tham chiếu (order ID, invoice ID, etc.)
   */
  @Column({ name: 'reference_code', nullable: true })
  referenceCode: string;

  /**
   * Loại tham chiếu (order, invoice, purchase, etc.)
   */
  @Column({ name: 'reference_type', nullable: true })
  referenceType: string;

  // ===== Timestamps =====

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
