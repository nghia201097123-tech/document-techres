import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { FoodPlatformAccount, FoodPlatformType } from '../../database/entities';
import { BasePlatformConnector } from './base.connector';
import {
  LoginCredentials,
  LoginResult,
  OtpRequestResult,
  MerchantStore,
  RawFoodOrder,
  RawFoodOrderItem,
  RawFoodSubOrder,
  RawItemDiscount,
  RawModifierGroup,
  OrderActionResult,
  GrabPaginationOrder,
  GrabOrdersPaginationResponse,
  OrdersPaginationResponse,
} from './interfaces/connector.interface';

/**
 * GrabFood Status Mapping
 * Returns the raw Grab status for storage in merchantStatus column
 * The worker will map these to MerchantOrderStatus enum
 *
 * Grab API statuses:
 * - ORDER_IN_PREPARE: Đang xử lý
 * - ORDER_EXECUTING: Đang giao
 * - COMPLETED: Hoàn tất
 * - CANCELLED, CANCELLED_MAX, CANCELLED_PASSENGER, CANCELLED_OPERATOR, FAILED: Huỷ
 */
const GRAB_STATUS_MAP: Record<string, string> = {
  // Trạng thái đang xử lý
  'ORDER_NEW': 'ORDER_IN_PREPARE',
  'ORDER_IN_PREPARE': 'ORDER_IN_PREPARE',
  'ORDER_READY': 'ORDER_IN_PREPARE',
  // Trạng thái đang giao
  'ORDER_EXECUTING': 'ORDER_EXECUTING',
  'ORDER_IN_DELIVERY': 'ORDER_EXECUTING',
  // Trạng thái hoàn tất
  'ORDER_DELIVERED': 'COMPLETED',
  'COMPLETED': 'COMPLETED',
  // Trạng thái huỷ - giữ nguyên để lưu chi tiết
  'ORDER_CANCELLED': 'CANCELLED',
  'CANCELLED': 'CANCELLED',
  'CANCELLED_MAX': 'CANCELLED_MAX',
  'CANCELLED_PASSENGER': 'CANCELLED_PASSENGER',
  'CANCELLED_OPERATOR': 'CANCELLED_OPERATOR',
  'FAILED': 'FAILED',
};

/**
 * Format Vietnamese phone number
 * Converts "+84 9362 5425 7" to "0936254257"
 */
function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';

  // Remove all spaces and special characters
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Handle +84 prefix
  if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('84') && cleaned.length > 10) {
    cleaned = '0' + cleaned.substring(2);
  }

  return cleaned;
}

/**
 * Parse Vietnamese currency string to number
 * Converts "246.500" to 246500
 */
function parseCurrency(value: string | null | undefined): number {
  if (!value) return 0;
  return parseInt(value.replace(/\./g, ''), 10) || 0;
}

/**
 * GrabFood Platform Connector
 * Uses Grab Merchant Experience (MEX) API for authentication
 */
@Injectable()
export class GrabConnector extends BasePlatformConnector {
  readonly platform = FoodPlatformType.GRAB;

  // Hardcoded MEX API base URL
  private static readonly GRAB_MEX_API_URL = 'https://api.grab.com/mex-app';

  constructor(configService: ConfigService) {
    super(configService, GrabConnector.GRAB_MEX_API_URL);
  }

  /**
   * Login with username/password via Grab MEX API
   * Endpoint: POST /troy/user-profile/v1/login
   */
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    const requestUrl = '/troy/user-profile/v1/login';
    const requestBody = {
      login_source: 'TROY_APP_MAIN_USERNAME_PASSWORD',
      session_data: {
        mobile_session_data: {
          device_model: 'iPhone 13',
          device_id: '',
          device_brand: '',
        },
      },
      without_force_logout: false,
      password: credentials.password,
      username: credentials.username,
    };

    // Use hardcoded URL directly to avoid any config issues
    const fullUrl = `${GrabConnector.GRAB_MEX_API_URL}${requestUrl}`;
    this.logger.log(`[GrabFood Login] Attempting login for user: ${credentials.username}`);
    this.logger.log(`[GrabFood Login] URL: ${fullUrl}`);
    this.logger.log(`[GrabFood Login] Request body: ${JSON.stringify(requestBody)}`);

    try {
      // Use standalone axios to match cURL behavior exactly (avoid base connector interceptors)
      const response = await axios.post(
        fullUrl,
        requestBody,
        {
          headers: {
            'User-Agent': 'Grab Merchant/4.126.0 (ios 16.7.10; Build 102734851)',
            'mex-country': 'VN',
            'x-currency': 'VND',
            'Content-Type': 'application/json',
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
          },
          timeout: 30000,
        },
      );

      const responseData = response.data;

      this.logger.log(`[GrabFood Login] Response status: ${response.status}`);
      this.logger.debug('[GrabFood Login] Response data:', JSON.stringify(responseData, null, 2));

      // Check if login was successful - handle both direct response and wrapped response
      // Direct response format: { success: true, data: { jwt: '...' } }
      // Wrapped response format: { data: { success: true, data: { jwt: '...' } } }
      const isDirectResponse = responseData?.success !== undefined;
      const successCheck = isDirectResponse ? responseData?.success : responseData?.data?.success;
      const loginData = isDirectResponse ? responseData?.data : responseData?.data?.data;

      this.logger.log(`[GrabFood Login] isDirectResponse: ${isDirectResponse}, successCheck: ${successCheck}, hasJwt: ${!!loginData?.jwt}`);

      if (successCheck && loginData?.jwt) {
        const userProfile = loginData.user_profile;

        this.logger.log(`[GrabFood Login] SUCCESS - merchantId: ${userProfile?.grab_food_entity_id}`);

        return {
          success: true,
          accessToken: loginData.jwt,
          refreshToken: loginData.jwt, // Grab MEX uses JWT as both access and refresh
          expiresIn: 540000000, // JWT has long expiry (~17 years based on sample)
          merchantId: userProfile?.grab_food_entity_id || userProfile?.parent_entity_id,
          merchantName: userProfile?.first_name
            ? `${userProfile.first_name} ${userProfile.last_name || ''}`.trim()
            : userProfile?.username,
          // Additional user profile data
          grabId: userProfile?.grab_id,
          userProfileId: loginData.user_profile_id,
          merchantGrabId: loginData.merchant_grab_id,
          country: loginData.country,
          cityId: loginData.city_id,
        };
      }

      // Login failed - extract error message from response
      const errorMsg = isDirectResponse
        ? (responseData?.message || responseData?.error?.message)
        : (responseData?.data?.message || responseData?.data?.error?.message);

      this.logger.warn(`[GrabFood Login] FAILED - ${errorMsg || 'Unknown error'}`);

      return {
        success: false,
        error: errorMsg || 'Đăng nhập thất bại',
        errorCode: 'INVALID_CREDENTIALS',
      };
    } catch (error: any) {
      this.logger.error(`[GrabFood Login] EXCEPTION: ${error?.message}`);
      this.logger.error(`[GrabFood Login] Error response status: ${error?.response?.status}`);
      this.logger.error(`[GrabFood Login] Error response data: ${JSON.stringify(error?.response?.data)}`);

      // Extract error message from response if available - handle multiple formats
      const errData = error?.response?.data;
      const errorMessage = errData?.message
        || errData?.data?.message
        || errData?.error?.message
        || errData?.data?.error?.message
        || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin đăng nhập.';

      return {
        success: false,
        error: errorMessage,
        errorCode: errData?.error?.code || errData?.code || 'INVALID_CREDENTIALS',
      };
    }
  }

  /**
   * Request OTP (Grab uses username/password, not OTP)
   */
  async requestOtp(_phoneNumber: string): Promise<OtpRequestResult> {
    return {
      success: false,
      error: 'GrabFood không hỗ trợ đăng nhập bằng OTP',
    };
  }

  /**
   * Verify OTP (not supported)
   */
  async verifyOtp(_sessionId: string, _otp: string): Promise<LoginResult> {
    return {
      success: false,
      error: 'GrabFood không hỗ trợ đăng nhập bằng OTP',
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<LoginResult> {
    try {
      const clientId = this.configService.get<string>('platform.grab.clientId');
      const clientSecret = this.configService.get<string>('platform.grab.clientSecret');

      const response = await this.httpClient.post('/auth/refresh', {
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      });

      const data = response.data;

      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresIn: data.expires_in,
      };
    } catch (error) {
      this.logger.error('GrabFood refresh token failed', error);
      return {
        success: false,
        error: 'Refresh token thất bại',
        errorCode: 'TOKEN_REFRESH_FAILED',
      };
    }
  }

  /**
   * Get list of merchant stores using unified-profile API
   * Endpoint: GET /troy/user-profile/v1/unified-profile
   */
  async getStores(account: FoodPlatformAccount): Promise<MerchantStore[]> {
    try {
      const response = await this.httpClient.get(
        '/troy/user-profile/v1/unified-profile',
        {
          params: { isBalanceNeeded: false },
          headers: {
            'x-mts-ssid': account.accessToken,
            'x-user-type': 'user-profile',
          },
        },
      );

      const responseData = response.data;
      const stores: MerchantStore[] = [];

      // Extract store info from grab_food_store_profile
      const storeProfile = responseData?.data?.grab_food_store_profile?.storeProfile;
      if (storeProfile) {
        stores.push({
          externalStoreId: storeProfile.storeID,
          name: storeProfile.storeName,
          address: storeProfile.storeLocation?.address,
          phone: storeProfile.storePIC?.outletPhone,
          email: storeProfile.storePIC?.outletEmail,
          isActive: storeProfile.status === 'ACTIVE',
        });
      }

      // Also check grab_food_profile.merchant for additional store info
      const merchant = responseData?.data?.grab_food_profile?.merchant;
      if (merchant && !stores.find(s => s.externalStoreId === merchant.ID)) {
        stores.push({
          externalStoreId: merchant.ID,
          name: merchant.name,
          address: merchant.address,
          phone: merchant.mobileNumber || merchant.contractNumber,
          email: merchant.email,
          isActive: merchant.status === 'ACTIVE',
        });
      }

      this.logger.debug('GrabFood get stores result:', JSON.stringify(stores));

      return stores;
    } catch (error: any) {
      this.logger.error('GrabFood get stores failed');
      this.logger.error(`Error message: ${error?.message}`);
      this.logger.error(`Error response status: ${error?.response?.status}`);

      // Check for 401 errors (both direct axios error and transformed error)
      const is401 = error?.response?.status === 401 ||
        error?.message?.includes('UNAUTHORIZED') ||
        error?.message?.includes('401') ||
        error?.message?.includes('Token expired');

      this.logger.log(`Is 401 error: ${is401}`);

      if (is401) {
        this.logger.log('Throwing UnauthorizedException...');
        throw new UnauthorizedException('Token hết hạn hoặc không hợp lệ');
      }

      // For other errors, return empty array
      return [];
    }
  }

  /**
   * Get menu from GrabFood
   * Endpoint: GET https://api.grab.com/food/merchant/v2/menu
   * Note: Menu API uses different domain (api.grab.com/food) than MEX API (api.grab.com/mex-app)
   */
  async getMenu(account: FoodPlatformAccount): Promise<any> {
    try {
      this.logger.debug('[GrabConnector] Fetching menu from api.grab.com/food...');

      // Menu API uses different base URL and Authorization header
      const response = await axios.get(
        'https://api.grab.com/food/merchant/v2/menu',
        {
          headers: {
            'Authorization': account.accessToken,
            'x-user-type': 'user-profile',
          },
          timeout: 30000,
        },
      );

      const menuData = response.data?.data || response.data;
      this.logger.debug(`[GrabConnector] Got menu with ${menuData?.categories?.length || 0} categories`);

      return {
        categories: menuData.categories || [],
        modifierGroups: menuData.modifierGroups || [],
        sellingTimes: menuData.sellingTimes || [],
      };
    } catch (error: any) {
      this.logger.error('GrabFood get menu failed');
      this.logger.error(`Error message: ${error?.message}`);
      this.logger.error(`Error response status: ${error?.response?.status}`);

      // Check for 401 errors
      const is401 = error?.response?.status === 401 ||
        error?.message?.includes('UNAUTHORIZED') ||
        error?.message?.includes('401') ||
        error?.message?.includes('Token expired');

      if (is401) {
        this.logger.log('Throwing UnauthorizedException for getMenu...');
        throw new UnauthorizedException('Token hết hạn hoặc không hợp lệ');
      }

      // For other errors, return empty menu
      return {
        categories: [],
        modifierGroups: [],
        sellingTimes: [],
      };
    }
  }

  /**
   * Poll orders from a specific store (old API)
   */
  async pollOrders(
    account: FoodPlatformAccount,
    storeId: string,
    since?: Date,
  ): Promise<RawFoodOrder[]> {
    try {
      const params: Record<string, unknown> = {
        storeID: storeId,
        status: 'NEW,ACCEPTED,PREPARING,READY_FOR_PICKUP,DRIVER_ASSIGNED,DRIVER_ARRIVED,PICKED_UP',
        limit: 50,
      };

      if (since) {
        params.updatedSince = since.toISOString();
      }

      const response = await this.authenticatedRequest<{ orders: any[] }>(
        account,
        'get',
        '/orders',
        undefined,
        params,
      );

      return response.orders.map((order) => this.transformOrder(order));
    } catch (error) {
      this.logger.error('GrabFood poll orders failed', error);
      return [];
    }
  }

  // Hardcoded Grab Food API URL for orders
  private static readonly GRAB_FOOD_API_URL = 'https://api.grab.com/food/merchant/v3';

  /**
   * Poll orders using pagination API (new API - called by CCB every 5s)
   * Endpoint: GET https://api.grab.com/food/merchant/v3/orders-pagination
   * Note: This is a Grab-specific method, not part of IPlatformConnector interface
   */
  async fetchGrabOrdersPagination(
    account: FoodPlatformAccount,
    pageType: 'New' | 'Preparing' | 'Ready' | 'Delivering' = 'Preparing',
    autoAcceptGroup: number = 3,
  ): Promise<GrabOrdersPaginationResponse> {
    const url = `${GrabConnector.GRAB_FOOD_API_URL}/orders-pagination`;

    this.logger.log(`[GrabFood Orders] Fetching orders from ${url} with pageType=${pageType}`);

    try {
      const response = await axios.get(url, {
        params: {
          autoAcceptGroup,
          pageType,
        },
        headers: {
          'Authorization': account.accessToken,
          'Accept': '*/*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
        },
        timeout: 30000,
      });

      const data = response.data;
      this.logger.log(`[GrabFood Orders] Got ${data.orders?.length || 0} orders, pollInterval=${data.pollInterval}s`);

      return {
        success: true,
        orderStats: data.orderStats,
        orders: data.orders || [],
        pollInterval: data.pollInterval || 60,
        nextRequestTimestamp: data.nextRequestTimestamp,
        hasMore: data.hasMore || false,
        serverTime: data.serverTime,
      };
    } catch (error: any) {
      this.logger.error(`[GrabFood Orders] EXCEPTION: ${error?.message}`);
      this.logger.error(`[GrabFood Orders] Error status: ${error?.response?.status}`);

      // Check for 401 errors
      if (error?.response?.status === 401) {
        throw new UnauthorizedException('Token hết hạn hoặc không hợp lệ');
      }

      return {
        success: false,
        orders: [],
        pollInterval: 60,
        hasMore: false,
        error: error?.message || 'Lấy đơn hàng thất bại',
      };
    }
  }

  /**
   * Fetch orders using pagination API - Returns standardized OrdersPaginationResponse
   * Implements IPlatformConnector.fetchOrdersPagination
   * This is the method that should be called from PublicController
   */
  async fetchOrdersPaginationStandard(
    account: FoodPlatformAccount,
    pageType: string = 'Preparing',
  ): Promise<OrdersPaginationResponse> {
    const validPageType = ['New', 'Preparing', 'Ready', 'Delivering'].includes(pageType)
      ? pageType as 'New' | 'Preparing' | 'Ready' | 'Delivering'
      : 'Preparing';

    const grabResponse = await this.fetchGrabOrdersPagination(account, validPageType);

    if (!grabResponse.success) {
      return {
        success: false,
        orders: [],
        pollInterval: grabResponse.pollInterval,
        hasMore: grabResponse.hasMore,
        error: grabResponse.error,
      };
    }

    // Transform Grab orders to standardized RawFoodOrder format
    const transformedOrders = grabResponse.orders.map((grabOrder) =>
      this.transformPaginationOrder(grabOrder),
    );

    return {
      success: true,
      orders: transformedOrders,
      pollInterval: grabResponse.pollInterval,
      hasMore: grabResponse.hasMore,
      orderStats: grabResponse.orderStats ? {
        newCount: grabResponse.orderStats.numberInNew || 0,
        preparingCount: grabResponse.orderStats.numberInPrepare || 0,
        readyCount: grabResponse.orderStats.numberInReady || 0,
        deliveringCount: grabResponse.orderStats.numberInDelivering || 0,
      } : undefined,
    };
  }

  /**
   * Transform Grab pagination order to RawFoodOrder format
   */
  transformPaginationOrder(grabOrder: GrabPaginationOrder): RawFoodOrder {
    // Parse order value (e.g., "246.500" -> 246500)
    const orderValue = parseCurrency(grabOrder.orderValue);

    return {
      externalOrderId: grabOrder.orderID,
      orderCode: grabOrder.displayID || `#GR${grabOrder.orderID.slice(-6)}`,
      platform: FoodPlatformType.GRAB,
      status: this.mapGrabStatus(grabOrder.state),

      // Customer info
      customerId: grabOrder.eater?.ID?.toString() || undefined,
      customerName: grabOrder.eater?.name || 'Khách hàng',
      customerPhone: '', // Not available in pagination response - need detail API
      customerAddress: '', // Not available in pagination response - need detail API
      customerNote: '',

      items: (grabOrder.itemInfo?.items || []).map((item) => ({
        productName: item.name,
        quantity: item.quantity,
        unitPrice: 0, // Not available in pagination response
        totalPrice: 0,
        note: '',
        options: '',
        externalProductId: item.itemID,
      })),

      subtotal: orderValue,
      deliveryFee: 0,
      platformFee: 0,
      discount: 0,
      totalAmount: orderValue,

      isPaid: true, // Assuming online payment
      paymentMethod: 'GrabPay',

      // Driver info
      driverId: grabOrder.driver?.ID?.toString() || undefined,
      driverName: grabOrder.driver?.name || undefined,
      driverAvatar: grabOrder.driver?.avatar || undefined,
      driverPhone: undefined,
      driverLicensePlate: undefined,
      estimatedDeliveryTime: grabOrder.scheduleOrderInfo?.expectedDeliveryTime || grabOrder.times?.deliveredAt || undefined,

      createdAt: grabOrder.times?.createdAt ? new Date(grabOrder.times.createdAt) : new Date(),
      updatedAt: new Date(),

      // Additional fields from pagination response
      acceptedAt: grabOrder.times?.acceptedAt ? new Date(grabOrder.times.acceptedAt) : undefined,
      readyAt: grabOrder.times?.readyAt ? new Date(grabOrder.times.readyAt) : undefined,
      completedAt: grabOrder.times?.completedAt ? new Date(grabOrder.times.completedAt) : undefined,
      cancelledAt: grabOrder.times?.cancelledAt ? new Date(grabOrder.times.cancelledAt) : undefined,

      // Order status message
      orderContentMessage: grabOrder.orderContentMessage || undefined,

      // Scheduled order info (đơn đặt trước)
      isScheduledOrder: grabOrder.scheduleOrderInfo?.isScheduledOrder || false,
      scheduledDeliveryTime: grabOrder.scheduleOrderInfo?.expectedDeliveryTime || undefined,

      rawData: grabOrder as unknown as Record<string, unknown>,
    };
  }

  /**
   * Map GrabFood status to MerchantOrderStatus string
   * Implements IPlatformConnector.mapStatusToTechRes
   */
  mapStatusToTechRes(platformStatus: string): string {
    return GRAB_STATUS_MAP[platformStatus] || 'ORDER_IN_PREPARE';
  }

  /**
   * Map GrabFood status to standard status (internal use)
   */
  private mapGrabStatus(state: string): string {
    return this.mapStatusToTechRes(state);
  }

  /**
   * Fetch order detail from GrabFood API
   * Endpoint: GET https://api.grab.com/food/merchant/v3/orders/{orderID}
   * Includes retry logic for temporary server errors (502, 503)
   */
  async fetchOrderDetail(
    account: FoodPlatformAccount,
    orderId: string,
    displayId?: string,
  ): Promise<RawFoodOrder | null> {
    const url = `${GrabConnector.GRAB_FOOD_API_URL}/orders/${orderId}`;
    const maxRetries = 2;
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Wait before retry (exponential backoff: 500ms, 1000ms)
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
          this.logger.log(`[GrabFood OrderDetail] Retry attempt ${attempt} for order ${orderId}`);
        }

        const response = await axios.get(url, {
          headers: {
            'Authorization': account.accessToken,
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
          },
          timeout: 30000,
        });

        const orderData = response.data?.order || response.data;
        this.logger.log(`[GrabFood OrderDetail] Got order ${orderData?.orderID}`);

        return this.transformOrderDetail(orderData, displayId);
      } catch (error: any) {
        lastError = error;
        const status = error?.response?.status;

        // Don't retry for auth errors
        if (status === 401) {
          throw new UnauthorizedException('Token hết hạn hoặc không hợp lệ');
        }

        // Retry for temporary server errors (502, 503, 504)
        if ([502, 503, 504].includes(status) && attempt < maxRetries) {
          this.logger.warn(`[GrabFood OrderDetail] Server error ${status} for order ${orderId}, will retry...`);
          continue;
        }

        this.logger.error(`[GrabFood OrderDetail] EXCEPTION: ${error?.message} (status: ${status})`);
        break;
      }
    }

    return null;
  }

  /**
   * Transform detailed order from API response
   * Handles both normal orders and combined orders (đơn ghép)
   */
  private transformOrderDetail(orderData: any, targetDisplayId?: string): RawFoodOrder {
    const isCombinedOrder = !!orderData.orderBookings && orderData.orderBookings.length > 0;

    // For combined orders, find the matching sub-order by displayId
    if (isCombinedOrder && targetDisplayId) {
      const matchingSubOrder = orderData.orderBookings.find(
        (sub: any) => sub.shortOrderID === targetDisplayId,
      );

      if (matchingSubOrder) {
        return this.transformSubOrder(orderData, matchingSubOrder);
      }
    }

    // Normal order or combined order without specific target
    if (isCombinedOrder) {
      return this.transformCombinedOrder(orderData);
    }

    return this.transformNormalOrder(orderData);
  }

  /**
   * Transform normal (non-combined) order
   */
  private transformNormalOrder(order: any): RawFoodOrder {
    const fare = order.fare || {};
    const eater = order.eater || {};
    const driver = order.driver || {};

    // Parse items with modifiers and discounts
    const items = this.transformOrderItems(order.itemInfo?.items || []);

    return {
      externalOrderId: order.orderID,
      orderCode: order.displayID,
      platform: FoodPlatformType.GRAB,
      status: this.mapGrabStatus(order.state),

      // Customer info
      customerId: eater.ID?.toString() || undefined,
      customerName: eater.name || 'Khách hàng',
      customerPhone: formatPhoneNumber(eater.mobileNumber),
      customerAddress: eater.address || undefined,
      customerNote: eater.comment || undefined,

      items,

      // Pricing
      subtotal: parseCurrency(fare.reducedPriceDisplay),
      deliveryFee: parseCurrency(fare.deliveryFeeDisplay),
      smallOrderFee: parseCurrency(fare.smallOrderFeeDisplay),
      itemDiscountAmount: parseCurrency(fare.totalDiscountAmountDisplay),
      promotionAmount: parseCurrency(fare.promotionDisplay),
      platformFee: 0,
      discount: parseCurrency(fare.totalDiscountAmountDisplay) + parseCurrency(fare.promotionDisplay),
      totalAmount: parseCurrency(fare.reducedPriceDisplay),

      isPaid: true,
      paymentMethod: 'GrabPay',

      // Driver info
      driverId: driver.ID?.toString() || undefined,
      driverName: driver.name || undefined,
      driverPhone: formatPhoneNumber(driver.mobileNumber),
      driverAvatar: driver.avatar || undefined,

      createdAt: new Date(),
      updatedAt: new Date(),

      isCombinedOrder: false,

      rawData: order,
    };
  }

  /**
   * Transform combined order (đơn ghép)
   */
  private transformCombinedOrder(order: any): RawFoodOrder {
    const fare = order.fare || {};
    const eater = order.eater || {};

    // Get all sub-orders
    const subOrders: RawFoodSubOrder[] = (order.orderBookings || []).map((sub: any) => ({
      subOrderId: sub.orderID || order.orderID,
      displayId: sub.shortOrderID,
      isFirstSubOrder: sub.isFirstSubOrder === 1,
      driverName: sub.driver?.name,
      driverPhone: formatPhoneNumber(sub.driver?.mobileNumber),
      items: this.transformOrderItems(sub.items?.items || []),
    }));

    // Collect all items from sub-orders
    const allItems = subOrders.flatMap((sub) => sub.items);

    return {
      externalOrderId: order.orderID,
      orderCode: order.displayID,
      platform: FoodPlatformType.GRAB,
      status: this.mapGrabStatus(order.state),

      // Customer info (from parent order)
      customerId: eater.ID?.toString() || undefined,
      customerName: eater.name || 'Khách hàng',
      customerPhone: formatPhoneNumber(eater.mobileNumber),
      customerAddress: eater.address || undefined,
      customerNote: eater.comment || undefined,

      items: allItems,

      // Pricing
      subtotal: parseCurrency(fare.reducedPriceDisplay),
      deliveryFee: parseCurrency(fare.deliveryFeeDisplay),
      smallOrderFee: parseCurrency(fare.smallOrderFeeDisplay),
      itemDiscountAmount: parseCurrency(fare.totalDiscountAmountDisplay),
      promotionAmount: parseCurrency(fare.promotionDisplay),
      platformFee: 0,
      discount: parseCurrency(fare.totalDiscountAmountDisplay) + parseCurrency(fare.promotionDisplay),
      totalAmount: parseCurrency(fare.reducedPriceDisplay),

      isPaid: true,
      paymentMethod: 'GrabPay',

      createdAt: new Date(),
      updatedAt: new Date(),

      isCombinedOrder: true,
      subOrders,

      rawData: order,
    };
  }

  /**
   * Transform a specific sub-order from combined order
   */
  private transformSubOrder(parentOrder: any, subOrder: any): RawFoodOrder {
    const fare = parentOrder.fare || {};
    const eater = parentOrder.eater || {};
    const driver = subOrder.driver || {};

    const items = this.transformOrderItems(subOrder.items?.items || []);

    // Only first sub-order gets the item discount
    const itemDiscount = subOrder.isFirstSubOrder === 1
      ? parseCurrency(fare.totalDiscountAmountDisplay)
      : 0;

    return {
      externalOrderId: parentOrder.orderID,
      orderCode: subOrder.shortOrderID,
      platform: FoodPlatformType.GRAB,
      status: this.mapGrabStatus(parentOrder.state),

      // Customer info
      customerId: eater.ID?.toString() || undefined,
      customerName: eater.name || 'Khách hàng',
      customerPhone: formatPhoneNumber(eater.mobileNumber),
      customerAddress: eater.address || undefined,
      customerNote: eater.comment || undefined,

      items,

      // Pricing for sub-order
      subtotal: items.reduce((sum, item) => sum + item.totalPrice, 0),
      deliveryFee: parseCurrency(fare.deliveryFeeDisplay),
      smallOrderFee: parseCurrency(fare.smallOrderFeeDisplay),
      itemDiscountAmount: itemDiscount,
      platformFee: 0,
      discount: itemDiscount,
      totalAmount: items.reduce((sum, item) => sum + item.totalPrice, 0) - itemDiscount,

      isPaid: true,
      paymentMethod: 'GrabPay',

      // Driver info for this sub-order
      driverName: driver.name || undefined,
      driverPhone: formatPhoneNumber(driver.mobileNumber),

      createdAt: new Date(),
      updatedAt: new Date(),

      isCombinedOrder: true,
      parentOrderId: parentOrder.orderID,

      rawData: { parentOrder, subOrder },
    };
  }

  /**
   * Transform order items with modifiers and discounts
   */
  private transformOrderItems(items: any[]): RawFoodOrderItem[] {
    return items.map((item) => {
      const quantity = item.quantity || 1;
      const totalPrice = parseCurrency(item.fare?.priceDisplay);
      // Unit price = total price / quantity (theo yêu cầu)
      const unitPrice = quantity > 1 ? Math.round(totalPrice / quantity) : totalPrice;

      // Parse discounts
      const discounts: RawItemDiscount[] = (item.discountInfo || []).map((d: any) => ({
        discountName: d.discountName,
        discountFunding: d.discountFunding,
        discountAmount: parseCurrency(d.itemDiscountPriceDisplay),
      }));

      // Parse modifier groups
      const modifierGroups: RawModifierGroup[] = (item.modifierGroups || []).map((group: any) => ({
        groupId: group.groupID,
        groupName: group.groupName,
        modifiers: (group.modifiers || []).map((mod: any) => ({
          modifierId: mod.modifierID,
          modifierName: mod.modifierName,
          price: parseCurrency(mod.priceDisplay),
        })),
      }));

      // Build options string from modifiers
      const optionsString = modifierGroups
        .flatMap((g) => g.modifiers.map((m) => m.modifierName))
        .join(', ');

      return {
        productName: item.name,
        quantity,
        unitPrice,
        totalPrice,
        note: item.comment || '',
        options: optionsString,
        externalProductId: item.itemID,
        discounts,
        modifierGroups,
      };
    });
  }

  /**
   * Fetch order history for status updates
   * Endpoint: GET https://api.grab.com/food/merchant/v3/statements
   */
  async fetchOrderHistory(
    account: FoodPlatformAccount,
    pageSize: number = 50,
    pageIndex: number = 0,
  ): Promise<{ orders: Array<{ orderId: string; displayId: string; status: string }>; hasMore: boolean }> {
    const url = `${GrabConnector.GRAB_FOOD_API_URL}/statements`;

    this.logger.log(`[GrabFood History] Fetching history page ${pageIndex}`);

    try {
      const response = await axios.get(url, {
        params: {
          pageSize,
          pageIndex,
        },
        headers: {
          'Authorization': account.accessToken,
          'Accept': '*/*',
        },
        timeout: 30000,
      });

      const data = response.data;
      const statements = data.statements || [];

      const orders = statements.map((stmt: any) => ({
        orderId: stmt.ID,
        displayId: stmt.displayID,
        status: this.mapGrabStatus(stmt.deliveryStatus),
      }));

      return {
        orders,
        hasMore: data.hasMore || false,
      };
    } catch (error: any) {
      this.logger.error(`[GrabFood History] EXCEPTION: ${error?.message}`);

      if (error?.response?.status === 401) {
        throw new UnauthorizedException('Token hết hạn hoặc không hợp lệ');
      }

      return { orders: [], hasMore: false };
    }
  }

  /**
   * Transform Grab order to standard format (legacy - for old API)
   */
  private transformOrder(grabOrder: any): RawFoodOrder {
    return {
      externalOrderId: grabOrder.orderID,
      orderCode: `#GR${grabOrder.shortOrderNumber || grabOrder.orderID.slice(-6)}`,
      platform: FoodPlatformType.GRAB,
      status: this.mapGrabStatus(grabOrder.state),

      customerName: grabOrder.receiver?.name || 'Khách hàng',
      customerPhone: formatPhoneNumber(grabOrder.receiver?.phone),
      customerAddress: grabOrder.receiver?.address?.fullAddress,
      customerNote: grabOrder.specialInstruction,

      items: (grabOrder.items || []).map((item: any) => ({
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.price?.value || 0,
        totalPrice: item.totalPrice?.value || 0,
        note: item.specialInstruction,
        options: item.modifiers?.map((m: any) => m.name).join(', '),
        externalProductId: item.itemID,
      })),

      subtotal: grabOrder.price?.subtotal?.value || 0,
      deliveryFee: grabOrder.price?.deliveryFee?.value || 0,
      platformFee: grabOrder.price?.serviceFee?.value || 0,
      discount: grabOrder.price?.discount?.value || 0,
      totalAmount: grabOrder.price?.total?.value || 0,

      isPaid: grabOrder.paymentType !== 'CASH',
      paymentMethod: grabOrder.paymentType,

      driverName: grabOrder.driver?.name,
      driverPhone: formatPhoneNumber(grabOrder.driver?.phone),
      driverLicensePlate: grabOrder.driver?.licensePlate,
      estimatedDeliveryTime: grabOrder.estimatedPickupTime,

      createdAt: new Date(grabOrder.createdAt),
      updatedAt: new Date(grabOrder.updatedAt),

      rawData: grabOrder,
    };
  }

  /**
   * Accept/Confirm an order
   */
  async acceptOrder(
    account: FoodPlatformAccount,
    orderId: string,
  ): Promise<OrderActionResult> {
    try {
      await this.authenticatedRequest(
        account,
        'post',
        `/orders/${orderId}/accept`,
      );

      return {
        success: true,
        orderId,
        newStatus: 'ORDER_IN_PREPARE', // Accepted -> still in prepare phase
      };
    } catch (error) {
      this.logger.error(`GrabFood accept order ${orderId} failed`, error);
      return {
        success: false,
        orderId,
        error: 'Xác nhận đơn hàng thất bại',
      };
    }
  }

  /**
   * Mark order as ready for pickup
   */
  async markReady(
    account: FoodPlatformAccount,
    orderId: string,
  ): Promise<OrderActionResult> {
    try {
      await this.authenticatedRequest(
        account,
        'post',
        `/orders/${orderId}/ready`,
      );

      return {
        success: true,
        orderId,
        newStatus: 'ORDER_IN_PREPARE', // Ready -> still in prepare phase before driver picks up
      };
    } catch (error) {
      this.logger.error(`GrabFood mark ready ${orderId} failed`, error);
      return {
        success: false,
        orderId,
        error: 'Đánh dấu sẵn sàng thất bại',
      };
    }
  }

  /**
   * Complete an order
   */
  async completeOrder(
    account: FoodPlatformAccount,
    orderId: string,
  ): Promise<OrderActionResult> {
    try {
      await this.authenticatedRequest(
        account,
        'post',
        `/orders/${orderId}/complete`,
      );

      return {
        success: true,
        orderId,
        newStatus: 'COMPLETED',
      };
    } catch (error) {
      this.logger.error(`GrabFood complete order ${orderId} failed`, error);
      return {
        success: false,
        orderId,
        error: 'Hoàn tất đơn hàng thất bại',
      };
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(
    account: FoodPlatformAccount,
    orderId: string,
    reason: string,
  ): Promise<OrderActionResult> {
    try {
      await this.authenticatedRequest(account, 'post', `/orders/${orderId}/cancel`, {
        reason,
      });

      return {
        success: true,
        orderId,
        newStatus: 'CANCELLED',
      };
    } catch (error) {
      this.logger.error(`GrabFood cancel order ${orderId} failed`, error);
      return {
        success: false,
        orderId,
        error: 'Hủy đơn hàng thất bại',
      };
    }
  }
}
