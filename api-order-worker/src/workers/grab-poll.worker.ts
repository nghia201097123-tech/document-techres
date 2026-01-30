/**
 * Grab Poll Worker - Piscina Worker Thread
 *
 * LUỒNG XỬ LÝ:
 * 1. Worker này CHỈ lấy danh sách đơn từ pagination API
 * 2. Trả về danh sách orders (basic info) cho orders.service.ts
 * 3. orders.service.ts sẽ:
 *    - Bước 1: Lưu orders vào DB
 *    - Bước 2: Gọi detail API và lưu items vào food_order_items
 */

import axios from 'axios';

const GRAB_API_URL = process.env.GRAB_API_BASE_URL || 'https://api.grab.com/food/merchant/v3';

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

/**
 * Interface cho Grab Pagination Order
 * LƯU Ý: Pagination API KHÔNG có giá items (chỉ có itemID, name, quantity, weight)
 * Giá items phải được lấy từ Detail API sau đó!
 */
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
    count?: number;
    items?: Array<{
      itemID?: string;
      name: string;
      quantity: number;
      weight?: number | null;
      // LƯU Ý: KHÔNG có trường price trong pagination response!
    }>;
  };
  orderValue?: string;
  times?: {
    createdAt?: string;
    acceptedAt?: string;
  };
}

/**
 * Main worker function - called by Piscina
 * CHỈ lấy danh sách đơn từ pagination API, KHÔNG gọi detail API
 */
export default async function pollGrabOrders(account: AccountData) {
  const startTime = Date.now();

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`[GrabWorker] 🚀 START polling for account ${account.id}`);
  console.log(`[GrabWorker] Branch: ${account.branchId}, Platform: ${account.platform}`);

  try {
    // Fetch orders from pagination API
    console.log(`[GrabWorker] 📡 Calling pagination API...`);
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
    console.log(`[GrabWorker] 📦 Pagination returned ${grabOrders.length} orders`);

    // Transform orders - basic info only (không gọi detail API)
    const orders = grabOrders.map((grabOrder) => {
      const order = transformPaginationOrder(grabOrder);
      console.log(`[GrabWorker] 📋 Order ${order.orderCode}: ${order.items?.length || 0} items (basic)`);
      return order;
    });

    console.log(`[GrabWorker] 🏁 DONE: ${orders.length} orders từ pagination`);
    console.log('═══════════════════════════════════════════════════════════');

    return {
      success: true,
      accountId: account.id,
      platform: 'grab',
      orders, // Basic orders từ pagination
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
    console.error(`[GrabWorker] ❌ FATAL ERROR: ${error.message}`);
    return {
      success: false,
      accountId: account.id,
      platform: 'grab',
      orders: [],
      error: error?.message || 'Unknown error',
      isUnauthorized: error?.response?.status === 401,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Transform Grab pagination order to basic TechRes format
 * Chỉ có thông tin cơ bản từ pagination API
 *
 * QUAN TRỌNG: Pagination API KHÔNG trả về giá items!
 * - items chỉ có: itemID, name, quantity, weight
 * - KHÔNG có: price, fare, modifiers, discounts
 * - Giá items phải được lấy từ Detail API sau đó bởi orders.service.ts
 */
function transformPaginationOrder(grabOrder: GrabPaginationOrder) {
  const orderValue = parseCurrency(grabOrder.orderValue);

  return {
    externalOrderId: grabOrder.orderID,
    orderCode: grabOrder.displayID || `#GR${grabOrder.orderID.slice(-6)}`,
    platform: 'grab',
    status: GRAB_STATUS_MAP[grabOrder.state] || 'NEW',

    // Customer info (basic)
    customerName: grabOrder.eater?.name || 'Khách hàng',
    customerPhone: formatPhone(grabOrder.eater?.phone),
    customerAddress: '',
    customerNote: '',

    // Driver info (basic)
    driverName: grabOrder.driver?.name || null,
    driverPhone: formatPhone(grabOrder.driver?.phone),
    driverAvatar: grabOrder.driver?.avatar || null,
    driverLicensePlate: grabOrder.driver?.licensePlate || null,

    // Items (basic - CHỈ có tên và số lượng từ pagination, KHÔNG CÓ GIÁ!)
    // Giá sẽ được lấy từ Detail API bởi orders.service.ts
    items: (grabOrder.itemInfo?.items || []).map((item) => ({
      itemID: item.itemID,
      productName: item.name,
      quantity: item.quantity,
      // KHÔNG set unitPrice/totalPrice ở đây vì pagination API không có!
      // orders.service.ts sẽ gọi Detail API để lấy giá
    })),

    // Pricing (basic - chỉ có tổng giá trị đơn hàng)
    subtotal: orderValue,
    deliveryFee: 0,
    platformFee: 0,
    discount: 0,
    totalAmount: orderValue,

    // Payment
    isPaid: true,
    paymentMethod: 'GrabPay',

    // Timestamps
    createdAt: grabOrder.times?.createdAt ? new Date(grabOrder.times.createdAt) : new Date(),

    // Flag để biết chưa có detail - orders.service.ts sẽ gọi Detail API
    hasDetailInfo: false,
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
