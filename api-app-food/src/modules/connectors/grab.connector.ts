import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FoodPlatformAccount, FoodPlatformType, FoodOrderStatus } from '../../database/entities';
import { BasePlatformConnector } from './base.connector';
import {
  LoginCredentials,
  LoginResult,
  OtpRequestResult,
  MerchantStore,
  RawFoodOrder,
  OrderActionResult,
} from './interfaces/connector.interface';

/**
 * GrabFood Platform Connector
 * Uses Grab Merchant Experience (MEX) API for authentication
 */
@Injectable()
export class GrabConnector extends BasePlatformConnector {
  readonly platform = FoodPlatformType.GRAB;

  constructor(configService: ConfigService) {
    // Use MEX API base URL
    const baseUrl = configService.get<string>('platform.grab.baseUrl') || 'https://api.grab.com/mex-app';
    super(configService, baseUrl);
  }

  /**
   * Login with username/password via Grab MEX API
   * Endpoint: POST /troy/user-profile/v1/login
   */
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    try {
      const response = await this.httpClient.post(
        '/troy/user-profile/v1/login',
        {
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
        },
        {
          headers: {
            'user-agent': 'Grab Merchant/4.126.0 (ios 16.7.10; Build 102734851)',
            'mex-country': 'VN',
            'x-currency': 'VND',
            'Content-Type': 'application/json',
          },
        },
      );

      const responseData = response.data;

      this.logger.debug('GrabFood login response:', JSON.stringify(responseData));

      // Check if login was successful - handle both direct response and wrapped response
      // Direct response format: { success: true, data: { jwt: '...' } }
      // Wrapped response format: { data: { success: true, data: { jwt: '...' } } }
      const isDirectResponse = responseData?.success !== undefined;
      const successCheck = isDirectResponse ? responseData?.success : responseData?.data?.success;
      const loginData = isDirectResponse ? responseData?.data : responseData?.data?.data;

      if (successCheck && loginData?.jwt) {
        const userProfile = loginData.user_profile;

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

      return {
        success: false,
        error: errorMsg || 'Đăng nhập thất bại',
        errorCode: 'INVALID_CREDENTIALS',
      };
    } catch (error: any) {
      this.logger.error('GrabFood login failed', error?.response?.data || error?.message);

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
   * Endpoint: GET /food/merchant/v2/menu
   */
  async getMenu(account: FoodPlatformAccount): Promise<any> {
    try {
      this.logger.debug('[GrabConnector] Fetching menu...');

      const response = await this.httpClient.get(
        '/food/merchant/v2/menu',
        {
          headers: {
            'Authorization': account.accessToken,
            'x-user-type': 'user-profile',
          },
        },
      );

      const menuData = response.data;
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
   * Poll orders from a specific store
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

  /**
   * Transform Grab order to standard format
   */
  private transformOrder(grabOrder: any): RawFoodOrder {
    return {
      externalOrderId: grabOrder.orderID,
      orderCode: `#GR${grabOrder.shortOrderNumber || grabOrder.orderID.slice(-6)}`,
      platform: FoodPlatformType.GRAB,
      status: this.mapStatus(grabOrder.state),

      customerName: grabOrder.receiver?.name || 'Khách hàng',
      customerPhone: grabOrder.receiver?.phone || '',
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
      driverPhone: grabOrder.driver?.phone,
      driverLicensePlate: grabOrder.driver?.licensePlate,
      estimatedDeliveryTime: grabOrder.estimatedPickupTime,

      createdAt: new Date(grabOrder.createdAt),
      updatedAt: new Date(grabOrder.updatedAt),

      rawData: grabOrder,
    };
  }

  /**
   * Map Grab status to standard status
   */
  private mapStatus(grabState: string): string {
    const statusMap: Record<string, string> = {
      NEW: FoodOrderStatus.NEW,
      ACCEPTED: FoodOrderStatus.ACCEPTED,
      PREPARING: FoodOrderStatus.PREPARING,
      READY_FOR_PICKUP: FoodOrderStatus.READY,
      DRIVER_ASSIGNED: FoodOrderStatus.DELIVERING,
      DRIVER_ARRIVED: FoodOrderStatus.DELIVERING,
      PICKED_UP: FoodOrderStatus.DELIVERING,
      DELIVERED: FoodOrderStatus.COMPLETED,
      CANCELLED: FoodOrderStatus.CANCELLED,
    };
    return statusMap[grabState] || FoodOrderStatus.NEW;
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
        newStatus: FoodOrderStatus.ACCEPTED,
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
        newStatus: FoodOrderStatus.READY,
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
        newStatus: FoodOrderStatus.COMPLETED,
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
        newStatus: FoodOrderStatus.CANCELLED,
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
