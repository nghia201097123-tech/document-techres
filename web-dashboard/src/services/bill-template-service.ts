import api from './api';

// ==================== ENUMS ====================

export enum BillTemplateType {
  CLASSIC = 'classic',
  MODERN = 'modern',
  COMPACT = 'compact',
  DETAILED = 'detailed',
  PREMIUM = 'premium',
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
  branchId: string;
  branch?: {
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
  showItemCode: boolean;
  showItemNote: boolean;
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
  branchId: string;
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
  showItemCode?: boolean;
  showItemNote?: boolean;
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

export interface CreateBillPrinterConfigDto {
  branchId: string;
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
  // Bill Templates
  getAllTemplates: async (brandId: string): Promise<BillTemplate[]> => {
    const response = await api.get(`/bill-templates?brandId=${brandId}`);
    return response.data;
  },

  getTemplatesByBranch: async (branchId: string): Promise<BillTemplate[]> => {
    const response = await api.get(`/bill-templates/branch/${branchId}`);
    return response.data;
  },

  getTemplate: async (id: string): Promise<BillTemplate> => {
    const response = await api.get(`/bill-templates/${id}`);
    return response.data;
  },

  createTemplate: async (brandId: string, data: CreateBillTemplateDto): Promise<BillTemplate> => {
    const response = await api.post(`/bill-templates?brandId=${brandId}`, data);
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
};

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
  { value: 'small', label: 'Nhỏ' },
  { value: 'normal', label: 'Bình thường' },
  { value: 'large', label: 'Lớn' },
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
  showItemCode: false,
  showItemNote: true,
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
