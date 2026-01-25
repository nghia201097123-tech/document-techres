import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
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
 * BeFood Platform Connector
 * Uses BeFood Merchant Gateway API
 * Base URL: https://gw.be.com.vn/api/v1/be-merchant-gateway
 */
@Injectable()
export class BeFoodConnector extends BasePlatformConnector {
  readonly platform = FoodPlatformType.BEFOOD;
  private readonly beFoodBaseUrl = 'https://gw.be.com.vn/api/v1/be-merchant-gateway';

  constructor(configService: ConfigService) {
    const baseUrl = configService.get<string>('platform.befood.baseUrl') || 'https://gw.be.com.vn/api/v1/be-merchant-gateway';
    super(configService, baseUrl);
  }

  /**
   * Login with email/password via BeFood Merchant Gateway
   * Endpoint: POST /v2/merchant/login
   */
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    try {
      this.logger.debug('[BeFoodConnector] Attempting login...');

      const response = await axios.post(
        `${this.beFoodBaseUrl}/v2/merchant/login`,
        {
          email: credentials.username,
          password: credentials.password,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const responseData = response.data;
      this.logger.debug('[BeFoodConnector] Login response code:', responseData?.code);

      // BeFood success code is 143
      if (responseData?.code === 143 && responseData?.token) {
        const user = responseData.user || {};

        return {
          success: true,
          accessToken: responseData.token,
          refreshToken: responseData.resfresh_token || responseData.refresh_token, // Note: typo in API "resfresh"
          expiresIn: 23328000, // ~270 days based on JWT exp
          merchantId: String(user.user_id),
          merchantName: user.email,
          // Additional user info
          email: user.email,
          phoneNumber: user.phone_no,
          userType: responseData.user_type,
        };
      }

      return {
        success: false,
        error: responseData?.message || 'Đăng nhập thất bại',
        errorCode: 'INVALID_CREDENTIALS',
      };
    } catch (error: any) {
      this.logger.error('[BeFoodConnector] Login failed:', error?.response?.data || error?.message);

      const errData = error?.response?.data;
      const errorMessage = errData?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin đăng nhập.';

      return {
        success: false,
        error: errorMessage,
        errorCode: errData?.code || 'INVALID_CREDENTIALS',
      };
    }
  }

  /**
   * Request OTP (BeFood uses email/password, not OTP)
   */
  async requestOtp(_phoneNumber: string): Promise<OtpRequestResult> {
    return {
      success: false,
      error: 'BeFood không hỗ trợ đăng nhập bằng OTP',
    };
  }

  /**
   * Verify OTP (not supported)
   */
  async verifyOtp(_sessionId: string, _otp: string): Promise<LoginResult> {
    return {
      success: false,
      error: 'BeFood không hỗ trợ đăng nhập bằng OTP',
    };
  }

  /**
   * Refresh access token
   * Note: BeFood may not have a separate refresh endpoint, token has long expiry
   */
  async refreshToken(refreshToken: string): Promise<LoginResult> {
    // BeFood tokens have long expiry (~270 days), refresh may not be needed
    // If needed, implement the refresh endpoint here
    return {
      success: false,
      error: 'BeFood refresh token không được hỗ trợ. Vui lòng đăng nhập lại.',
      errorCode: 'TOKEN_REFRESH_NOT_SUPPORTED',
    };
  }

  /**
   * Get list of merchant stores using get_user_profiles API
   * Endpoint: POST /v2/merchant/get_user_profiles
   */
  async getStores(account: FoodPlatformAccount): Promise<MerchantStore[]> {
    try {
      this.logger.debug('[BeFoodConnector] Getting user profiles/stores...');

      const response = await axios.post(
        `${this.beFoodBaseUrl}/v2/merchant/get_user_profiles`,
        {
          access_token: account.accessToken,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const responseData = response.data;
      this.logger.debug('[BeFoodConnector] Get profiles response code:', responseData?.code);

      if (responseData?.code !== 143) {
        this.logger.error('[BeFoodConnector] Get profiles failed:', responseData?.message);

        // Check for auth errors
        if (responseData?.code === 401 || responseData?.message?.includes('unauthorized')) {
          throw new UnauthorizedException('Token hết hạn hoặc không hợp lệ');
        }

        return [];
      }

      const stores: MerchantStore[] = [];
      const merchants = responseData.data || [];

      for (const merchant of merchants) {
        const storeProfiles = merchant.store_profiles || [];

        for (const store of storeProfiles) {
          stores.push({
            externalStoreId: String(store.store_id),
            name: store.store_name,
            address: store.address,
            phone: undefined, // Not in this response
            email: undefined,
            isActive: store.order_mode === 1,
            // Additional BeFood specific data
            merchantId: String(merchant.merchant_id),
            merchantName: merchant.merchant_name,
            rating: store.rating,
            reviewCount: store.review_count,
            storeImage: store.store_image,
            payMode: store.pay_mode,
            autoAccept: store.auto_accept === 1,
          });
        }
      }

      this.logger.debug(`[BeFoodConnector] Found ${stores.length} stores`);
      return stores;
    } catch (error: any) {
      this.logger.error('[BeFoodConnector] Get stores failed:', error?.message);

      const is401 = error?.response?.status === 401 ||
        error?.message?.includes('UNAUTHORIZED') ||
        error?.message?.includes('Token expired') ||
        error instanceof UnauthorizedException;

      if (is401) {
        throw new UnauthorizedException('Token hết hạn hoặc không hợp lệ');
      }

      return [];
    }
  }

  /**
   * Get store details
   * Endpoint: POST /v2/merchant/store/get
   */
  async getStoreDetails(account: FoodPlatformAccount, storeId: string, merchantId: string): Promise<any> {
    try {
      this.logger.debug(`[BeFoodConnector] Getting store details for store ${storeId}...`);

      const response = await axios.post(
        `${this.beFoodBaseUrl}/v2/merchant/store/get`,
        {
          access_token: account.accessToken,
          store_id: parseInt(storeId),
          merchant_id: parseInt(merchantId),
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const responseData = response.data;

      if (responseData?.flag === 143 || responseData?.code === 143) {
        return responseData.store;
      }

      return null;
    } catch (error: any) {
      this.logger.error('[BeFoodConnector] Get store details failed:', error?.message);
      return null;
    }
  }

  /**
   * Get menu from BeFood
   * TODO: Need actual menu API endpoint
   */
  async getMenu(account: FoodPlatformAccount, storeId?: string): Promise<any> {
    try {
      this.logger.debug('[BeFoodConnector] Getting menu...');

      // TODO: Implement when menu API is available
      // For now, return empty menu structure
      return {
        categories: [],
        items: [],
      };
    } catch (error: any) {
      this.logger.error('[BeFoodConnector] Get menu failed:', error?.message);
      return {
        categories: [],
        items: [],
      };
    }
  }

  /**
   * Poll orders from a specific store
   * TODO: Need actual orders API endpoint
   */
  async pollOrders(
    account: FoodPlatformAccount,
    storeId: string,
    since?: Date,
  ): Promise<RawFoodOrder[]> {
    try {
      this.logger.debug(`[BeFoodConnector] Polling orders for store ${storeId}...`);

      // TODO: Implement when orders API is available
      return [];
    } catch (error) {
      this.logger.error('[BeFoodConnector] Poll orders failed:', error);
      return [];
    }
  }

  /**
   * Transform BeFood order to standard format
   */
  private transformOrder(beFoodOrder: any): RawFoodOrder {
    return {
      externalOrderId: beFoodOrder.order_id || beFoodOrder.id,
      orderCode: `#BF${beFoodOrder.order_code || beFoodOrder.order_id || beFoodOrder.id}`,
      platform: FoodPlatformType.BEFOOD,
      status: this.mapStatus(beFoodOrder.status),

      customerName: beFoodOrder.customer?.name || beFoodOrder.customer_name || 'Khách hàng',
      customerPhone: beFoodOrder.customer?.phone || beFoodOrder.customer_phone || '',
      customerAddress: beFoodOrder.delivery_address || beFoodOrder.customer?.address,
      customerNote: beFoodOrder.note || beFoodOrder.customer_note,

      items: (beFoodOrder.items || beFoodOrder.order_items || []).map((item: any) => ({
        productName: item.name || item.product_name,
        quantity: item.quantity || 1,
        unitPrice: item.price || item.unit_price || 0,
        totalPrice: item.total_price || (item.price || 0) * (item.quantity || 1),
        note: item.note,
        options: item.options?.map((o: any) => o.name || o).join(', '),
        externalProductId: item.product_id || item.item_id,
      })),

      subtotal: beFoodOrder.subtotal || beFoodOrder.sub_total || 0,
      deliveryFee: beFoodOrder.delivery_fee || beFoodOrder.shipping_fee || 0,
      platformFee: beFoodOrder.service_fee || beFoodOrder.platform_fee || 0,
      discount: beFoodOrder.discount || beFoodOrder.discount_amount || 0,
      totalAmount: beFoodOrder.total || beFoodOrder.total_amount || 0,

      isPaid: beFoodOrder.is_paid || beFoodOrder.payment_status === 'PAID',
      paymentMethod: beFoodOrder.payment_method,

      driverName: beFoodOrder.driver?.name || beFoodOrder.shipper_name,
      driverPhone: beFoodOrder.driver?.phone || beFoodOrder.shipper_phone,
      driverLicensePlate: beFoodOrder.driver?.license_plate,
      estimatedDeliveryTime: beFoodOrder.estimated_delivery_time,

      createdAt: new Date(beFoodOrder.created_at || beFoodOrder.order_time),
      updatedAt: new Date(beFoodOrder.updated_at || beFoodOrder.created_at),

      rawData: beFoodOrder,
    };
  }

  /**
   * Map BeFood status to standard status
   */
  private mapStatus(beFoodStatus: string): string {
    const statusMap: Record<string, string> = {
      PENDING: FoodOrderStatus.NEW,
      NEW: FoodOrderStatus.NEW,
      CONFIRMED: FoodOrderStatus.ACCEPTED,
      ACCEPTED: FoodOrderStatus.ACCEPTED,
      PREPARING: FoodOrderStatus.PREPARING,
      READY: FoodOrderStatus.READY,
      DELIVERING: FoodOrderStatus.DELIVERING,
      SHIPPING: FoodOrderStatus.DELIVERING,
      COMPLETED: FoodOrderStatus.COMPLETED,
      DELIVERED: FoodOrderStatus.COMPLETED,
      CANCELLED: FoodOrderStatus.CANCELLED,
      REJECTED: FoodOrderStatus.CANCELLED,
    };
    return statusMap[beFoodStatus?.toUpperCase()] || FoodOrderStatus.NEW;
  }

  /**
   * Accept/Confirm an order
   */
  async acceptOrder(
    account: FoodPlatformAccount,
    orderId: string,
  ): Promise<OrderActionResult> {
    try {
      // TODO: Implement when order action API is available
      return {
        success: false,
        orderId,
        error: 'Chức năng chưa được hỗ trợ',
      };
    } catch (error) {
      this.logger.error(`[BeFoodConnector] Accept order ${orderId} failed`, error);
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
      // TODO: Implement when order action API is available
      return {
        success: false,
        orderId,
        error: 'Chức năng chưa được hỗ trợ',
      };
    } catch (error) {
      this.logger.error(`[BeFoodConnector] Mark ready ${orderId} failed`, error);
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
      // TODO: Implement when order action API is available
      return {
        success: false,
        orderId,
        error: 'Chức năng chưa được hỗ trợ',
      };
    } catch (error) {
      this.logger.error(`[BeFoodConnector] Complete order ${orderId} failed`, error);
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
      // TODO: Implement when order action API is available
      return {
        success: false,
        orderId,
        error: 'Chức năng chưa được hỗ trợ',
      };
    } catch (error) {
      this.logger.error(`[BeFoodConnector] Cancel order ${orderId} failed`, error);
      return {
        success: false,
        orderId,
        error: 'Hủy đơn hàng thất bại',
      };
    }
  }
}
