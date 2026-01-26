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
  // BeFood specific fields
  email?: string;
  phoneNumber?: string;
  userType?: number;
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
  // BeFood specific fields
  merchantId?: string;
  merchantName?: string;
  rating?: number;
  reviewCount?: number;
  storeImage?: string;
  payMode?: number;
  autoAccept?: boolean;
}

/**
 * Raw Order from Platform
 */
export interface RawFoodOrder {
  externalOrderId: string;
  orderCode: string;
  platform: FoodPlatformType;
  status: string;

  // Customer info
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerNote?: string;

  items: RawFoodOrderItem[];

  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  discount: number;
  totalAmount: number;

  // Additional fee fields for GrabFood
  smallOrderFee?: number;
  itemDiscountAmount?: number;
  promotionAmount?: number;

  isPaid: boolean;
  paymentMethod?: string;

  // Driver info
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverAvatar?: string;
  driverLicensePlate?: string;
  estimatedDeliveryTime?: string;

  createdAt: Date;
  updatedAt: Date;

  // Additional timestamp fields
  acceptedAt?: Date;
  readyAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;

  // Order status message
  orderContentMessage?: string;

  // Scheduled order info (đơn đặt trước)
  isScheduledOrder?: boolean;
  scheduledDeliveryTime?: string;

  // Combined order info (đơn ghép)
  isCombinedOrder?: boolean;
  parentOrderId?: string;
  subOrders?: RawFoodSubOrder[];

  rawData?: Record<string, unknown>;
}

/**
 * Raw Order Item with discounts and modifiers
 */
export interface RawFoodOrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  note?: string;
  options?: string;
  externalProductId?: string;

  // Discount info for item
  discounts?: RawItemDiscount[];
  discountAmount?: number; // Calculated total discount for this item

  // Modifiers/Options detailed
  modifierGroups?: RawModifierGroup[];
  modifiers?: SimplifiedModifier[]; // Simplified modifiers for storage

  // Techres mapping (for future integration)
  techresProductId?: number;
  techresBrandId?: number;
}

/**
 * Simplified Modifier for storage
 */
export interface SimplifiedModifier {
  groupName: string;
  modifierName: string;
  price: number;
  quantity?: number;
}

/**
 * Item Discount info
 */
export interface RawItemDiscount {
  discountName: string;
  discountFunding?: string;
  discountAmount: number;
}

/**
 * Modifier Group (topping, size, etc.)
 */
export interface RawModifierGroup {
  groupId: string;
  groupName: string;
  modifiers: RawModifier[];
}

/**
 * Single Modifier/Option
 */
export interface RawModifier {
  modifierId: string;
  modifierName: string;
  price: number;
}

/**
 * Sub Order for combined orders (đơn ghép)
 */
export interface RawFoodSubOrder {
  subOrderId: string;
  displayId: string;
  isFirstSubOrder: boolean;
  driverName?: string;
  driverPhone?: string;
  items: RawFoodOrderItem[];
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
 * GrabFood Pagination Order Item
 */
export interface GrabPaginationOrderItem {
  itemID: string;
  name: string;
  quantity: number;
  weight?: number | null;
}

/**
 * GrabFood Pagination Order
 */
export interface GrabPaginationOrder {
  orderID: string;
  displayID: string;
  driver: {
    ID: number;
    name: string;
    avatar: string;
  };
  eater: {
    ID: number;
    name: string;
  };
  itemInfo: {
    count: number;
    items: GrabPaginationOrderItem[];
  };
  times: {
    createdAt: string;
    deliveredAt: string | null;
    completedAt: string | null;
    expiredAt: string;
    acceptedAt: string | null;
    cancelledAt: string | null;
    readyAt: string | null;
    displayedAt: string;
    driverArriveRestoAt: string | null;
    preparationCompletedAt: string | null;
  };
  state: string;
  deliveryTaskpoolStatus: string;
  preparationTaskpoolStatus: string;
  scheduleOrderInfo: {
    isScheduledOrder: boolean;
    expectedDeliveryTime: string | null;
    pickupTime: string | null;
  };
  orderValue: string;
  preparationTaskID: string;
  labels: {
    acceptedViaCall: boolean;
    isRead: boolean;
    isOrderEdited: boolean;
    acceptedViaAA: boolean;
    hasPromo: boolean;
    isTakeawayOrder: boolean;
    isDeliverByMex: boolean;
    isBusyModeOrder: boolean;
    printCount: number;
    isGiftOrder: boolean;
  };
  mcorInfo: {
    supportMcor: boolean;
    isEditable: boolean;
    correctedOrderReadyAt: string | null;
    estimatedOrderReadyAt: string;
    driverCloseToPickingUp: boolean;
    maxOrderReadyAt: string;
  };
  orderContentMessage: string;
}

/**
 * GrabFood Orders Pagination Response
 */
export interface GrabOrdersPaginationResponse {
  success: boolean;
  orderStats?: {
    unreadNumberInNew: number;
    unreadAANumberInPrepare: number;
    unreadViaCallNumberInPrepare: number;
    numberInNew: number;
    numberInPrepare: number;
    numberInReady: number;
    numberInDelivering: number;
  };
  orders: GrabPaginationOrder[];
  pollInterval: number;
  nextRequestTimestamp?: string;
  hasMore: boolean;
  serverTime?: string;
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
