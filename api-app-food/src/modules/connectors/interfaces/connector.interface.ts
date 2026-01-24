import { FoodPlatformAccount, FoodPlatformType } from '@/database/entities';

/**
 * Login Credentials
 */
export interface LoginCredentials {
  username?: string;
  password?: string;
  phoneNumber?: string;
  otp?: string;
}

/**
 * Login Result
 */
export interface LoginResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number; // seconds
  merchantId?: string;
  merchantName?: string;
  error?: string;
  errorCode?: string;
  // Grab MEX specific fields
  grabId?: string;
  userProfileId?: string;
  merchantGrabId?: string;
  country?: string;
  cityId?: number;
}

/**
 * OTP Request Result
 */
export interface OtpRequestResult {
  success: boolean;
  sessionId?: string;
  expiresIn?: number; // seconds
  error?: string;
}

/**
 * Merchant Store from Platform
 */
export interface MerchantStore {
  externalStoreId: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
}

/**
 * Raw Order from Platform
 */
export interface RawFoodOrder {
  externalOrderId: string;
  orderCode: string;
  platform: FoodPlatformType;
  status: string;

  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerNote?: string;

  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    note?: string;
    options?: string;
    externalProductId?: string;
  }[];

  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  discount: number;
  totalAmount: number;

  isPaid: boolean;
  paymentMethod?: string;

  driverName?: string;
  driverPhone?: string;
  driverLicensePlate?: string;
  estimatedDeliveryTime?: string;

  createdAt: Date;
  updatedAt: Date;

  rawData?: Record<string, unknown>;
}

/**
 * Order Action Result
 */
export interface OrderActionResult {
  success: boolean;
  orderId: string;
  newStatus?: string;
  error?: string;
}

/**
 * Platform Connector Interface
 */
export interface IPlatformConnector {
  readonly platform: FoodPlatformType;

  /**
   * Login with username/password
   */
  login(credentials: LoginCredentials): Promise<LoginResult>;

  /**
   * Request OTP for phone authentication
   */
  requestOtp(phoneNumber: string): Promise<OtpRequestResult>;

  /**
   * Verify OTP
   */
  verifyOtp(sessionId: string, otp: string): Promise<LoginResult>;

  /**
   * Refresh access token
   */
  refreshToken(refreshToken: string): Promise<LoginResult>;

  /**
   * Get list of merchant stores
   */
  getStores(account: FoodPlatformAccount): Promise<MerchantStore[]>;

  /**
   * Poll orders from a specific store
   */
  pollOrders(
    account: FoodPlatformAccount,
    storeId: string,
    since?: Date,
  ): Promise<RawFoodOrder[]>;

  /**
   * Accept/Confirm an order
   */
  acceptOrder(account: FoodPlatformAccount, orderId: string): Promise<OrderActionResult>;

  /**
   * Mark order as ready for pickup
   */
  markReady(account: FoodPlatformAccount, orderId: string): Promise<OrderActionResult>;

  /**
   * Complete an order
   */
  completeOrder(account: FoodPlatformAccount, orderId: string): Promise<OrderActionResult>;

  /**
   * Cancel an order
   */
  cancelOrder(
    account: FoodPlatformAccount,
    orderId: string,
    reason: string,
  ): Promise<OrderActionResult>;
}
