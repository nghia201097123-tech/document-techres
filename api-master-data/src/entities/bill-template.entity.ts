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
 * Bill Template - Mẫu hóa đơn
 *
 * Các mẫu bill có thể cấu hình từ web-dashboard:
 * - classic: Mẫu truyền thống
 * - modern: Mẫu hiện đại, tối giản
 * - compact: Mẫu thu gọn
 * - detailed: Mẫu chi tiết với VAT từng món
 * - premium: Mẫu cao cấp với logo, QR
 */
export enum BillTemplateType {
  CLASSIC = 'classic',
  MODERN = 'modern',
  COMPACT = 'compact',
  DETAILED = 'detailed',
  PREMIUM = 'premium',
}

@Entity('bill_templates')
@Index(['tenantId', 'branchId'])
export class BillTemplate {
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

  @Column({
    name: 'template_type',
    type: 'varchar',
    length: 50,
    default: BillTemplateType.CLASSIC,
  })
  templateType: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // ============ HEADER CONFIG ============
  @Column({ name: 'show_logo', default: true })
  showLogo: boolean;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string;

  @Column({ name: 'store_name', length: 200 })
  storeName: string;

  @Column({ name: 'store_address', type: 'text', nullable: true })
  storeAddress: string;

  @Column({ name: 'store_phone', length: 50, nullable: true })
  storePhone: string;

  @Column({ name: 'tax_code', length: 50, nullable: true })
  taxCode: string;

  @Column({ name: 'header_text', type: 'text', nullable: true })
  headerText: string; // Text tùy chỉnh ở header

  // ============ CONTENT CONFIG ============
  @Column({ name: 'bill_title', length: 100, default: 'HÓA ĐƠN BÁN HÀNG' })
  billTitle: string;

  @Column({ name: 'show_order_number', default: true })
  showOrderNumber: boolean;

  @Column({ name: 'show_table_name', default: true })
  showTableName: boolean;

  @Column({ name: 'show_staff_name', default: true })
  showStaffName: boolean;

  @Column({ name: 'show_customer_name', default: true })
  showCustomerName: boolean;

  @Column({ name: 'show_date_time', default: true })
  showDateTime: boolean;

  @Column({ name: 'date_format', length: 50, default: 'dd/MM/yyyy HH:mm' })
  dateFormat: string;

  // ============ ITEMS CONFIG ============
  @Column({ name: 'show_item_code', default: false })
  showItemCode: boolean;

  @Column({ name: 'show_item_note', default: true })
  showItemNote: boolean;

  @Column({ name: 'show_unit_price', default: true })
  showUnitPrice: boolean;

  @Column({ name: 'show_quantity', default: true })
  showQuantity: boolean;

  // ============ PRICE CONFIG ============
  @Column({ name: 'show_subtotal', default: true })
  showSubtotal: boolean;

  @Column({ name: 'show_discount', default: true })
  showDiscount: boolean;

  @Column({ name: 'show_discount_percent', default: true })
  showDiscountPercent: boolean;

  @Column({ name: 'show_service_fee', default: true })
  showServiceFee: boolean;

  @Column({ name: 'show_vat', default: true })
  showVat: boolean;

  @Column({ name: 'show_vat_details', default: true })
  showVatDetails: boolean; // Hiển thị giá trước/sau VAT

  @Column({ name: 'show_price_before_vat', default: true })
  showPriceBeforeVat: boolean;

  @Column({ name: 'show_price_after_vat', default: true })
  showPriceAfterVat: boolean;

  @Column({ name: 'vat_label', length: 50, default: 'VAT' })
  vatLabel: string;

  @Column({ name: 'price_before_vat_label', length: 100, default: 'Giá trước thuế' })
  priceBeforeVatLabel: string;

  @Column({ name: 'price_after_vat_label', length: 100, default: 'Giá sau thuế' })
  priceAfterVatLabel: string;

  // ============ PAYMENT CONFIG ============
  @Column({ name: 'show_payment_method', default: true })
  showPaymentMethod: boolean;

  @Column({ name: 'show_received_amount', default: true })
  showReceivedAmount: boolean;

  @Column({ name: 'show_change_amount', default: true })
  showChangeAmount: boolean;

  // ============ FOOTER CONFIG ============
  @Column({ name: 'show_qr_code', default: false })
  showQrCode: boolean;

  @Column({ name: 'qr_code_type', length: 50, default: 'order_id' })
  qrCodeType: string; // 'order_id', 'payment', 'review', 'custom'

  @Column({ name: 'qr_code_content', type: 'text', nullable: true })
  qrCodeContent: string; // Template cho QR content

  @Column({ name: 'show_barcode', default: false })
  showBarcode: boolean;

  @Column({ name: 'thank_you_message', type: 'text', default: 'Cảm ơn quý khách!' })
  thankYouMessage: string;

  @Column({ name: 'comeback_message', type: 'text', default: 'Hẹn gặp lại!' })
  comebackMessage: string;

  @Column({ name: 'footer_text', type: 'text', nullable: true })
  footerText: string; // Text tùy chỉnh ở footer

  @Column({ name: 'show_wifi_info', default: false })
  showWifiInfo: boolean;

  @Column({ name: 'wifi_name', length: 100, nullable: true })
  wifiName: string;

  @Column({ name: 'wifi_password', length: 100, nullable: true })
  wifiPassword: string;

  // ============ STYLE CONFIG ============
  @Column({ name: 'paper_width', type: 'int', default: 80 })
  paperWidth: number; // 58 hoặc 80mm

  @Column({ name: 'font_size', type: 'varchar', length: 20, default: 'normal' })
  fontSize: string; // 'small', 'normal', 'large'

  @Column({ name: 'separator_char', type: 'char', length: 1, default: '-' })
  separatorChar: string;

  @Column({ name: 'double_separator_char', type: 'char', length: 1, default: '=' })
  doubleSeparatorChar: string;

  @Column({ name: 'cut_paper', default: true })
  cutPaper: boolean;

  @Column({ name: 'open_cash_drawer', default: false })
  openCashDrawer: boolean;

  @Column({ name: 'beep_after_print', default: false })
  beepAfterPrint: boolean;

  @Column({ name: 'number_of_copies', type: 'int', default: 1 })
  numberOfCopies: number;

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
