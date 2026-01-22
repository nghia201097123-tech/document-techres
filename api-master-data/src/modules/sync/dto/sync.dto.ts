import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class SyncQueryDto {
  @ApiPropertyOptional({ description: 'Lấy dữ liệu từ thời điểm này (incremental sync)' })
  @IsOptional()
  @IsDateString()
  since?: string;
}

export class CategoryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ nullable: true })
  imageUrl: string | null;

  @ApiProperty({ description: 'Loại sản phẩm: food, drink, other, combo' })
  productType: string;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class ProductDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true })
  categoryId: string | null;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true, description: 'Tên không dấu để tìm kiếm' })
  searchName: string | null;

  @ApiProperty({ nullable: true, description: 'Tên viết tắt để tìm kiếm nhanh (VD: "ccdc" cho "Cơm chiên dương châu")' })
  abbreviation: string | null;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ nullable: true })
  imageUrl: string | null;

  @ApiProperty()
  price: number;

  @ApiProperty()
  costPrice: number;

  @ApiProperty()
  vatRate: number;

  @ApiProperty({ nullable: true })
  unit: string | null;

  @ApiProperty()
  type: string;

  @ApiProperty()
  isAvailable: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  preparationTime: number;

  @ApiProperty()
  printToKitchen: boolean;

  @ApiProperty()
  printToBar: boolean;

  @ApiProperty({ nullable: true, description: 'Comma-separated kitchen IDs for print routing' })
  kitchenIds: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class AreaDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class TableDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true })
  areaId: string | null;

  @ApiProperty()
  name: string;

  @ApiProperty()
  capacity: number;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class StaffDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  phone: string | null;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty({ nullable: true })
  avatarUrl: string | null;

  @ApiProperty()
  pinCode: string;

  @ApiProperty()
  role: string;

  @ApiProperty({ nullable: true })
  permissions: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class BrandDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  logoUrl: string;

  @ApiProperty()
  isActive: boolean;
}

export class BranchDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  brandId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  storeCode: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  status: string;
}

export class BrandWithBranchesDto {
  @ApiProperty()
  brand: BrandDto;

  @ApiProperty({ type: [BranchDto] })
  branches: BranchDto[];
}

export class SeasonalPriceProductDto {
  @ApiProperty()
  productId: string;
}

export class SeasonalPriceDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  adjustmentType: string;

  @ApiProperty()
  adjustmentValue: number;

  @ApiProperty()
  startDate: string;

  @ApiProperty()
  endDate: string;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: [SeasonalPriceProductDto] })
  products: SeasonalPriceProductDto[];

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class CouponDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Loại: percentage (%), fixed (cố định)' })
  couponType: string;

  @ApiProperty({ description: 'Áp dụng cho: bill, item, category' })
  applyTo: string;

  @ApiProperty({ description: 'Kích hoạt: manual, auto' })
  activationType: string;

  @ApiProperty()
  discountValue: number;

  @ApiProperty({ nullable: true })
  maxDiscount: number | null;

  @ApiProperty()
  minOrderAmount: number;

  @ApiProperty({ description: 'Số lượng tối thiểu để áp dụng' })
  minQuantity: number;

  @ApiProperty({ nullable: true, description: 'Product IDs (khi applyTo=item)' })
  productIds: string[] | null;

  @ApiProperty({ nullable: true, description: 'Category IDs (khi applyTo=category)' })
  categoryIds: string[] | null;

  @ApiProperty({ description: 'Có thể kết hợp với coupon khác' })
  isCombinable: boolean;

  @ApiProperty({ description: 'Độ ưu tiên (số nhỏ = ưu tiên cao)' })
  priority: number;

  @ApiProperty({ nullable: true })
  usageLimit: number | null;

  @ApiProperty()
  usageCount: number;

  @ApiProperty({ nullable: true })
  dailyLimit: number | null;

  @ApiProperty()
  dailyUsageCount: number;

  @ApiProperty()
  requiresApproval: boolean;

  @ApiProperty({ nullable: true })
  approvalThreshold: number | null;

  @ApiProperty({ nullable: true })
  startDate: string | null;

  @ApiProperty({ nullable: true })
  endDate: string | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

// ============ Product Note DTOs ============

export class ProductNoteDto {
  @ApiProperty({ description: 'ID của ghi chú' })
  id: string;

  @ApiProperty({ description: 'Tên ghi chú' })
  name: string;

  @ApiProperty({ description: 'Mô tả', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Thứ tự sắp xếp' })
  sortOrder: number;

  @ApiProperty({ description: 'Còn hoạt động không' })
  isActive: boolean;

  @ApiProperty({ description: 'Danh sách product ID được gán ghi chú này', type: [String] })
  productIds: string[];

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

// ============ Topping Group DTOs ============

export class ToppingItemDto {
  @ApiProperty({ description: 'ID của topping item' })
  id: string;

  @ApiProperty({ description: 'Mã topping (vd: TOP2962)', nullable: true })
  code: string | null;

  @ApiProperty({ description: 'Tên topping (vd: Size S)' })
  name: string;

  @ApiProperty({ description: 'Giá thêm khi chọn topping này' })
  price: number;

  @ApiProperty({ description: 'Có phải mặc định không' })
  isDefault: boolean;

  @ApiProperty({ description: 'Số lượng tối đa có thể thêm' })
  maxQuantity: number;

  @ApiProperty({ description: 'Thứ tự sắp xếp' })
  sortOrder: number;

  @ApiProperty({ description: 'Còn hoạt động không' })
  isActive: boolean;
}

export class ToppingGroupDto {
  @ApiProperty({ description: 'ID của nhóm topping' })
  id: string;

  @ApiProperty({ description: 'Tên nhóm (vd: SIZE, ĐƯỜNG, ĐÁ, TOPPING)' })
  name: string;

  @ApiProperty({ description: 'Loại nhóm (size, sugar, ice, topping, other)' })
  groupType: string;

  @ApiProperty({ description: 'Bắt buộc phải chọn?' })
  isRequired: boolean;

  @ApiProperty({ description: 'Cho phép chọn nhiều?' })
  isMultiple: boolean;

  @ApiProperty({ description: 'Số tối thiểu cần chọn' })
  minSelect: number;

  @ApiProperty({ description: 'Số tối đa được chọn' })
  maxSelect: number;

  @ApiProperty({ description: 'Thứ tự sắp xếp' })
  sortOrder: number;

  @ApiProperty({ description: 'Còn hoạt động không' })
  isActive: boolean;

  @ApiProperty({ type: [ToppingItemDto], description: 'Danh sách topping trong nhóm' })
  toppings: ToppingItemDto[];

  @ApiProperty({ type: [String], description: 'Danh sách product ID được gán nhóm này', nullable: true })
  productIds: string[] | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class StaffBranchPermissionsSyncDto {
  @ApiProperty({ type: [BrandWithBranchesDto] })
  data: BrandWithBranchesDto[];

  @ApiProperty({ description: 'Chi nhánh mặc định của nhân viên' })
  defaultBranchId: string;

  @ApiProperty()
  syncedAt: string;
}

export class ComboItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'ID của sản phẩm combo (sản phẩm cha)' })
  comboId: string;

  @ApiProperty({ description: 'ID của sản phẩm con trong combo' })
  productId: string;

  @ApiProperty({ description: 'Tên sản phẩm con' })
  productName: string;

  @ApiProperty({ nullable: true, description: 'Mã sản phẩm con' })
  productCode: string | null;

  @ApiProperty({ description: 'Số lượng sản phẩm con trong combo' })
  quantity: number;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isActive: boolean;
}

// ============ Kitchen DTOs ============

export class KitchenDto {
  @ApiProperty({ description: 'ID của bếp' })
  id: string;

  @ApiProperty({ description: 'Tên bếp' })
  name: string;

  @ApiProperty({ description: 'Loại bếp', nullable: true })
  kitchenType: string | null;

  @ApiProperty({ description: 'Tên máy in', nullable: true })
  printerName: string | null;

  @ApiProperty({ description: 'IP máy in', nullable: true })
  printerIp: string | null;

  @ApiProperty({ description: 'Port máy in', nullable: true })
  printerPort: number | null;

  @ApiProperty({ description: 'Loại máy in: ESC_POS (máy in bill), TSPL (máy in tem)', nullable: true })
  printerProtocol: string | null;

  @ApiProperty({ description: 'Khổ giấy', nullable: true })
  paperWidth: number | null;

  @ApiProperty({ description: 'Chế độ in: TICKET, LABEL, BOTH', nullable: true })
  printMode: string | null;

  @ApiProperty({ description: 'Độ đậm in (0-15, cho máy in TSPL)' })
  printDensity: number;

  @ApiProperty({ description: 'Mô tả', nullable: true })
  description: string | null;

  // ========== TICKET PRINTING CONFIG ==========
  @ApiProperty({ description: 'Cắt giấy sau khi in phiếu' })
  ticketCutAfterPrint: boolean;

  @ApiProperty({ description: 'In từng món riêng biệt' })
  ticketPrintItemsSeparately: boolean;

  @ApiProperty({ description: 'Số bản in phiếu' })
  ticketCopies: number;

  @ApiProperty({ description: 'In số đơn hàng trên phiếu bếp' })
  ticketPrintOrderNumber: boolean;

  @ApiProperty({ description: 'In tên bàn trên phiếu bếp' })
  ticketPrintTableName: boolean;

  @ApiProperty({ description: 'In thời gian trên phiếu bếp' })
  ticketPrintTime: boolean;

  @ApiProperty({ description: 'In tên cửa hàng trên phiếu bếp' })
  ticketPrintStoreName: boolean;

  @ApiProperty({ description: 'Tên cửa hàng trên phiếu bếp', nullable: true })
  ticketStoreName: string | null;

  @ApiProperty({ description: 'In ghi chú trên phiếu bếp' })
  ticketPrintNotes: boolean;

  @ApiProperty({ description: 'Cỡ chữ phiếu bếp: small, medium, large' })
  ticketFontSize: string;

  @ApiProperty({ description: 'In giá món trên phiếu bếp' })
  ticketPrintPrice: boolean;

  // ========== LABEL SIZE CONFIG ==========
  @ApiProperty({ description: 'Chiều rộng tem (mm)' })
  labelWidthMm: number;

  @ApiProperty({ description: 'Chiều cao tem (mm)' })
  labelHeightMm: number;

  @ApiProperty({ description: 'Khoảng cách giữa các tem (mm)' })
  labelGapMm: number;

  @ApiProperty({ description: 'Hệ số scale font (0.5 - 2.0)' })
  labelFontScale: number;

  @ApiProperty({ description: 'Số topping tối đa trên tem (0 = auto)' })
  labelMaxToppings: number;

  // ========== LABEL PRINTING CONFIG ==========
  @ApiProperty({ description: 'In giá trên tem' })
  labelPrintPrice: boolean;

  @ApiProperty({ description: 'In tên cửa hàng trên tem' })
  labelPrintStoreName: boolean;

  @ApiProperty({ description: 'In mã đơn hàng trên tem' })
  labelPrintOrderNumber: boolean;

  @ApiProperty({ description: 'In tên bàn trên tem' })
  labelPrintTableName: boolean;

  @ApiProperty({ description: 'In thời gian trên tem' })
  labelPrintTime: boolean;

  @ApiProperty({ description: 'Tên cửa hàng hiển thị trên tem', nullable: true })
  labelStoreName: string | null;

  @ApiProperty({ description: 'Đảo chiều in tem (180°)' })
  labelReverse: boolean;

  @ApiProperty({ description: 'Thứ tự sắp xếp' })
  sortOrder: number;

  @ApiProperty({ description: 'Còn hoạt động không' })
  isActive: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

// ============ Bill Template DTOs ============

export class BillTemplateDto {
  @ApiProperty({ description: 'ID của mẫu bill' })
  id: string;

  @ApiProperty({ description: 'Tên mẫu' })
  name: string;

  @ApiProperty({ description: 'Loại mẫu: classic, modern, compact, detailed, premium' })
  templateType: string;

  @ApiProperty({ description: 'Mô tả', nullable: true })
  description: string | null;

  // Header config
  @ApiProperty({ description: 'Hiển thị logo' })
  showLogo: boolean;

  @ApiProperty({ description: 'URL logo', nullable: true })
  logoUrl: string | null;

  @ApiProperty({ description: 'Tên cửa hàng' })
  storeName: string;

  @ApiProperty({ description: 'Địa chỉ cửa hàng', nullable: true })
  storeAddress: string | null;

  @ApiProperty({ description: 'Số điện thoại', nullable: true })
  storePhone: string | null;

  @ApiProperty({ description: 'Mã số thuế', nullable: true })
  taxCode: string | null;

  @ApiProperty({ description: 'Text header tùy chỉnh', nullable: true })
  headerText: string | null;

  // Content config
  @ApiProperty({ description: 'Tiêu đề hóa đơn' })
  billTitle: string;

  @ApiProperty()
  showOrderNumber: boolean;

  @ApiProperty()
  showTableName: boolean;

  @ApiProperty()
  showStaffName: boolean;

  @ApiProperty()
  showCustomerName: boolean;

  @ApiProperty()
  showDateTime: boolean;

  @ApiProperty({ description: 'Định dạng ngày giờ' })
  dateFormat: string;

  // Time tracking config
  @ApiProperty({ description: 'Hiển thị giờ vào' })
  showCheckInTime: boolean;

  @ApiProperty({ description: 'Hiển thị giờ ra' })
  showCheckOutTime: boolean;

  @ApiProperty({ description: 'Nhãn giờ vào' })
  checkInLabel: string;

  @ApiProperty({ description: 'Nhãn giờ ra' })
  checkOutLabel: string;

  // Items config
  @ApiProperty()
  showItemCode: boolean;

  @ApiProperty()
  showItemNote: boolean;

  @ApiProperty({ description: 'Hiển thị ghi chú đơn hàng' })
  showOrderNote: boolean;

  @ApiProperty()
  showUnitPrice: boolean;

  @ApiProperty()
  showQuantity: boolean;

  // Price config - VAT details
  @ApiProperty()
  showSubtotal: boolean;

  // Discount config (4 loại giảm giá)
  @ApiProperty({ description: 'Hiển thị giảm giá trên từng món' })
  showItemDiscount: boolean;

  @ApiProperty({ description: 'Hiển thị tổng giảm giá các món' })
  showTotalItemDiscount: boolean;

  @ApiProperty({ description: 'Nhãn giảm giá món' })
  itemDiscountLabel: string;

  @ApiProperty({ description: 'Hiển thị giảm giá hóa đơn' })
  showBillDiscount: boolean;

  @ApiProperty({ description: 'Nhãn giảm giá hóa đơn' })
  billDiscountLabel: string;

  @ApiProperty({ description: 'Hiển thị giảm giá coupon' })
  showCouponDiscount: boolean;

  @ApiProperty({ description: 'Nhãn giảm giá coupon' })
  couponDiscountLabel: string;

  @ApiProperty({ description: 'Hiển thị giảm giá voucher' })
  showVoucherDiscount: boolean;

  @ApiProperty({ description: 'Nhãn giảm giá voucher' })
  voucherDiscountLabel: string;

  @ApiProperty({ description: 'Hiển thị tổng giảm giá' })
  showTotalDiscount: boolean;

  @ApiProperty({ description: 'Nhãn tổng giảm giá' })
  totalDiscountLabel: string;

  // Legacy discount (backwards compatibility)
  @ApiProperty()
  showDiscount: boolean;

  @ApiProperty()
  showDiscountPercent: boolean;

  @ApiProperty()
  showServiceFee: boolean;

  @ApiProperty()
  showVat: boolean;

  @ApiProperty({ description: 'Hiển thị chi tiết VAT (giá trước/sau)' })
  showVatDetails: boolean;

  @ApiProperty({ description: 'Hiển thị giá trước VAT' })
  showPriceBeforeVat: boolean;

  @ApiProperty({ description: 'Hiển thị giá sau VAT' })
  showPriceAfterVat: boolean;

  @ApiProperty({ description: 'Nhãn VAT' })
  vatLabel: string;

  @ApiProperty({ description: 'Nhãn giá trước thuế' })
  priceBeforeVatLabel: string;

  @ApiProperty({ description: 'Nhãn giá sau thuế' })
  priceAfterVatLabel: string;

  // Payment config
  @ApiProperty()
  showPaymentMethod: boolean;

  @ApiProperty()
  showReceivedAmount: boolean;

  @ApiProperty()
  showChangeAmount: boolean;

  // Footer config
  @ApiProperty()
  showQrCode: boolean;

  @ApiProperty({ description: 'Loại QR: order_id, payment, review, custom' })
  qrCodeType: string;

  @ApiProperty({ description: 'Nội dung QR tùy chỉnh', nullable: true })
  qrCodeContent: string | null;

  @ApiProperty()
  showBarcode: boolean;

  @ApiProperty({ description: 'Lời cảm ơn' })
  thankYouMessage: string;

  @ApiProperty({ description: 'Lời chào tạm biệt' })
  comebackMessage: string;

  @ApiProperty({ description: 'Text footer tùy chỉnh', nullable: true })
  footerText: string | null;

  @ApiProperty()
  showWifiInfo: boolean;

  @ApiProperty({ nullable: true })
  wifiName: string | null;

  @ApiProperty({ nullable: true })
  wifiPassword: string | null;

  // Style config
  @ApiProperty({ description: 'Độ rộng giấy (58 hoặc 80)' })
  paperWidth: number;

  @ApiProperty({ description: 'Cỡ chữ: extra_small, small, normal, large, extra_large' })
  fontSize: string;

  @ApiProperty({ description: 'Khoảng cách dòng (0.3-1.0)' })
  lineSpacing: number;

  @ApiProperty()
  separatorChar: string;

  @ApiProperty()
  doubleSeparatorChar: string;

  @ApiProperty()
  cutPaper: boolean;

  @ApiProperty()
  openCashDrawer: boolean;

  @ApiProperty()
  beepAfterPrint: boolean;

  @ApiProperty()
  numberOfCopies: number;

  // Status
  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

// ============ Surcharge DTOs ============

export class SurchargeDto {
  @ApiProperty({ description: 'ID của phụ thu' })
  id: string;

  @ApiProperty({ description: 'Tên phụ thu' })
  name: string;

  @ApiProperty({ description: 'Mô tả', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Số tiền phụ thu (đã gồm VAT)' })
  amount: number;

  @ApiProperty({ description: 'Thuế VAT (%)' })
  vatRate: number;

  @ApiProperty({ description: 'Thứ tự sắp xếp' })
  sortOrder: number;

  @ApiProperty({ description: 'Còn hoạt động không' })
  isActive: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

// ============ Bill Printer Config DTOs ============

export class BillPrinterConfigDto {
  @ApiProperty({ description: 'ID cấu hình' })
  id: string;

  @ApiProperty({ description: 'Tên máy in (VD: Quầy thu ngân 1)' })
  name: string;

  @ApiProperty({ description: 'Mô tả', nullable: true })
  description: string | null;

  // Connection config
  @ApiProperty({ description: 'Loại kết nối: network, bluetooth, usb, sunmi' })
  connectionType: string;

  @ApiProperty({ description: 'IP máy in', nullable: true })
  printerIp: string | null;

  @ApiProperty({ description: 'Port máy in' })
  printerPort: number;

  @ApiProperty({ description: 'MAC address (Bluetooth)', nullable: true })
  printerMac: string | null;

  @ApiProperty({ description: 'USB path', nullable: true })
  printerUsbPath: string | null;

  // Template config
  @ApiProperty({ description: 'ID mẫu bill', nullable: true })
  templateId: string | null;

  // Print config
  @ApiProperty({ description: 'Độ rộng giấy' })
  paperWidth: number;

  @ApiProperty({ description: 'Cỡ chữ: extra_small, small, normal, large, extra_large' })
  fontSize: string;

  @ApiProperty({ description: 'Khoảng cách dòng (0.3-1.0)' })
  lineSpacing: number;

  @ApiProperty({ description: 'Tự động in khi thanh toán' })
  autoPrintOnPayment: boolean;

  @ApiProperty({ description: 'Xem trước khi in' })
  printPreview: boolean;

  @ApiProperty({ description: 'Số bản in' })
  numberOfCopies: number;

  @ApiProperty()
  cutPaper: boolean;

  @ApiProperty()
  openCashDrawer: boolean;

  @ApiProperty()
  beepAfterPrint: boolean;

  // Retry config
  @ApiProperty({ description: 'Số lần thử lại' })
  retryCount: number;

  @ApiProperty({ description: 'Thời gian chờ giữa các lần thử (ms)' })
  retryDelayMs: number;

  @ApiProperty({ description: 'Timeout kết nối (ms)' })
  connectionTimeoutMs: number;

  // Status
  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

// Bank Account DTO for sync
export class BankAccountDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  bankCode: string;

  @ApiProperty()
  bankName: string;

  @ApiProperty()
  bankBin: string | null;

  @ApiProperty()
  accountNumber: string;

  @ApiProperty()
  accountName: string;

  @ApiProperty()
  transferTemplate: string | null;

  @ApiProperty()
  staticQrUrl: string | null;

  // PayOS Integration
  @ApiProperty({ nullable: true, description: 'Payment partner: payos or null' })
  paymentPartner: string | null;

  @ApiProperty({ nullable: true })
  payosClientId: string | null;

  @ApiProperty({ nullable: true })
  payosApiKey: string | null;

  @ApiProperty({ nullable: true })
  payosChecksumKey: string | null;

  @ApiProperty()
  isPrimary: boolean;

  @ApiProperty()
  isActive: boolean;
}

export class FullSyncDataDto {
  @ApiProperty({ type: [CategoryDto] })
  categories: CategoryDto[];

  @ApiProperty({ type: [ProductDto] })
  products: ProductDto[];

  @ApiProperty({ type: [AreaDto] })
  areas: AreaDto[];

  @ApiProperty({ type: [TableDto] })
  tables: TableDto[];

  @ApiProperty({ type: [StaffDto] })
  staff: StaffDto[];

  @ApiProperty({ type: [KitchenDto], description: 'Danh sách bếp' })
  kitchens: KitchenDto[];

  @ApiProperty({ type: [SeasonalPriceDto] })
  seasonalPrices: SeasonalPriceDto[];

  @ApiProperty({ type: [CouponDto] })
  coupons: CouponDto[];

  @ApiProperty({ type: [ToppingGroupDto], description: 'Danh sách nhóm topping với các product được gán' })
  toppingGroups: ToppingGroupDto[];

  @ApiProperty({ type: [ProductNoteDto], description: 'Danh sách ghi chú món ăn' })
  productNotes: ProductNoteDto[];

  @ApiProperty({ type: [ComboItemDto], description: 'Danh sách các món trong combo' })
  comboItems: ComboItemDto[];

  @ApiProperty({ type: [BillTemplateDto], description: 'Danh sách mẫu bill' })
  billTemplates: BillTemplateDto[];

  @ApiProperty({ type: [BillPrinterConfigDto], description: 'Cấu hình máy in bill' })
  billPrinterConfigs: BillPrinterConfigDto[];

  @ApiProperty({ type: [SurchargeDto], description: 'Danh sách phụ thu' })
  surcharges: SurchargeDto[];

  @ApiProperty({ type: [BankAccountDto], description: 'Danh sách tài khoản ngân hàng thanh toán' })
  bankAccounts: BankAccountDto[];
}

export class FullSyncResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ type: FullSyncDataDto, nullable: true })
  data: FullSyncDataDto | null;

  @ApiProperty()
  syncTime: string;

  @ApiProperty({ nullable: true })
  message: string | null;
}

export class IncrementalSyncResponseDto {
  @ApiProperty({ type: [CategoryDto] })
  categories: CategoryDto[];

  @ApiProperty({ type: [ProductDto] })
  products: ProductDto[];

  @ApiProperty({ type: [AreaDto] })
  areas: AreaDto[];

  @ApiProperty({ type: [TableDto] })
  tables: TableDto[];

  @ApiProperty({ type: [StaffDto] })
  staff: StaffDto[];

  @ApiProperty({ type: [SeasonalPriceDto] })
  seasonalPrices: SeasonalPriceDto[];

  @ApiProperty({ type: [CouponDto] })
  coupons: CouponDto[];

  @ApiProperty({ description: 'IDs của các bản ghi đã bị xóa' })
  deletedIds: {
    categories: string[];
    products: string[];
    areas: string[];
    tables: string[];
    staff: string[];
    seasonalPrices: string[];
    coupons: string[];
  };

  @ApiProperty()
  syncedAt: string;
}
