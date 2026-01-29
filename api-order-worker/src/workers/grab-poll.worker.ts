/**
 * Grab Poll Worker - Piscina Worker Thread
 *
 * This runs in a separate thread pool, isolated from the main NestJS app.
 * Each worker can handle multiple concurrent requests.
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
}

/**
 * Main worker function - called by Piscina
 * Xử lý ĐỒNG BỘ (sequential) để đảm bảo data nhất quán
 */
export default async function pollGrabOrders(account: AccountData) {
  const startTime = Date.now();

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`[GrabWorker] 🚀 START polling for account ${account.id}`);
  console.log(`[GrabWorker] Branch: ${account.branchId}, Platform: ${account.platform}`);

  try {
    // 1. Fetch orders from pagination API
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

    // 2. Xử lý TỪNG order một cách ĐỒNG BỘ (sequential)
    // Đảm bảo mỗi order đều có đầy đủ detail trước khi tiếp tục
    console.log(`[GrabWorker] 📞 Fetching detail SEQUENTIALLY for ${grabOrders.length} orders...`);
    const enrichedOrders: any[] = [];
    let skippedCount = 0;

    for (const grabOrder of grabOrders) {
      const orderId = grabOrder.orderID;
      const orderCode = grabOrder.displayID || `#GR${orderId.slice(-6)}`;

      console.log(`[GrabWorker] ───────────────────────────────────────`);
      console.log(`[GrabWorker] 📋 Processing order ${orderCode} (${orderId})`);

      // Gọi detail API với retry
      const detail = await fetchOrderDetailWithRetry(account.accessToken, orderId, 3);

      if (detail) {
        // Có detail đầy đủ - tạo order hoàn chỉnh
        const order = transformGrabOrderWithDetail(grabOrder, detail);

        // Validate: đảm bảo items có giá
        const hasValidItems = order.items.some((item: any) => item.unitPrice > 0 || item.totalPrice > 0);

        if (hasValidItems) {
          enrichedOrders.push(order);
          console.log(`[GrabWorker] ✅ Order ${orderCode}: ${order.items.length} items với đầy đủ thông tin`);

          // Log first item
          if (order.items.length > 0) {
            const firstItem = order.items[0];
            console.log(
              `[GrabWorker]    Item 1: "${firstItem.productName}", ` +
                `giá: ${firstItem.unitPrice}đ, note: "${firstItem.note || ''}", ` +
                `options: "${firstItem.options || 'không có'}"`,
            );
          }
        } else {
          // Items không có giá - có thể detail API trả về thiếu
          console.warn(`[GrabWorker] ⚠️ Order ${orderCode}: Items không có giá, SKIP`);
          skippedCount++;
        }
      } else {
        // Detail API fail sau retry - skip order này
        console.error(`[GrabWorker] ❌ Order ${orderCode}: Không lấy được detail, SKIP`);
        skippedCount++;
      }

      // Delay nhỏ giữa các request để tránh rate limit
      await sleep(100);
    }

    console.log(`[GrabWorker] ───────────────────────────────────────`);
    console.log(`[GrabWorker] 🏁 DONE: ${enrichedOrders.length} orders thành công, ${skippedCount} skipped`);
    console.log('═══════════════════════════════════════════════════════════');

    return {
      success: true,
      accountId: account.id,
      platform: 'grab',
      orders: enrichedOrders,
      skippedOrders: skippedCount,
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
 * Fetch order detail với retry logic
 * @param token Access token
 * @param orderId Order ID
 * @param maxRetries Số lần retry tối đa
 * @returns Detail object hoặc null nếu fail
 */
async function fetchOrderDetailWithRetry(
  token: string,
  orderId: string,
  maxRetries: number = 3,
): Promise<any | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[GrabWorker]    Attempt ${attempt}/${maxRetries}: Fetching detail...`);
      const detail = await fetchOrderDetail(token, orderId);
      return detail;
    } catch (error: any) {
      console.error(`[GrabWorker]    Attempt ${attempt}/${maxRetries} failed: ${error.message}`);

      if (attempt < maxRetries) {
        // Exponential backoff: 500ms, 1000ms, 2000ms
        const delay = 500 * Math.pow(2, attempt - 1);
        console.log(`[GrabWorker]    Waiting ${delay}ms before retry...`);
        await sleep(delay);
      }
    }
  }

  return null;
}

/**
 * Transform Grab order với detail đầy đủ
 */
function transformGrabOrderWithDetail(grabOrder: GrabPaginationOrder, detail: any) {
  return {
    externalOrderId: grabOrder.orderID,
    orderCode: grabOrder.displayID || `#GR${grabOrder.orderID.slice(-6)}`,
    platform: 'grab',
    status: GRAB_STATUS_MAP[grabOrder.state] || 'NEW',

    // Customer info từ detail
    customerName: detail.customerName || grabOrder.eater?.name || 'Khách hàng',
    customerPhone: detail.customerPhone || formatPhone(grabOrder.eater?.phone),
    customerAddress: detail.customerAddress || '',
    customerNote: detail.customerNote || '',

    // Driver info từ detail
    driverName: detail.driverName || grabOrder.driver?.name || null,
    driverPhone: detail.driverPhone || formatPhone(grabOrder.driver?.phone),
    driverAvatar: detail.driverAvatar || grabOrder.driver?.avatar || null,
    driverLicensePlate: detail.driverLicensePlate || grabOrder.driver?.licensePlate || null,

    // Items từ detail (có đầy đủ giá, note, modifiers)
    items: detail.items || [],

    // Pricing từ detail
    subtotal: detail.subtotal || 0,
    deliveryFee: detail.deliveryFee || 0,
    platformFee: detail.platformFee || 0,
    smallOrderFee: detail.smallOrderFee || 0,
    itemDiscountAmount: detail.itemDiscountAmount || 0,
    promotionAmount: detail.promotionAmount || 0,
    discount: detail.discount || 0,
    totalAmount: detail.totalAmount || 0,

    // Payment
    isPaid: detail.isPaid ?? true,
    paymentMethod: detail.paymentMethod || 'GrabPay',

    // Scheduled order
    isScheduledOrder: detail.isScheduledOrder || false,
    scheduledDeliveryTime: detail.scheduledDeliveryTime || null,

    // Combined order
    isCombinedOrder: detail.isCombinedOrder || false,
    parentOrderId: detail.parentOrderId || null,

    // Timestamps
    createdAt: grabOrder.times?.createdAt ? new Date(grabOrder.times.createdAt) : new Date(),
  };
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch order detail for enrichment
 * Extracts full item details including notes, modifiers, prices, and fee info
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
  const fare = detail?.fare || {};
  const eater = detail?.eater || {};
  const driver = detail?.driver || {};

  // Parse items with full details (note, options, modifiers, prices)
  const items = (detail?.itemInfo?.items || []).map((item: any, index: number) => {
    const unitPrice = parseCurrency(item.fare?.originalItemPriceDisplay);
    const totalPrice = parseCurrency(item.fare?.priceDisplay);

    // Parse modifiers - API can use either:
    // - modifierGroupID/modifierGroupName (newer format)
    // - groupID/groupName (older format)
    const modifierGroups = (item.modifierGroups || []).map((group: any) => ({
      groupId: group.modifierGroupID || group.groupID || '',
      groupName: group.modifierGroupName || group.groupName || '',
      modifiers: (group.modifiers || []).map((mod: any) => ({
        modifierId: mod.modifierID || mod.id || '',
        modifierName: mod.modifierName || mod.name || '',
        price: parseCurrency(mod.priceDisplay || mod.price),
        quantity: mod.quantity || 1,
      })),
    }));

    // Build options string with prices
    const optionsString = modifierGroups
      .flatMap((g: any) => g.modifiers.map((m: any) => {
        if (m.price > 0) {
          return `${m.modifierName} (+${formatCurrencyVN(m.price)})`;
        }
        return m.modifierName;
      }))
      .join(', ');

    // Calculate item discount from discountInfo array
    const discountAmount = (item.discountInfo || []).reduce(
      (sum: number, d: any) => sum + parseCurrency(d.itemDiscountPriceDisplay),
      0,
    );

    // Log item details for debugging
    console.log(
      `[GrabWorker] Detail Item ${index + 1}: "${item.name}", ` +
        `price: ${unitPrice}/${totalPrice}, note: "${item.comment || ''}", ` +
        `discount: ${discountAmount}, options: "${optionsString}", modifierGroups: ${modifierGroups.length}`,
    );

    return {
      productName: item.name,
      quantity: item.quantity || 1,
      unitPrice,
      totalPrice,
      discountAmount,
      note: item.comment || '',
      options: optionsString,
      externalProductId: item.itemID,
      modifierGroups,
    };
  });

  // Log pricing for debugging
  console.log(
    `[GrabWorker] Order pricing: subtotal=${fare.subTotalDisplay}, delivery=${fare.deliveryFeeDisplay}, ` +
      `smallOrder=${fare.smallOrderFeeDisplay}, itemDiscount=${fare.totalDiscountAmountDisplay}, ` +
      `promotion=${fare.promotionDisplay}, total=${fare.reducedPriceDisplay || fare.passengerTotalDisplay}`,
  );

  return {
    // Customer info
    customerName: eater.name || '',
    customerPhone: formatPhone(eater.mobileNumber),
    customerAddress: eater.address || '',
    customerNote: eater.comment || '',
    // Driver info
    driverName: driver?.name || null,
    driverPhone: formatPhone(driver?.mobileNumber),
    driverAvatar: driver?.avatar || null,
    driverLicensePlate: driver?.licensePlate || null,
    // Items with full details
    items,
    // Pricing - according to Grab API:
    // - subTotalDisplay: tổng tiền món ăn
    // - deliveryFeeDisplay: phí giao hàng
    // - smallOrderFeeDisplay: phí đơn hàng nhỏ
    // - totalDiscountAmountDisplay: giảm giá từ nhà hàng (item_discount_amount)
    // - promotionDisplay: giảm giá từ Grab (promotion)
    // - reducedPriceDisplay: tổng tiền khách trả (customer_order_amount)
    subtotal: parseCurrency(fare.subTotalDisplay),
    deliveryFee: parseCurrency(fare.deliveryFeeDisplay),
    smallOrderFee: parseCurrency(fare.smallOrderFeeDisplay),
    itemDiscountAmount: parseCurrency(fare.totalDiscountAmountDisplay),
    promotionAmount: parseCurrency(fare.promotionDisplay),
    discount: parseCurrency(fare.totalDiscountAmountDisplay) + parseCurrency(fare.promotionDisplay),
    totalAmount: parseCurrency(fare.reducedPriceDisplay) || parseCurrency(fare.passengerTotalDisplay),
    // Payment
    isPaid: detail?.paymentMethod !== 'COD',
    paymentMethod: detail?.paymentMethod || 'GrabPay',
    // Scheduled order
    isScheduledOrder: detail?.scheduledOrderInfo?.isScheduledOrder || false,
    scheduledDeliveryTime: detail?.scheduledOrderInfo?.expectedDeliveryTime || null,
    // Combined order
    isCombinedOrder: !!detail?.orderBookings && detail.orderBookings.length > 0,
    parentOrderId: null,
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

/**
 * Format number to Vietnamese currency string
 * 5000 -> "5.000đ"
 */
function formatCurrencyVN(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ';
}
