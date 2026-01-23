import api from './api';

// ==================== ENUMS ====================

export enum BillTemplateType {
  CLASSIC = 'classic',
  MODERN = 'modern',
  COMPACT = 'compact',
  DETAILED = 'detailed',
  PREMIUM = 'premium',
}

// Kiểu hiển thị danh sách món ăn
export enum ItemDisplayLayout {
  STANDARD = 'standard',           // Chuẩn: Tên món - SL x Đơn giá = Thành tiền
  COMPACT = 'compact',             // Thu gọn: Tên món x SL = Thành tiền (1 dòng)
  DETAILED = 'detailed',           // Chi tiết: Mã + Tên + Ghi chú + Đơn giá + SL + Thành tiền
  TWO_LINE = 'two_line',           // 2 dòng: Dòng 1: Tên món, Dòng 2: SL x Đơn giá = Thành tiền
  PRICE_RIGHT = 'price_right',     // Giá bên phải: Tên món căn trái, giá căn phải
  WITH_INDEX = 'with_index',       // Có số thứ tự: STT. Tên món - SL x Đơn giá
  GROUPED = 'grouped',             // Nhóm theo danh mục
  GRID_2_COL = 'grid_2_col',       // Grid 2 cột
  MINIMAL = 'minimal',             // Tối giản: chỉ tên và tổng tiền
  DOTTED = 'dotted',               // Dấu chấm: Tên món.......Giá
  BOXED = 'boxed',                 // Có viền: mỗi món trong 1 khung
  TABLE = 'table',                 // Dạng bảng: có header cột
  TABLE_STT = 'table_stt',         // Bảng có STT: STT | Món | SL | Giá
  TABLE_QTY_FIRST = 'table_qty_first', // Bảng SL đầu: SL | Món | Giá
  TABLE_FULL = 'table_full',       // Bảng đầy đủ: STT | Món | SL | Đơn giá | T.Tiền
}

export enum PrinterConnectionType {
  NETWORK = 'network',
  BLUETOOTH = 'bluetooth',
  USB = 'usb',
  SUNMI = 'sunmi',
}

// ==================== TYPES ====================

export interface BillTemplate {
  id: string;
  tenantId: string;
  brandId: string;
  brand?: {
    id: string;
    name: string;
  };
  name: string;
  templateType: BillTemplateType;
  description?: string;

  // Header config
  showLogo: boolean;
  logoUrl?: string;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  taxCode?: string;
  headerText?: string;

  // Content config
  billTitle: string;
  showOrderNumber: boolean;
  showTableName: boolean;
  showStaffName: boolean;
  showCustomerName: boolean;
  showDateTime: boolean;
  dateFormat: string;

  // Time tracking config
  showCheckInTime?: boolean;
  showCheckOutTime?: boolean;
  checkInLabel?: string;
  checkOutLabel?: string;

  // Items config
  itemDisplayLayout: ItemDisplayLayout;
  showItemCode: boolean;
  showItemNote: boolean;
  showOrderNote: boolean;
  showUnitPrice: boolean;
  showQuantity: boolean;

  // Price config
  showSubtotal: boolean;

  // Discount config (4 loại giảm giá)
  showItemDiscount: boolean;         // 1. Hiển thị giảm giá trên từng món
  showTotalItemDiscount: boolean;    // Hiển thị tổng giảm giá các món
  itemDiscountLabel?: string;        // Nhãn giảm giá món

  showBillDiscount?: boolean;        // 2. Hiển thị giảm giá hóa đơn
  billDiscountLabel?: string;        // Nhãn giảm giá hóa đơn

  showCouponDiscount?: boolean;      // 3. Hiển thị giảm giá coupon
  couponDiscountLabel?: string;      // Nhãn coupon

  showVoucherDiscount?: boolean;     // 4. Hiển thị giảm giá voucher
  voucherDiscountLabel?: string;     // Nhãn voucher

  showTotalDiscount?: boolean;       // Tổng giảm giá
  totalDiscountLabel?: string;       // Nhãn tổng giảm giá

  showDiscount: boolean;             // Deprecated - giữ lại để tương thích ngược
  showDiscountPercent: boolean;
  showServiceFee: boolean;
  showVat: boolean;
  showVatDetails: boolean;
  showPriceBeforeVat: boolean;
  showPriceAfterVat: boolean;
  vatLabel: string;
  priceBeforeVatLabel: string;
  priceAfterVatLabel: string;

  // Payment config
  showPaymentMethod: boolean;
  showReceivedAmount: boolean;
  showChangeAmount: boolean;

  // Footer config
  showQrCode: boolean;
  qrCodeType: string;
  qrCodeContent?: string;
  showBarcode: boolean;
  thankYouMessage: string;
  comebackMessage: string;
  footerText?: string;
  showWifiInfo: boolean;
  wifiName?: string;
  wifiPassword?: string;

  // Style config
  paperWidth: number;
  fontSize: string;
  lineSpacing: number;
  separatorChar: string;
  doubleSeparatorChar: string;
  cutPaper: boolean;
  openCashDrawer: boolean;
  beepAfterPrint: boolean;
  numberOfCopies: number;

  // Status
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BillPrinterConfig {
  id: string;
  tenantId: string;
  branchId: string;
  branch?: {
    id: string;
    name: string;
  };
  name: string;
  description?: string;

  // Connection config
  connectionType: PrinterConnectionType;
  printerIp?: string;
  printerPort: number;
  printerMac?: string;
  printerUsbPath?: string;

  // Template config
  templateId?: string;
  template?: BillTemplate;

  // Print config
  paperWidth: number;
  autoPrintOnPayment: boolean;
  printPreview: boolean;
  numberOfCopies: number;
  cutPaper: boolean;
  openCashDrawer: boolean;
  beepAfterPrint: boolean;

  // Retry config
  retryCount: number;
  retryDelayMs: number;
  connectionTimeoutMs: number;

  // Status
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ==================== DTOs ====================

export interface CreateBillTemplateDto {
  brandId: string;
  name: string;
  templateType: BillTemplateType;
  description?: string;

  // Header
  showLogo?: boolean;
  logoUrl?: string;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  taxCode?: string;
  headerText?: string;

  // Content
  billTitle?: string;
  showOrderNumber?: boolean;
  showTableName?: boolean;
  showStaffName?: boolean;
  showCustomerName?: boolean;
  showDateTime?: boolean;
  dateFormat?: string;

  // Time tracking
  showCheckInTime?: boolean;
  showCheckOutTime?: boolean;
  checkInLabel?: string;
  checkOutLabel?: string;

  // Items
  itemDisplayLayout?: ItemDisplayLayout;
  showItemCode?: boolean;
  showItemNote?: boolean;
  showOrderNote?: boolean;
  showUnitPrice?: boolean;
  showQuantity?: boolean;

  // Price
  showSubtotal?: boolean;

  // Discount config (4 loại giảm giá)
  showItemDiscount?: boolean;       // 1. Hiển thị giảm giá trên từng món
  showTotalItemDiscount?: boolean;  // Hiển thị tổng giảm giá các món
  itemDiscountLabel?: string;       // Nhãn giảm giá món

  showBillDiscount?: boolean;       // 2. Hiển thị giảm giá hóa đơn
  billDiscountLabel?: string;       // Nhãn giảm giá hóa đơn

  showCouponDiscount?: boolean;     // 3. Hiển thị giảm giá coupon
  couponDiscountLabel?: string;     // Nhãn coupon

  showVoucherDiscount?: boolean;    // 4. Hiển thị giảm giá voucher
  voucherDiscountLabel?: string;    // Nhãn voucher

  showTotalDiscount?: boolean;      // Tổng giảm giá
  totalDiscountLabel?: string;      // Nhãn tổng giảm giá

  // Legacy
  showDiscount?: boolean;
  showDiscountPercent?: boolean;
  showServiceFee?: boolean;
  showVat?: boolean;
  showVatDetails?: boolean;
  showPriceBeforeVat?: boolean;
  showPriceAfterVat?: boolean;
  vatLabel?: string;
  priceBeforeVatLabel?: string;
  priceAfterVatLabel?: string;

  // Payment
  showPaymentMethod?: boolean;
  showReceivedAmount?: boolean;
  showChangeAmount?: boolean;

  // Footer
  showQrCode?: boolean;
  qrCodeType?: string;
  qrCodeContent?: string;
  showBarcode?: boolean;
  thankYouMessage?: string;
  comebackMessage?: string;
  footerText?: string;
  showWifiInfo?: boolean;
  wifiName?: string;
  wifiPassword?: string;

  // Style
  paperWidth?: number;
  fontSize?: string;
  lineSpacing?: number;
  separatorChar?: string;
  doubleSeparatorChar?: string;
  cutPaper?: boolean;
  openCashDrawer?: boolean;
  beepAfterPrint?: boolean;
  numberOfCopies?: number;

  sortOrder?: number;
}

export interface UpdateBillTemplateDto extends Partial<CreateBillTemplateDto> {
  isActive?: boolean;
  isDefault?: boolean;
}

/**
 * DTO cho Printer Config - Xây dựng ở cấp chi nhánh (Branch)
 */
export interface CreateBillPrinterConfigDto {
  branchId: string;  // Bắt buộc - Máy in thuộc về chi nhánh
  name: string;
  description?: string;

  connectionType: PrinterConnectionType;
  printerIp?: string;
  printerPort?: number;
  printerMac?: string;
  printerUsbPath?: string;

  templateId?: string;

  paperWidth?: number;
  autoPrintOnPayment?: boolean;
  printPreview?: boolean;
  numberOfCopies?: number;
  cutPaper?: boolean;
  openCashDrawer?: boolean;
  beepAfterPrint?: boolean;

  retryCount?: number;
  retryDelayMs?: number;
  connectionTimeoutMs?: number;

  sortOrder?: number;
}

export interface UpdateBillPrinterConfigDto extends Partial<CreateBillPrinterConfigDto> {
  isActive?: boolean;
  isDefault?: boolean;
}

// ==================== SERVICE ====================

export const billTemplateService = {
  // ==================== BILL TEMPLATES (Brand Level) ====================

  /**
   * Lấy tất cả templates
   */
  getAllTemplates: async (): Promise<BillTemplate[]> => {
    const response = await api.get(`/bill-templates`);
    return response.data;
  },

  /**
   * Lấy templates theo thương hiệu (brand)
   * Mẫu in bill được xây dựng ở cấp thương hiệu
   */
  getTemplatesByBrand: async (brandId: string): Promise<BillTemplate[]> => {
    const response = await api.get(`/bill-templates/brand/${brandId}`);
    return response.data;
  },

  getTemplate: async (id: string): Promise<BillTemplate> => {
    const response = await api.get(`/bill-templates/${id}`);
    return response.data;
  },

  /**
   * Tạo template mới cho thương hiệu
   */
  createTemplate: async (data: CreateBillTemplateDto): Promise<BillTemplate> => {
    const response = await api.post(`/bill-templates`, data);
    return response.data;
  },

  updateTemplate: async (id: string, data: UpdateBillTemplateDto): Promise<BillTemplate> => {
    const response = await api.put(`/bill-templates/${id}`, data);
    return response.data;
  },

  toggleTemplate: async (id: string): Promise<BillTemplate> => {
    const response = await api.patch(`/bill-templates/${id}/toggle`);
    return response.data;
  },

  setDefaultTemplate: async (id: string): Promise<BillTemplate> => {
    const response = await api.patch(`/bill-templates/${id}/set-default`);
    return response.data;
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await api.delete(`/bill-templates/${id}`);
  },

  // ==================== PRINTER CONFIGS (Branch Level) ====================

  // Bill Printer Configs
  getAllPrinterConfigs: async (brandId: string): Promise<BillPrinterConfig[]> => {
    const response = await api.get(`/bill-printer-configs?brandId=${brandId}`);
    return response.data;
  },

  getPrinterConfigsByBranch: async (branchId: string): Promise<BillPrinterConfig[]> => {
    const response = await api.get(`/bill-printer-configs/branch/${branchId}`);
    return response.data;
  },

  getPrinterConfig: async (id: string): Promise<BillPrinterConfig> => {
    const response = await api.get(`/bill-printer-configs/${id}`);
    return response.data;
  },

  createPrinterConfig: async (brandId: string, data: CreateBillPrinterConfigDto): Promise<BillPrinterConfig> => {
    const response = await api.post(`/bill-printer-configs?brandId=${brandId}`, data);
    return response.data;
  },

  updatePrinterConfig: async (id: string, data: UpdateBillPrinterConfigDto): Promise<BillPrinterConfig> => {
    const response = await api.put(`/bill-printer-configs/${id}`, data);
    return response.data;
  },

  togglePrinterConfig: async (id: string): Promise<BillPrinterConfig> => {
    const response = await api.patch(`/bill-printer-configs/${id}/toggle`);
    return response.data;
  },

  setDefaultPrinterConfig: async (id: string): Promise<BillPrinterConfig> => {
    const response = await api.patch(`/bill-printer-configs/${id}/set-default`);
    return response.data;
  },

  deletePrinterConfig: async (id: string): Promise<void> => {
    await api.delete(`/bill-printer-configs/${id}`);
  },

  testPrinterConnection: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/bill-printer-configs/${id}/test`);
    return response.data;
  },

  getPrinterConfigByTemplateId: async (templateId: string): Promise<BillPrinterConfig | null> => {
    try {
      const response = await api.get(`/bill-printer-configs/by-template/${templateId}`);
      return response.data;
    } catch {
      return null;
    }
  },
};

// ==================== COMBINED FORM TYPE ====================
// For UI purposes - combines template and printer config fields
export interface BillTemplateWithPrinterForm extends CreateBillTemplateDto {
  // Printer config fields (for UI form state, not sent to template API)
  connectionType?: PrinterConnectionType;
  printerIp?: string;
  printerPort?: number;
  printerMac?: string;
  printerUsbPath?: string;
  autoPrintOnPayment?: boolean;
  printPreview?: boolean;
  retryCount?: number;
  retryDelayMs?: number;
  connectionTimeoutMs?: number;
}

// ==================== LABELS ====================

export const BILL_TEMPLATE_TYPE_LABELS: Record<BillTemplateType, string> = {
  [BillTemplateType.CLASSIC]: 'Truyền thống',
  [BillTemplateType.MODERN]: 'Hiện đại',
  [BillTemplateType.COMPACT]: 'Thu gọn',
  [BillTemplateType.DETAILED]: 'Chi tiết VAT',
  [BillTemplateType.PREMIUM]: 'Cao cấp',
};

export const BILL_TEMPLATE_TYPE_DESCRIPTIONS: Record<BillTemplateType, string> = {
  [BillTemplateType.CLASSIC]: 'Mẫu bill truyền thống với đầy đủ thông tin',
  [BillTemplateType.MODERN]: 'Mẫu hiện đại, tối giản',
  [BillTemplateType.COMPACT]: 'Mẫu thu gọn, tiết kiệm giấy',
  [BillTemplateType.DETAILED]: 'Hiển thị chi tiết VAT từng món',
  [BillTemplateType.PREMIUM]: 'Mẫu cao cấp với logo và QR code',
};

export const PRINTER_CONNECTION_TYPE_LABELS: Record<PrinterConnectionType, string> = {
  [PrinterConnectionType.NETWORK]: 'Mạng (TCP/IP)',
  [PrinterConnectionType.BLUETOOTH]: 'Bluetooth',
  [PrinterConnectionType.USB]: 'USB',
  [PrinterConnectionType.SUNMI]: 'Sunmi Built-in',
};

export const ITEM_DISPLAY_LAYOUT_LABELS: Record<ItemDisplayLayout, string> = {
  [ItemDisplayLayout.STANDARD]: 'Chuẩn',
  [ItemDisplayLayout.COMPACT]: 'Thu gọn',
  [ItemDisplayLayout.DETAILED]: 'Chi tiết',
  [ItemDisplayLayout.TWO_LINE]: '2 dòng',
  [ItemDisplayLayout.PRICE_RIGHT]: 'Giá bên phải',
  [ItemDisplayLayout.WITH_INDEX]: 'Có STT',
  [ItemDisplayLayout.GROUPED]: 'Nhóm danh mục',
  [ItemDisplayLayout.GRID_2_COL]: 'Grid 2 cột',
  [ItemDisplayLayout.MINIMAL]: 'Tối giản',
  [ItemDisplayLayout.DOTTED]: 'Dấu chấm',
  [ItemDisplayLayout.BOXED]: 'Có viền',
  [ItemDisplayLayout.TABLE]: 'Dạng bảng',
  [ItemDisplayLayout.TABLE_STT]: 'Bảng có STT',
  [ItemDisplayLayout.TABLE_QTY_FIRST]: 'Bảng SL đầu',
  [ItemDisplayLayout.TABLE_FULL]: 'Bảng đầy đủ',
};

export const ITEM_DISPLAY_LAYOUT_DESCRIPTIONS: Record<ItemDisplayLayout, string> = {
  [ItemDisplayLayout.STANDARD]: 'Tên món - SL x Đơn giá = Thành tiền',
  [ItemDisplayLayout.COMPACT]: 'Tên món x SL = Thành tiền (tiết kiệm giấy)',
  [ItemDisplayLayout.DETAILED]: 'Hiển thị đầy đủ: Mã, Tên, Ghi chú, Giá',
  [ItemDisplayLayout.TWO_LINE]: 'Dòng 1: Tên, Dòng 2: Chi tiết giá',
  [ItemDisplayLayout.PRICE_RIGHT]: 'Tên căn trái, giá căn phải',
  [ItemDisplayLayout.WITH_INDEX]: '1. Tên món - SL x Đơn giá',
  [ItemDisplayLayout.GROUPED]: 'Nhóm món theo danh mục',
  [ItemDisplayLayout.GRID_2_COL]: 'Hiển thị món theo dạng lưới 2 cột',
  [ItemDisplayLayout.MINIMAL]: 'Chỉ hiển thị tên món và tổng tiền',
  [ItemDisplayLayout.DOTTED]: 'Tên món.........Giá (kiểu menu)',
  [ItemDisplayLayout.BOXED]: 'Mỗi món trong 1 khung viền',
  [ItemDisplayLayout.TABLE]: 'Bảng với header: Món | SL | Giá',
  [ItemDisplayLayout.TABLE_STT]: 'Bảng có STT trước tên món',
  [ItemDisplayLayout.TABLE_QTY_FIRST]: 'Bảng có SL trước tên món',
  [ItemDisplayLayout.TABLE_FULL]: 'Bảng đầy đủ: STT, Món, SL, Đơn giá, Thành tiền',
};

// Preview examples for each layout
export const ITEM_DISPLAY_LAYOUT_EXAMPLES: Record<ItemDisplayLayout, string[]> = {
  [ItemDisplayLayout.STANDARD]: [
    'Phở bò tái - 2 x 45,000 = 90,000',
    'Trà đá        - 2 x  5,000 = 10,000',
  ],
  [ItemDisplayLayout.COMPACT]: [
    'Phở bò tái x2           90,000',
    'Trà đá x2               10,000',
  ],
  [ItemDisplayLayout.DETAILED]: [
    'PH001 - Phở bò tái',
    '  Ghi chú: Ít bánh',
    '  2 x 45,000 = 90,000',
  ],
  [ItemDisplayLayout.TWO_LINE]: [
    'Phở bò tái',
    '    2 x 45,000 = 90,000',
  ],
  [ItemDisplayLayout.PRICE_RIGHT]: [
    'Phở bò tái (x2)        90,000',
    'Trà đá (x2)            10,000',
  ],
  [ItemDisplayLayout.WITH_INDEX]: [
    '1. Phở bò tái - 2 x 45,000',
    '2. Trà đá - 2 x 5,000',
  ],
  [ItemDisplayLayout.GROUPED]: [
    '--- MÓN CHÍNH ---',
    'Phở bò tái x2         90,000',
    '--- ĐỒ UỐNG ---',
    'Trà đá x2             10,000',
  ],
  [ItemDisplayLayout.GRID_2_COL]: [
    '┌─────────┬─────────┐',
    '│Phở x2   │Trà x2   │',
    '│90,000   │10,000   │',
    '└─────────┴─────────┘',
  ],
  [ItemDisplayLayout.MINIMAL]: [
    'Phở bò tái         90,000',
    'Trà đá             10,000',
  ],
  [ItemDisplayLayout.DOTTED]: [
    'Phở bò tái x2.......90,000',
    'Trà đá x2...........10,000',
  ],
  [ItemDisplayLayout.BOXED]: [
    '╔═══════════════════╗',
    '║ Phở bò tái  90,000║',
    '╚═══════════════════╝',
  ],
  [ItemDisplayLayout.TABLE]: [
    'Món        | SL | Giá',
    '-----------|----|---------',
    'Phở bò tái |  2 | 90,000',
  ],
  [ItemDisplayLayout.TABLE_STT]: [
    'STT | Món        | SL | Giá',
    '----|------------|----|---------',
    '  1 | Phở bò tái |  2 | 90,000',
  ],
  [ItemDisplayLayout.TABLE_QTY_FIRST]: [
    'SL | Món        | Giá',
    '---|------------|---------',
    ' 2 | Phở bò tái | 90,000',
  ],
  [ItemDisplayLayout.TABLE_FULL]: [
    'STT | Món     | SL | Đ.Giá  | T.Tiền',
    '----|---------|----| -------|-------',
    '  1 | Phở tái |  2 | 45,000 | 90,000',
  ],
};

export const QR_CODE_TYPE_LABELS: Record<string, string> = {
  order_id: 'Mã đơn hàng',
  payment: 'Thanh toán',
  review: 'Đánh giá',
  custom: 'Tùy chỉnh',
};

export const PAPER_WIDTH_OPTIONS = [
  { value: 32, label: '32mm (1.25 inch) - Máy in nhãn nhỏ' },
  { value: 44, label: '44mm (1.75 inch) - Máy in di động nhỏ' },
  { value: 48, label: '48mm (1.9 inch) - Máy in di động' },
  { value: 57, label: '57mm (2.25 inch) - Máy in di động' },
  { value: 58, label: '58mm (2.25 inch) - Máy in POS nhỏ' },
  { value: 76, label: '76mm (3 inch) - Máy in POS trung' },
  { value: 80, label: '80mm (3.15 inch) - Máy in POS chuẩn' },
  { value: 110, label: '110mm (4.3 inch) - Máy in khổ rộng' },
  { value: 112, label: '112mm (4.4 inch) - Máy in khổ rộng' },
];

export const FONT_SIZE_OPTIONS = [
  { value: 'extra_small', label: 'Rất nhỏ' },
  { value: 'small', label: 'Nhỏ' },
  { value: 'normal', label: 'Bình thường' },
  { value: 'large', label: 'Lớn' },
  { value: 'extra_large', label: 'Rất lớn' },
];

// Bill font size type and scale values (similar to kitchen ticket)
export type BillFontSize = "extra_small" | "small" | "normal" | "large" | "extra_large";
export const BillFontScaleValues: Record<BillFontSize, number> = {
  extra_small: 0.7,
  small: 0.85,
  normal: 1.0,
  large: 1.2,
  extra_large: 1.4,
};

export const LINE_SPACING_OPTIONS = [
  { value: 0.3, label: '30% - Rất chặt' },
  { value: 0.5, label: '50% - Chặt' },
  { value: 0.7, label: '70% - Bình thường' },
  { value: 1.0, label: '100% - Rộng' },
];

export const DATE_FORMAT_OPTIONS = [
  { value: 'dd/MM/yyyy HH:mm', label: '31/12/2024 15:30' },
  { value: 'dd/MM/yyyy HH:mm:ss', label: '31/12/2024 15:30:45' },
  { value: 'dd-MM-yyyy HH:mm', label: '31-12-2024 15:30' },
  { value: 'yyyy-MM-dd HH:mm', label: '2024-12-31 15:30' },
];

// Default template values
export const DEFAULT_BILL_TEMPLATE: Partial<CreateBillTemplateDto> = {
  templateType: BillTemplateType.CLASSIC,
  showLogo: true,
  billTitle: 'HÓA ĐƠN BÁN HÀNG',
  showOrderNumber: true,
  showTableName: true,
  showStaffName: true,
  showCustomerName: true,
  showDateTime: true,
  dateFormat: 'dd/MM/yyyy HH:mm',
  // Time tracking
  showCheckInTime: false,
  showCheckOutTime: false,
  checkInLabel: 'Giờ vào',
  checkOutLabel: 'Giờ ra',
  // Items
  itemDisplayLayout: ItemDisplayLayout.STANDARD,
  showItemCode: false,
  showItemNote: true,
  showOrderNote: true,
  showUnitPrice: true,
  showQuantity: true,
  showSubtotal: true,
  // Discount config (4 loại)
  showItemDiscount: true,
  showTotalItemDiscount: true,
  itemDiscountLabel: 'Giảm giá món',
  showBillDiscount: true,
  billDiscountLabel: 'Giảm giá hóa đơn',
  showCouponDiscount: true,
  couponDiscountLabel: 'Mã giảm giá',
  showVoucherDiscount: true,
  voucherDiscountLabel: 'Voucher',
  showTotalDiscount: true,
  totalDiscountLabel: 'Tổng giảm giá',
  // Legacy
  showDiscount: true,
  showDiscountPercent: true,
  showServiceFee: true,
  showVat: true,
  showVatDetails: true,
  showPriceBeforeVat: true,
  showPriceAfterVat: true,
  vatLabel: 'VAT',
  priceBeforeVatLabel: 'Giá trước thuế',
  priceAfterVatLabel: 'Giá sau thuế',
  showPaymentMethod: true,
  showReceivedAmount: true,
  showChangeAmount: true,
  showQrCode: false,
  qrCodeType: 'order_id',
  showBarcode: false,
  thankYouMessage: 'Cảm ơn quý khách!',
  comebackMessage: 'Hẹn gặp lại!',
  showWifiInfo: false,
  paperWidth: 80,
  fontSize: 'normal',
  lineSpacing: 0.7,
  separatorChar: '-',
  doubleSeparatorChar: '=',
  cutPaper: true,
  openCashDrawer: false,
  beepAfterPrint: false,
  numberOfCopies: 1,
};

export const DEFAULT_PRINTER_CONFIG: Partial<CreateBillPrinterConfigDto> = {
  connectionType: PrinterConnectionType.NETWORK,
  printerPort: 9100,
  paperWidth: 80,
  autoPrintOnPayment: true,
  printPreview: false,
  numberOfCopies: 1,
  cutPaper: true,
  openCashDrawer: true,
  beepAfterPrint: true,
  retryCount: 3,
  retryDelayMs: 1000,
  connectionTimeoutMs: 5000,
};
