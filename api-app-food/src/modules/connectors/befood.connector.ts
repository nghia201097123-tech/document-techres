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
} from './interfaces/connector.interface';

/**
 * BeFood Platform Connector
 */
@Injectable()
export class BeFoodConnector extends BasePlatformConnector {
  readonly platform = FoodPlatformType.BEFOOD;

  constructor(configService: ConfigService) {
    const baseUrl = configService.get<string>('platform.befood.baseUrl') || 'https://api.befood.vn/merchant';
    super(configService, baseUrl);
  }

  /**
   * Login with username/password
   */
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    try {
      const clientId = this.configService.get<string>('platform.befood.clientId');
      const clientSecret = this.configService.get<string>('platform.befood.clientSecret');

      const response = await this.httpClient.post('/auth/login', {
        username: credentials.username,
        password: credentials.password,
        client_id: clientId,
        client_secret: clientSecret,
      });

      const data = response.data?.data || response.data;

      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        merchantId: data.merchant_id,
        merchantName: data.merchant_name,
      };
    } catch (error) {
      this.logger.error('BeFood login failed', error);
      return {
        success: false,
        error: 'Đăng nhập thất bại',
        errorCode: 'INVALID_CREDENTIALS',
      };
    }
  }

  /**
   * Request OTP (BeFood uses username/password, not OTP)
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
   */
  async refreshToken(refreshToken: string): Promise<LoginResult> {
    try {
      const response = await this.httpClient.post('/auth/refresh', {
        refresh_token: refreshToken,
      });

      const data = response.data?.data || response.data;

      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresIn: data.expires_in,
      };
    } catch (error) {
      this.logger.error('BeFood refresh token failed', error);
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
      const response = await this.authenticatedRequest<{ data: any[] }>(
        account,
        'get',
        '/stores',
      );

      const stores = response.data || response;

      return (Array.isArray(stores) ? stores : []).map((store) => ({
        externalStoreId: store.store_id || store.id,
        name: store.store_name || store.name,
        address: store.address,
        phone: store.phone,
        isActive: store.status === 'ACTIVE' || store.is_active,
      }));
    } catch (error) {
      this.logger.error('BeFood get stores failed', error);
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
        store_id: storeId,
        status: 'PENDING,CONFIRMED,PREPARING,READY,DELIVERING',
      };

      if (since) {
        params.from_time = since.toISOString();
      }

      this.httpClient.defaults.headers.common['X-Store-ID'] = storeId;

      const response = await this.authenticatedRequest<{ data: any[] }>(
        account,
        'get',
        '/orders',
        undefined,
        params,
      );

      const orders = response.data || response;

      return (Array.isArray(orders) ? orders : []).map((order) =>
        this.transformOrder(order),
      );
    } catch (error) {
      this.logger.error('BeFood poll orders failed', error);
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
      await this.authenticatedRequest(
        account,
        'post',
        `/orders/${orderId}/confirm`,
      );

      return {
        success: true,
        orderId,
        newStatus: FoodOrderStatus.ACCEPTED,
      };
    } catch (error) {
      this.logger.error(`BeFood accept order ${orderId} failed`, error);
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
      this.logger.error(`BeFood mark ready ${orderId} failed`, error);
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
      this.logger.error(`BeFood complete order ${orderId} failed`, error);
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
      this.logger.error(`BeFood cancel order ${orderId} failed`, error);
      return {
        success: false,
        orderId,
        error: 'Hủy đơn hàng thất bại',
      };
    }
  }
}
