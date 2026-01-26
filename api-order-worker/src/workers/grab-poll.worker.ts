/**
 * Grab Poll Worker - Piscina Worker Thread
 *
 * This runs in a separate thread pool, isolated from the main NestJS app.
 * Each worker can handle multiple concurrent requests.
 */

import axios from 'axios';

const GRAB_API_URL = 'https://api.grab.com/food/merchant/v3';

const GRAB_STATUS_MAP: Record<string, string> = {
  'ORDER_NEW': 'NEW',
  'ORDER_IN_PREPARE': 'PREPARING',
  'ORDER_EXECUTING': 'PREPARING',
  'ORDER_READY': 'PREPARING',
  'ORDER_IN_DELIVERY': 'PREPARING',
  'ORDER_DELIVERED': 'COMPLETED',
  'COMPLETED': 'COMPLETED',
  'ORDER_CANCELLED': 'CANCELLED',
  'CANCELLED_DRIVER_FOUND': 'CANCELLED',
  'CANCELLED_DRIVER_NOT_FOUND': 'CANCELLED',
  'CANCELLED_OPERATOR': 'CANCELLED',
  'CANCELLED_MERCHANT': 'CANCELLED',
  'CANCELLED_EATER': 'CANCELLED',
  'FAILED': 'CANCELLED',
};

interface AccountData {
  id: string;
  platform: string;
  accessToken: string;
  branchId: string;
  tenantId: string;
}

interface GrabPaginationOrder {
  orderID: string;
  displayID?: string;
  state: string;
  eater?: {
    ID?: string;
    name?: string;
    phone?: string;
  };
  driver?: {
    ID?: string;
    name?: string;
    phone?: string;
    avatar?: string;
    licensePlate?: string;
  };
  itemInfo?: {
    items?: Array<{
      name: string;
      quantity: number;
      price?: string;
    }>;
  };
  orderValue?: string;
  times?: {
    createdAt?: string;
    acceptedAt?: string;
  };
  orderContentMessage?: string;
}

/**
 * Main worker function - called by Piscina
 */
export default async function pollGrabOrders(account: AccountData) {
  const startTime = Date.now();

  try {
    // 1. Fetch orders from pagination API
    const response = await axios.get(`${GRAB_API_URL}/orders-pagination`, {
      params: {
        autoAcceptGroup: 3,
        pageType: 'Preparing',
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
    const grabOrders: GrabPaginationOrder[] = data.orders || [];

    // 2. Transform orders to TechRes format
    const transformedOrders = grabOrders.map((order) => transformGrabOrder(order));

    // 3. Enrich with detail API if needed (parallel)
    const enrichedOrders = await Promise.all(
      transformedOrders.map(async (order) => {
        // Only fetch detail if missing phone numbers
        if (!order.customerPhone || (!order.driverPhone && order.driverName)) {
          try {
            const detail = await fetchOrderDetail(account.accessToken, order.externalOrderId);
            return { ...order, ...detail };
          } catch (e) {
            // Fallback to basic info if detail fails
            return order;
          }
        }
        return order;
      }),
    );

    return {
      success: true,
      accountId: account.id,
      platform: 'GRAB',
      orders: enrichedOrders,
      orderStats: data.orderStats
        ? {
            newCount: data.orderStats.numberInNew || 0,
            preparingCount: data.orderStats.numberInPrepare || 0,
            readyCount: data.orderStats.numberInReady || 0,
            deliveringCount: data.orderStats.numberInDelivering || 0,
          }
        : undefined,
      pollInterval: data.pollInterval || 60,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      success: false,
      accountId: account.id,
      platform: 'GRAB',
      orders: [],
      error: error?.message || 'Unknown error',
      isUnauthorized: error?.response?.status === 401,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Transform Grab order to TechRes format
 */
function transformGrabOrder(grabOrder: GrabPaginationOrder) {
  const orderValue = parseCurrency(grabOrder.orderValue);

  return {
    externalOrderId: grabOrder.orderID,
    orderCode: grabOrder.displayID || `#GR${grabOrder.orderID.slice(-6)}`,
    platform: 'GRAB',
    status: GRAB_STATUS_MAP[grabOrder.state] || 'NEW',

    // Customer info
    customerName: grabOrder.eater?.name || 'Khách hàng',
    customerPhone: formatPhone(grabOrder.eater?.phone),
    customerAddress: '',
    customerNote: '',

    // Driver info
    driverName: grabOrder.driver?.name || null,
    driverPhone: formatPhone(grabOrder.driver?.phone),
    driverAvatar: grabOrder.driver?.avatar || null,
    driverLicensePlate: grabOrder.driver?.licensePlate || null,

    // Items
    items: (grabOrder.itemInfo?.items || []).map((item) => ({
      productName: item.name,
      quantity: item.quantity,
      unitPrice: parseCurrency(item.price),
      totalPrice: parseCurrency(item.price),
    })),

    // Pricing
    subtotal: orderValue,
    deliveryFee: 0,
    platformFee: 0,
    discount: 0,
    totalAmount: orderValue,

    // Payment
    isPaid: true,
    paymentMethod: 'GrabPay',

    // Extra
    orderContentMessage: grabOrder.orderContentMessage,
    estimatedDeliveryTime: null,
    createdAt: grabOrder.times?.createdAt ? new Date(grabOrder.times.createdAt) : new Date(),
  };
}

/**
 * Fetch order detail for enrichment
 */
async function fetchOrderDetail(token: string, orderId: string) {
  const response = await axios.get(`${GRAB_API_URL}/orders/${orderId}`, {
    headers: {
      'Authorization': token,
      'Accept': '*/*',
    },
    timeout: 10000,
  });

  const detail = response.data.order;

  return {
    customerPhone: formatPhone(detail?.eater?.phone),
    customerAddress: detail?.eater?.address || '',
    customerNote: detail?.eater?.comment || '',
    driverPhone: formatPhone(detail?.driver?.phone),
    subtotal: parseCurrency(detail?.price?.subtotal),
    deliveryFee: parseCurrency(detail?.price?.deliveryFee),
    discount: parseCurrency(detail?.price?.merchantDiscount),
    isPaid: detail?.payment?.status === 'PAID',
    paymentMethod: detail?.payment?.method || 'GrabPay',
  };
}

/**
 * Format Vietnamese phone number
 * "+84 9362 5425 7" -> "0936254257"
 */
function formatPhone(phone?: string): string {
  if (!phone) return '';
  return phone
    .replace(/\D/g, '')
    .replace(/^84/, '0')
    .replace(/^\+84/, '0');
}

/**
 * Parse Vietnamese currency
 * "246.500" -> 246500
 */
function parseCurrency(value?: string | number): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  return parseInt(String(value).replace(/\D/g, ''), 10) || 0;
}
