/**
 * BeFood Poll Worker - Piscina Worker Thread
 *
 * This runs in a separate thread pool, isolated from the main NestJS app.
 * NOTE: BeFood order polling API is not yet fully implemented
 */

import axios from 'axios';

const BEFOOD_API_URL = 'https://gw.be.com.vn/api/v1/be-merchant-gateway';

const BEFOOD_STATUS_MAP: Record<string, string> = {
  'PENDING': 'NEW',
  'NEW': 'NEW',
  'CONFIRMED': 'PREPARING',
  'ACCEPTED': 'PREPARING',
  'PREPARING': 'PREPARING',
  'READY': 'PREPARING',
  'DELIVERING': 'PREPARING',
  'SHIPPING': 'PREPARING',
  'COMPLETED': 'COMPLETED',
  'DELIVERED': 'COMPLETED',
  'CANCELLED': 'CANCELLED',
  'REJECTED': 'CANCELLED',
};

interface AccountData {
  id: string;
  platform: string;
  accessToken: string;
  branchId: string;
  tenantId: string;
}

/**
 * Main worker function - called by Piscina
 */
export default async function pollBeFoodOrders(account: AccountData) {
  const startTime = Date.now();

  try {
    // TODO: BeFood order polling API not yet implemented
    // This is a placeholder that returns empty orders
    // When BeFood API is available, implement the actual polling logic

    // Attempt to fetch orders from BeFood API (if available)
    // const response = await axios.post(`${BEFOOD_API_URL}/v2/merchant/orders`, {
    //   access_token: account.accessToken,
    //   status: 'active',
    // }, {
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   timeout: 30000,
    // });

    // For now, return empty result
    return {
      success: true,
      accountId: account.id,
      platform: 'BEFOOD',
      orders: [],
      orderStats: null,
      pollInterval: 60,
      duration: Date.now() - startTime,
      warning: 'BeFood order polling not yet implemented',
    };
  } catch (error: any) {
    return {
      success: false,
      accountId: account.id,
      platform: 'BEFOOD',
      orders: [],
      error: error?.message || 'Unknown error',
      isUnauthorized: error?.response?.status === 401,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Transform BeFood order to TechRes format
 * (For future use when API is available)
 */
function transformBeFoodOrder(beFoodOrder: any) {
  const status = String(beFoodOrder.status || 'PENDING').toUpperCase();

  return {
    externalOrderId: String(beFoodOrder.order_id || beFoodOrder.id),
    orderCode: beFoodOrder.order_code || `#BE${String(beFoodOrder.id).slice(-6)}`,
    platform: 'BEFOOD',
    status: BEFOOD_STATUS_MAP[status] || 'NEW',

    // Customer info
    customerName: beFoodOrder.customer?.name || 'Khách hàng',
    customerPhone: formatPhone(beFoodOrder.customer?.phone),
    customerAddress: beFoodOrder.customer?.address || '',
    customerNote: beFoodOrder.note || '',

    // Driver info
    driverName: beFoodOrder.driver?.name || null,
    driverPhone: formatPhone(beFoodOrder.driver?.phone),
    driverAvatar: beFoodOrder.driver?.avatar || null,
    driverLicensePlate: beFoodOrder.driver?.license_plate || null,

    // Items
    items: (beFoodOrder.items || []).map((item: any) => ({
      productName: item.name,
      quantity: item.quantity || 1,
      unitPrice: item.price || 0,
      totalPrice: (item.price || 0) * (item.quantity || 1),
      note: item.note || '',
      options: item.options?.join(', ') || '',
    })),

    // Pricing
    subtotal: beFoodOrder.subtotal || 0,
    deliveryFee: beFoodOrder.delivery_fee || 0,
    platformFee: beFoodOrder.platform_fee || 0,
    discount: beFoodOrder.discount || 0,
    totalAmount: beFoodOrder.total || 0,

    // Payment
    isPaid: beFoodOrder.is_paid !== false,
    paymentMethod: beFoodOrder.payment_method || 'BePay',

    // Extra
    orderContentMessage: null,
    estimatedDeliveryTime: beFoodOrder.estimated_delivery_time || null,
    createdAt: beFoodOrder.created_at ? new Date(beFoodOrder.created_at) : new Date(),
  };
}

/**
 * Format Vietnamese phone number
 */
function formatPhone(phone?: string): string {
  if (!phone) return '';
  return phone
    .replace(/\D/g, '')
    .replace(/^84/, '0')
    .replace(/^\+84/, '0');
}
