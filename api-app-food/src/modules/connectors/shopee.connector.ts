import { Injectable } from '@nestjs/common';
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
  OrdersPaginationResponse,
} from './interfaces/connector.interface';

/**
 * ShopeeFood Status Mapping - Simplified TechRes Flow
 * Maps ShopeeFood API states to TechRes statuses:
 * - Đơn mới (NEW)
 * - Đã xác nhận (PREPARING) - all in-progress states
 * - Hoàn tất (COMPLETED)
 * - Huỷ (CANCELLED)
 */
const SHOPEE_STATUS_MAP: Record<string, string> = {
  // Đơn mới (NEW)
  '1': FoodOrderStatus.NEW,
  'PENDING': FoodOrderStatus.NEW,
  // Đã xác nhận (PREPARING) - all in-progress states
  '2': FoodOrderStatus.PREPARING,
  '3': FoodOrderStatus.PREPARING,
  '4': FoodOrderStatus.PREPARING,
  '5': FoodOrderStatus.PREPARING,
  'CONFIRMED': FoodOrderStatus.PREPARING,
  'PREPARING': FoodOrderStatus.PREPARING,
  'READY': FoodOrderStatus.PREPARING,
  'SHIPPING': FoodOrderStatus.PREPARING,
  // Hoàn tất (COMPLETED)
  '6': FoodOrderStatus.COMPLETED,
  'COMPLETED': FoodOrderStatus.COMPLETED,
  // Huỷ (CANCELLED)
  '7': FoodOrderStatus.CANCELLED,
  'CANCELLED': FoodOrderStatus.CANCELLED,
};

/**
 * ShopeeFood Platform Connector
 */
@Injectable()
export class ShopeeConnector extends BasePlatformConnector {
  readonly platform = FoodPlatformType.SHOPEE_FOOD;

  constructor(configService: ConfigService) {
    const baseUrl = configService.get<string>('platform.shopeeFood.baseUrl') || 'https://api.shopeefood.vn/merchant/v4';
    super(configService, baseUrl);
  }

  /**
   * Login with username/password (not primary method for ShopeeFood)
   */
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    // ShopeeFood primarily uses OTP, but some accounts may support password
    try {
      const response = await this.httpClient.post('/auth/login', {
        phone: credentials.phoneNumber || credentials.username,
        password: credentials.password,
      });

      const data = response.data;

      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        merchantId: data.shop_id?.toString(),
        merchantName: data.shop_name,
      };
    } catch (error) {
      this.logger.error('ShopeeFood login failed', error);
      return {
        success: false,
        error: 'Đăng nhập thất bại. Vui lòng sử dụng OTP.',
        errorCode: 'INVALID_CREDENTIALS',
      };
    }
  }

  /**
   * Request OTP
   */
  async requestOtp(phoneNumber: string): Promise<OtpRequestResult> {
    try {
      const response = await this.httpClient.post('/auth/otp/request', {
        phone: phoneNumber,
      });

      const data = response.data;

      return {
        success: true,
        sessionId: data.session_id,
        expiresIn: data.expires_in || 300, // 5 minutes
      };
    } catch (error) {
      this.logger.error('ShopeeFood request OTP failed', error);
      return {
        success: false,
        error: 'Gửi mã OTP thất bại. Vui lòng thử lại.',
      };
    }
  }

  /**
   * Verify OTP
   */
  async verifyOtp(sessionId: string, otp: string): Promise<LoginResult> {
    try {
      const response = await this.httpClient.post('/auth/otp/verify', {
        session_id: sessionId,
        otp_code: otp,
      });

      const data = response.data;

      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        merchantId: data.shop_id?.toString(),
        merchantName: data.shop_name,
      };
    } catch (error) {
      this.logger.error('ShopeeFood verify OTP failed', error);
      return {
        success: false,
        error: 'Mã OTP không chính xác hoặc đã hết hạn',
        errorCode: 'OTP_INVALID',
      };
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<LoginResult> {
    try {
      const response = await this.httpClient.post('/auth/refresh', {
        refresh_token: refreshToken,
      });

      const data = response.data;

      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresIn: data.expires_in,
      };
    } catch (error) {
      this.logger.error('ShopeeFood refresh token failed', error);
      return {
        success: false,
        error: 'Refresh token thất bại',
        errorCode: 'TOKEN_REFRESH_FAILED',
      };
    }
  }

  /**
   * Get list of merchant stores
   */
  async getStores(account: FoodPlatformAccount): Promise<MerchantStore[]> {
    try {
      const response = await this.authenticatedRequest<{ shops: any[] }>(
        account,
        'get',
        '/shops',
      );

      return response.shops.map((shop) => ({
        externalStoreId: shop.shop_id?.toString(),
        name: shop.shop_name,
        address: shop.address,
        phone: shop.phone,
        isActive: shop.status === 1,
      }));
    } catch (error) {
      this.logger.error('ShopeeFood get stores failed', error);
      return [];
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
        shop_id: storeId,
        page_size: 50,
      };

      if (since) {
        params.time_from = Math.floor(since.getTime() / 1000);
        params.time_to = Math.floor(Date.now() / 1000);
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
      this.logger.error('ShopeeFood poll orders failed', error);
      return [];
    }
  }

  /**
   * Transform Shopee order to standard format
   */
  private transformOrder(shopeeOrder: any): RawFoodOrder {
    return {
      externalOrderId: shopeeOrder.order_id?.toString(),
      orderCode: `#SF${shopeeOrder.order_code || shopeeOrder.order_id}`,
      platform: FoodPlatformType.SHOPEE_FOOD,
      status: this.mapStatus(shopeeOrder.status),

      customerName: shopeeOrder.buyer_info?.name || 'Khách hàng',
      customerPhone: shopeeOrder.buyer_info?.phone || '',
      customerAddress: shopeeOrder.delivery_info?.address,
      customerNote: shopeeOrder.note,

      items: (shopeeOrder.items || []).map((item: any) => ({
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.price || 0,
        totalPrice: (item.price || 0) * (item.quantity || 1),
        note: item.note,
        options: item.options?.map((o: any) => o.name).join(', '),
        externalProductId: item.item_id?.toString(),
      })),

      subtotal: shopeeOrder.subtotal || 0,
      deliveryFee: shopeeOrder.delivery_fee || 0,
      platformFee: shopeeOrder.service_fee || 0,
      discount: shopeeOrder.discount || 0,
      totalAmount: shopeeOrder.total || 0,

      isPaid: shopeeOrder.payment_method !== 'COD',
      paymentMethod: shopeeOrder.payment_method,

      driverName: shopeeOrder.shipper?.name,
      driverPhone: shopeeOrder.shipper?.phone,
      driverLicensePlate: shopeeOrder.shipper?.license_plate,
      estimatedDeliveryTime: shopeeOrder.estimated_delivery_time,

      createdAt: new Date(shopeeOrder.create_time * 1000),
      updatedAt: new Date(shopeeOrder.update_time * 1000),

      rawData: shopeeOrder,
    };
  }

  /**
   * Map ShopeeFood status to TechRes status
   * Implements IPlatformConnector.mapStatusToTechRes
   */
  mapStatusToTechRes(platformStatus: string): string {
    return SHOPEE_STATUS_MAP[platformStatus?.toString()] || FoodOrderStatus.NEW;
  }

  /**
   * Map Shopee status to standard status (internal use)
   */
  private mapStatus(shopeeStatus: number | string): string {
    return this.mapStatusToTechRes(shopeeStatus?.toString());
  }

  /**
   * Fetch orders using pagination API - Returns standardized OrdersPaginationResponse
   * Implements IPlatformConnector.fetchOrdersPagination
   */
  async fetchOrdersPaginationStandard(
    account: FoodPlatformAccount,
    _pageType?: string,
  ): Promise<OrdersPaginationResponse> {
    try {
      const params: Record<string, unknown> = {
        page_size: 50,
      };

      const response = await this.authenticatedRequest<{ orders: any[] }>(
        account,
        'get',
        '/orders',
        undefined,
        params,
      );

      const orders = response.orders.map((order) => this.transformOrder(order));

      return {
        success: true,
        orders,
        pollInterval: 15,
        hasMore: false,
      };
    } catch (error: any) {
      this.logger.error('ShopeeFood fetchOrdersPaginationStandard failed', error);
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
   * Accept/Confirm an order
   */
  async acceptOrder(
    account: FoodPlatformAccount,
    orderId: string,
  ): Promise<OrderActionResult> {
    try {
      await this.authenticatedRequest(account, 'post', '/orders/accept', {
        order_id: orderId,
      });

      return {
        success: true,
        orderId,
        newStatus: FoodOrderStatus.ACCEPTED,
      };
    } catch (error) {
      this.logger.error(`ShopeeFood accept order ${orderId} failed`, error);
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
      await this.authenticatedRequest(account, 'post', '/orders/ready', {
        order_id: orderId,
      });

      return {
        success: true,
        orderId,
        newStatus: FoodOrderStatus.READY,
      };
    } catch (error) {
      this.logger.error(`ShopeeFood mark ready ${orderId} failed`, error);
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
      await this.authenticatedRequest(account, 'post', '/orders/complete', {
        order_id: orderId,
      });

      return {
        success: true,
        orderId,
        newStatus: FoodOrderStatus.COMPLETED,
      };
    } catch (error) {
      this.logger.error(`ShopeeFood complete order ${orderId} failed`, error);
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
      await this.authenticatedRequest(account, 'post', '/orders/cancel', {
        order_id: orderId,
        cancel_reason: reason,
      });

      return {
        success: true,
        orderId,
        newStatus: FoodOrderStatus.CANCELLED,
      };
    } catch (error) {
      this.logger.error(`ShopeeFood cancel order ${orderId} failed`, error);
      return {
        success: false,
        orderId,
        error: 'Hủy đơn hàng thất bại',
      };
    }
  }
}
