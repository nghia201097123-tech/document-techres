import api from './api';

// ==================== ENUMS ====================

export enum PaymentMethodType {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  CREDIT_CARD = 'credit_card',
  E_WALLET = 'e_wallet',
  QR_CODE = 'qr_code',
}

export enum EInvoiceProvider {
  FPT = 'fpt',
  VNPT = 'vnpt',
  MISA = 'misa',
  VIETTEL = 'viettel',
  MIFI = 'mifi',
  INVOICE = 'invoice',
  HILO = 'hilo',
}

// ==================== TYPES ====================

export interface PaymentMethod {
  id: string;
  tenantId: string;
  brandId: string;
  name: string;
  type: PaymentMethodType;
  description?: string;
  iconUrl?: string;
  config?: Record<string, any>;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccount {
  id: string;
  tenantId: string;
  brandId: string;
  branchId?: string;
  branch?: {
    id: string;
    name: string;
  };
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  bankBin?: string;
  transferTemplate?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  apiKey?: string;
  apiSecret?: string;
  staticQrUrl?: string;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EInvoiceConfig {
  id: string;
  tenantId: string;
  brandId: string;
  branchId?: string;
  branch?: {
    id: string;
    name: string;
  };
  provider: EInvoiceProvider;
  taxCode: string;
  companyName: string;
  companyAddress?: string;
  invoiceTemplate?: string;
  invoiceSeries?: string;
  apiUrl?: string;
  apiUsername?: string;
  apiPassword?: string;
  apiToken?: string;
  config?: Record<string, any>;
  autoIssue: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VietQRResponse {
  qrUrl: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount?: number;
  description?: string;
}

// ==================== DTOs ====================

export interface CreatePaymentMethodDto {
  name: string;
  type: PaymentMethodType;
  description?: string;
  iconUrl?: string;
  config?: Record<string, any>;
  sortOrder?: number;
}

export interface UpdatePaymentMethodDto extends Partial<CreatePaymentMethodDto> {
  isActive?: boolean;
}

export interface CreateBankAccountDto {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  branchId?: string;
  bankBin?: string;
  transferTemplate?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  apiKey?: string;
  apiSecret?: string;
  isPrimary?: boolean;
}

export interface UpdateBankAccountDto extends Partial<CreateBankAccountDto> {
  isActive?: boolean;
}

export interface CreateEInvoiceConfigDto {
  provider: EInvoiceProvider;
  taxCode: string;
  companyName: string;
  companyAddress?: string;
  branchId?: string;
  invoiceTemplate?: string;
  invoiceSeries?: string;
  apiUrl?: string;
  apiUsername?: string;
  apiPassword?: string;
  apiToken?: string;
  config?: Record<string, any>;
  autoIssue?: boolean;
}

export interface UpdateEInvoiceConfigDto extends Partial<CreateEInvoiceConfigDto> {
  isActive?: boolean;
}

// ==================== SERVICE ====================

export const settingsService = {
  // Payment Methods
  getAllPaymentMethods: async (brandId: string): Promise<PaymentMethod[]> => {
    const response = await api.get(`/settings/payment-methods?brandId=${brandId}`);
    return response.data;
  },

  getPaymentMethod: async (id: string): Promise<PaymentMethod> => {
    const response = await api.get(`/settings/payment-methods/${id}`);
    return response.data;
  },

  createPaymentMethod: async (brandId: string, data: CreatePaymentMethodDto): Promise<PaymentMethod> => {
    const response = await api.post(`/settings/payment-methods?brandId=${brandId}`, data);
    return response.data;
  },

  updatePaymentMethod: async (id: string, data: UpdatePaymentMethodDto): Promise<PaymentMethod> => {
    const response = await api.put(`/settings/payment-methods/${id}`, data);
    return response.data;
  },

  togglePaymentMethod: async (id: string): Promise<PaymentMethod> => {
    const response = await api.patch(`/settings/payment-methods/${id}/toggle`);
    return response.data;
  },

  deletePaymentMethod: async (id: string): Promise<void> => {
    await api.delete(`/settings/payment-methods/${id}`);
  },

  // Bank Accounts
  getAllBankAccounts: async (brandId: string): Promise<BankAccount[]> => {
    const response = await api.get(`/settings/bank-accounts?brandId=${brandId}`);
    return response.data;
  },

  getBankAccount: async (id: string): Promise<BankAccount> => {
    const response = await api.get(`/settings/bank-accounts/${id}`);
    return response.data;
  },

  createBankAccount: async (brandId: string, data: CreateBankAccountDto): Promise<BankAccount> => {
    const response = await api.post(`/settings/bank-accounts?brandId=${brandId}`, data);
    return response.data;
  },

  updateBankAccount: async (id: string, data: UpdateBankAccountDto): Promise<BankAccount> => {
    const response = await api.put(`/settings/bank-accounts/${id}`, data);
    return response.data;
  },

  toggleBankAccount: async (id: string): Promise<BankAccount> => {
    const response = await api.patch(`/settings/bank-accounts/${id}/toggle`);
    return response.data;
  },

  deleteBankAccount: async (id: string): Promise<void> => {
    await api.delete(`/settings/bank-accounts/${id}`);
  },

  generateVietQR: async (id: string, amount?: number, description?: string): Promise<VietQRResponse> => {
    const params = new URLSearchParams();
    if (amount) params.append('amount', amount.toString());
    if (description) params.append('description', description);
    const response = await api.get(`/settings/bank-accounts/${id}/qr?${params.toString()}`);
    return response.data;
  },

  // E-Invoice Configs
  getAllEInvoiceConfigs: async (brandId: string): Promise<EInvoiceConfig[]> => {
    const response = await api.get(`/settings/einvoice-configs?brandId=${brandId}`);
    return response.data;
  },

  getEInvoiceConfig: async (id: string): Promise<EInvoiceConfig> => {
    const response = await api.get(`/settings/einvoice-configs/${id}`);
    return response.data;
  },

  createEInvoiceConfig: async (brandId: string, data: CreateEInvoiceConfigDto): Promise<EInvoiceConfig> => {
    const response = await api.post(`/settings/einvoice-configs?brandId=${brandId}`, data);
    return response.data;
  },

  updateEInvoiceConfig: async (id: string, data: UpdateEInvoiceConfigDto): Promise<EInvoiceConfig> => {
    const response = await api.put(`/settings/einvoice-configs/${id}`, data);
    return response.data;
  },

  toggleEInvoiceConfig: async (id: string): Promise<EInvoiceConfig> => {
    const response = await api.patch(`/settings/einvoice-configs/${id}/toggle`);
    return response.data;
  },

  deleteEInvoiceConfig: async (id: string): Promise<void> => {
    await api.delete(`/settings/einvoice-configs/${id}`);
  },
};

// Vietnamese bank list for VietQR
export const VIETNAM_BANKS = [
  { code: 'VCB', name: 'Vietcombank', bin: '970436' },
  { code: 'TCB', name: 'Techcombank', bin: '970407' },
  { code: 'BIDV', name: 'BIDV', bin: '970418' },
  { code: 'VTB', name: 'VietinBank', bin: '970415' },
  { code: 'ACB', name: 'ACB', bin: '970416' },
  { code: 'MBB', name: 'MB Bank', bin: '970422' },
  { code: 'VPB', name: 'VPBank', bin: '970432' },
  { code: 'TPB', name: 'TPBank', bin: '970423' },
  { code: 'STB', name: 'Sacombank', bin: '970403' },
  { code: 'HDB', name: 'HDBank', bin: '970437' },
  { code: 'VIB', name: 'VIB', bin: '970441' },
  { code: 'SHB', name: 'SHB', bin: '970443' },
  { code: 'EIB', name: 'Eximbank', bin: '970431' },
  { code: 'MSB', name: 'MSB', bin: '970426' },
  { code: 'OCB', name: 'OCB', bin: '970448' },
  { code: 'LPB', name: 'LienVietPostBank', bin: '970449' },
  { code: 'SCB', name: 'SCB', bin: '970429' },
  { code: 'BAB', name: 'Bac A Bank', bin: '970409' },
  { code: 'SEAB', name: 'SeABank', bin: '970440' },
  { code: 'ABB', name: 'ABBank', bin: '970425' },
  { code: 'NAB', name: 'Nam A Bank', bin: '970428' },
  { code: 'PGB', name: 'PGBank', bin: '970430' },
  { code: 'VIETBANK', name: 'VietBank', bin: '970433' },
  { code: 'VAB', name: 'VietABank', bin: '970427' },
  { code: 'KLB', name: 'Kienlongbank', bin: '970452' },
  { code: 'CAKE', name: 'CAKE by VPBank', bin: '546034' },
  { code: 'UBANK', name: 'Ubank by VPBank', bin: '546035' },
];

// E-Invoice provider labels
export const EINVOICE_PROVIDER_LABELS: Record<EInvoiceProvider, string> = {
  [EInvoiceProvider.FPT]: 'FPT E-Invoice',
  [EInvoiceProvider.VNPT]: 'VNPT E-Invoice',
  [EInvoiceProvider.MISA]: 'MISA meInvoice',
  [EInvoiceProvider.VIETTEL]: 'Viettel S-Invoice',
  [EInvoiceProvider.MIFI]: 'MIFI Invoice',
  [EInvoiceProvider.INVOICE]: 'Invoice.vn',
  [EInvoiceProvider.HILO]: 'Hilo Invoice',
};

// Payment method type labels
export const PAYMENT_METHOD_TYPE_LABELS: Record<PaymentMethodType, string> = {
  [PaymentMethodType.CASH]: 'Tiền mặt',
  [PaymentMethodType.BANK_TRANSFER]: 'Chuyển khoản',
  [PaymentMethodType.CREDIT_CARD]: 'Thẻ tín dụng',
  [PaymentMethodType.E_WALLET]: 'Ví điện tử',
  [PaymentMethodType.QR_CODE]: 'Mã QR',
};
