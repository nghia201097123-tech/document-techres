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

/**
 * Bill Template - Mẫu hóa đơn
 *
 * Mẫu bill được xây dựng ở cấp THƯƠNG HIỆU (Brand), dùng chung cho tất cả chi nhánh.
 * Máy in bill (BillPrinterConfig) ở cấp CHI NHÁNH sẽ chọn mẫu để sử dụng.
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
@Index(['tenantId', 'brandId'])
export class BillTemplate {
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

  // ============ TIME TRACKING CONFIG ============
  @Column({ name: 'show_check_in_time', default: false })
  showCheckInTime: boolean; // Giờ vào

  @Column({ name: 'show_check_out_time', default: false })
  showCheckOutTime: boolean; // Giờ ra

  @Column({ name: 'check_in_label', length: 50, default: 'Giờ vào' })
  checkInLabel: string;

  @Column({ name: 'check_out_label', length: 50, default: 'Giờ ra' })
  checkOutLabel: string;

  // ============ ITEMS CONFIG ============
  @Column({ name: 'show_item_code', default: false })
  showItemCode: boolean;

  @Column({ name: 'show_item_note', default: true })
  showItemNote: boolean;

  @Column({ name: 'show_unit_price', default: true })
  showUnitPrice: boolean;

  @Column({ name: 'show_quantity', default: true })
  showQuantity: boolean;

  @Column({ name: 'show_order_note', default: true })
  showOrderNote: boolean; // Hiển thị ghi chú đơn hàng

  @Column({ name: 'item_display_layout', type: 'varchar', length: 50, default: 'standard' })
  itemDisplayLayout: string; // standard, compact, detailed, two_line, price_right, with_index, grouped, grid_2_col, minimal, dotted, boxed, table

  // ============ PRICE CONFIG ============
  @Column({ name: 'show_subtotal', default: true })
  showSubtotal: boolean;

  // ============ DISCOUNT CONFIG (4 loại giảm giá) ============
  // 1. Giảm giá món (Item Discount) - ưu tiên 1
  @Column({ name: 'show_item_discount', default: true })
  showItemDiscount: boolean; // Hiển thị giảm giá trên từng món

  @Column({ name: 'show_total_item_discount', default: true })
  showTotalItemDiscount: boolean; // Hiển thị tổng giảm giá các món

  @Column({ name: 'item_discount_label', length: 50, default: 'Giảm giá món' })
  itemDiscountLabel: string;

  // 2. Giảm giá hóa đơn (Bill Discount) - ưu tiên 2
  @Column({ name: 'show_bill_discount', default: true })
  showBillDiscount: boolean;

  @Column({ name: 'bill_discount_label', length: 50, default: 'Giảm giá hóa đơn' })
  billDiscountLabel: string;

  // 3. Coupon - ưu tiên 3
  @Column({ name: 'show_coupon_discount', default: true })
  showCouponDiscount: boolean;

  @Column({ name: 'coupon_discount_label', length: 50, default: 'Mã giảm giá' })
  couponDiscountLabel: string;

  // 4. Voucher - ưu tiên 4
  @Column({ name: 'show_voucher_discount', default: true })
  showVoucherDiscount: boolean;

  @Column({ name: 'voucher_discount_label', length: 50, default: 'Voucher' })
  voucherDiscountLabel: string;

  // Tổng giảm giá (hiển thị tổng tất cả loại giảm giá)
  @Column({ name: 'show_total_discount', default: true })
  showTotalDiscount: boolean;

  @Column({ name: 'total_discount_label', length: 50, default: 'Tổng giảm giá' })
  totalDiscountLabel: string;

  // Deprecated - giữ lại để tương thích ngược
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

  // ============ STYLE CONFIG (Content styling) ============
  @Column({ name: 'font_size', type: 'varchar', length: 20, default: 'normal' })
  fontSize: string; // 'small', 'normal', 'large'

  @Column({ name: 'line_spacing', type: 'float', default: 0.7 })
  lineSpacing: number; // 0.3-1.0

  @Column({ name: 'separator_char', type: 'char', length: 1, default: '-' })
  separatorChar: string;

  @Column({ name: 'double_separator_char', type: 'char', length: 1, default: '=' })
  doubleSeparatorChar: string;

  // ============ HARDWARE CONFIG (deprecated - use BillPrinterConfig) ============
  // Note: Các config phần cứng nên đặt ở BillPrinterConfig thay vì ở đây
  // Giữ lại để tương thích ngược với các bản cũ
  @Column({ name: 'paper_width', type: 'int', default: 80 })
  paperWidth: number; // 58 hoặc 80mm - nên dùng BillPrinterConfig.paperWidth

  @Column({ name: 'cut_paper', default: true })
  cutPaper: boolean; // Nên dùng BillPrinterConfig.cutPaper

  @Column({ name: 'open_cash_drawer', default: false })
  openCashDrawer: boolean; // Nên dùng BillPrinterConfig.openCashDrawer

  @Column({ name: 'beep_after_print', default: false })
  beepAfterPrint: boolean; // Nên dùng BillPrinterConfig.beepAfterPrint

  @Column({ name: 'number_of_copies', type: 'int', default: 1 })
  numberOfCopies: number; // Nên dùng BillPrinterConfig.numberOfCopies

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
