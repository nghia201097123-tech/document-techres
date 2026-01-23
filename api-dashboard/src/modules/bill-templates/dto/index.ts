import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, IsUUID, IsNotEmpty } from 'class-validator';
import { BillTemplateType } from '../../../database/entities/bill-template.entity';

export class CreateBillTemplateDto {
  @ApiProperty({ description: 'ID thương hiệu' })
  @IsUUID('4', { message: 'brandId phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'brandId không được để trống' })
  brandId: string;

  @ApiProperty({ description: 'Tên mẫu bill' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: BillTemplateType })
  @IsOptional()
  @IsEnum(BillTemplateType)
  templateType?: BillTemplateType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  // Header
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showLogo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty({ description: 'Tên cửa hàng' })
  @IsString()
  storeName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storeAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storePhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  headerText?: string;

  // Content
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showOrderNumber?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showTableName?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showStaffName?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showCustomerName?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showDateTime?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateFormat?: string;

  // Time tracking
  @ApiPropertyOptional({ description: 'Hiển thị giờ vào' })
  @IsOptional()
  @IsBoolean()
  showCheckInTime?: boolean;

  @ApiPropertyOptional({ description: 'Hiển thị giờ ra' })
  @IsOptional()
  @IsBoolean()
  showCheckOutTime?: boolean;

  @ApiPropertyOptional({ description: 'Nhãn giờ vào' })
  @IsOptional()
  @IsString()
  checkInLabel?: string;

  @ApiPropertyOptional({ description: 'Nhãn giờ ra' })
  @IsOptional()
  @IsString()
  checkOutLabel?: string;

  // Items
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showItemCode?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showItemNote?: boolean;

  @ApiPropertyOptional({ description: 'Hiển thị ghi chú đơn hàng' })
  @IsOptional()
  @IsBoolean()
  showOrderNote?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showUnitPrice?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showQuantity?: boolean;

  @ApiPropertyOptional({ description: 'Kiểu hiển thị danh sách món: standard, compact, detailed, two_line, price_right, with_index, grouped, grid_2_col, minimal, dotted, boxed, table, table_stt, table_qty_first, table_full' })
  @IsOptional()
  @IsString()
  itemDisplayLayout?: string;

  // Price
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showSubtotal?: boolean;

  // Discount config (4 loại giảm giá)
  // 1. Item Discount
  @ApiPropertyOptional({ description: 'Hiển thị giảm giá trên từng món' })
  @IsOptional()
  @IsBoolean()
  showItemDiscount?: boolean;

  @ApiPropertyOptional({ description: 'Hiển thị tổng giảm giá các món' })
  @IsOptional()
  @IsBoolean()
  showTotalItemDiscount?: boolean;

  @ApiPropertyOptional({ description: 'Nhãn giảm giá món' })
  @IsOptional()
  @IsString()
  itemDiscountLabel?: string;

  // 2. Bill Discount
  @ApiPropertyOptional({ description: 'Hiển thị giảm giá hóa đơn' })
  @IsOptional()
  @IsBoolean()
  showBillDiscount?: boolean;

  @ApiPropertyOptional({ description: 'Nhãn giảm giá hóa đơn' })
  @IsOptional()
  @IsString()
  billDiscountLabel?: string;

  // 3. Coupon
  @ApiPropertyOptional({ description: 'Hiển thị giảm giá coupon' })
  @IsOptional()
  @IsBoolean()
  showCouponDiscount?: boolean;

  @ApiPropertyOptional({ description: 'Nhãn giảm giá coupon' })
  @IsOptional()
  @IsString()
  couponDiscountLabel?: string;

  // 4. Voucher
  @ApiPropertyOptional({ description: 'Hiển thị giảm giá voucher' })
  @IsOptional()
  @IsBoolean()
  showVoucherDiscount?: boolean;

  @ApiPropertyOptional({ description: 'Nhãn giảm giá voucher' })
  @IsOptional()
  @IsString()
  voucherDiscountLabel?: string;

  // Total Discount
  @ApiPropertyOptional({ description: 'Hiển thị tổng giảm giá' })
  @IsOptional()
  @IsBoolean()
  showTotalDiscount?: boolean;

  @ApiPropertyOptional({ description: 'Nhãn tổng giảm giá' })
  @IsOptional()
  @IsString()
  totalDiscountLabel?: string;

  // Legacy (backwards compatibility)
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showDiscount?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showDiscountPercent?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showServiceFee?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showVat?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showVatDetails?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showPriceBeforeVat?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showPriceAfterVat?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vatLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priceBeforeVatLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priceAfterVatLabel?: string;

  // Payment
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showPaymentMethod?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showReceivedAmount?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showChangeAmount?: boolean;

  // Footer
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showQrCode?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qrCodeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qrCodeContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showBarcode?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thankYouMessage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comebackMessage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  footerText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showWifiInfo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wifiName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wifiPassword?: string;

  // Style
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  paperWidth?: number;

  @ApiPropertyOptional({ description: 'Cỡ chữ: extra_small, small, normal, large, extra_large' })
  @IsOptional()
  @IsString()
  fontSize?: string;

  @ApiPropertyOptional({ description: 'Khoảng cách dòng (0.3-1.0)' })
  @IsOptional()
  @IsNumber()
  lineSpacing?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  separatorChar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  doubleSeparatorChar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  cutPaper?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  openCashDrawer?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  beepAfterPrint?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  numberOfCopies?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

/**
 * UpdateBillTemplateDto - Sử dụng PartialType để tất cả fields từ CreateBillTemplateDto trở thành optional
 * Điều này cho phép cập nhật từng field riêng lẻ mà không cần gửi toàn bộ
 */
export class UpdateBillTemplateDto extends PartialType(CreateBillTemplateDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
