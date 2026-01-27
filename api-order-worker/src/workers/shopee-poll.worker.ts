/**
 * Shopee Poll Worker - Piscina Worker Thread
 *
 * This runs in a separate thread pool, isolated from the main NestJS app.
 */

import axios from 'axios';

const SHOPEE_API_URL = process.env.SHOPEE_FOOD_API_BASE_URL || 'https://api.shopeefood.vn/merchant/v4';

const SHOPEE_STATUS_MAP: Record<string, string> = {
  '1': 'NEW',
  'PENDING': 'NEW',
  '2': 'PREPARING',
  '3': 'PREPARING',
  '4': 'PREPARING',
  '5': 'PREPARING',
  'CONFIRMED': 'PREPARING',
  'PREPARING': 'PREPARING',
  'READY': 'PREPARING',
  'SHIPPING': 'PREPARING',
  '6': 'COMPLETED',
  'COMPLETED': 'COMPLETED',
  '7': 'CANCELLED',
  'CANCELLED': 'CANCELLED',
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
export default async function pollShopeeOrders(account: AccountData) {
  const startTime = Date.now();

  try {
    // Fetch orders from Shopee API
    const response = await axios.get(`${SHOPEE_API_URL}/orders`, {
      headers: {
        'Authorization': `Bearer ${account.accessToken}`,
        'Accept': 'application/json',
      },
      params: {
        status: 'active', // Get active orders
        limit: 50,
      },
      timeout: 30000,
    });

    const data = response.data;
    const shopeeOrders = data.orders || data.data?.orders || [];

    // Transform orders to TechRes format
    const transformedOrders = shopeeOrders.map((order: any) => transformShopeeOrder(order));

    return {
      success: true,
      accountId: account.id,
      platform: 'shopee_food',
      orders: transformedOrders,
      orderStats: null,
      pollInterval: 60,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      success: false,
      accountId: account.id,
      platform: 'shopee_food',
      orders: [],
      error: error?.message || 'Unknown error',
      isUnauthorized: error?.response?.status === 401,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Transform Shopee order to TechRes format
 */
function transformShopeeOrder(shopeeOrder: any) {
  const status = String(shopeeOrder.status || shopeeOrder.order_status || '1');

  return {
    externalOrderId: String(shopeeOrder.order_id || shopeeOrder.id),
    orderCode: shopeeOrder.order_code || `#SF${String(shopeeOrder.order_id).slice(-6)}`,
    platform: 'shopee_food',
    status: SHOPEE_STATUS_MAP[status] || SHOPEE_STATUS_MAP[status.toUpperCase()] || 'NEW',

    // Customer info
    customerName: shopeeOrder.customer?.name || shopeeOrder.buyer_name || 'Khách hàng',
    customerPhone: formatPhone(shopeeOrder.customer?.phone || shopeeOrder.buyer_phone),
    customerAddress: shopeeOrder.customer?.address || shopeeOrder.delivery_address || '',
    customerNote: shopeeOrder.note || shopeeOrder.buyer_note || '',

    // Driver/Shipper info
    driverName: shopeeOrder.shipper?.name || null,
    driverPhone: formatPhone(shopeeOrder.shipper?.phone),
    driverAvatar: shopeeOrder.shipper?.avatar || null,
    driverLicensePlate: shopeeOrder.shipper?.license_plate || null,

    // Items
    items: (shopeeOrder.items || shopeeOrder.order_items || []).map((item: any) => ({
      productName: item.name || item.product_name,
      quantity: item.quantity || 1,
      unitPrice: item.price || item.unit_price || 0,
      totalPrice: (item.price || item.unit_price || 0) * (item.quantity || 1),
      note: item.note || '',
      options: item.options?.join(', ') || '',
    })),

    // Pricing
    subtotal: shopeeOrder.subtotal || shopeeOrder.sub_total || 0,
    deliveryFee: shopeeOrder.delivery_fee || shopeeOrder.shipping_fee || 0,
    platformFee: shopeeOrder.platform_fee || shopeeOrder.service_fee || 0,
    discount: shopeeOrder.discount || shopeeOrder.total_discount || 0,
    totalAmount: shopeeOrder.total || shopeeOrder.total_amount || 0,

    // Payment
    isPaid: shopeeOrder.is_paid !== false,
    paymentMethod: shopeeOrder.payment_method || 'ShopeePay',

    // Extra
    orderContentMessage: null,
    estimatedDeliveryTime: shopeeOrder.estimated_delivery_time || null,
    createdAt: shopeeOrder.created_at
      ? new Date(shopeeOrder.created_at * 1000)
      : new Date(),
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
