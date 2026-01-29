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

    // 2. Transform orders to TechRes format
    const transformedOrders = grabOrders.map((order) => transformGrabOrder(order));
    console.log(`[GrabWorker] 🔄 Transformed ${transformedOrders.length} orders`);

    // 3. Enrich ALL orders with detail API (parallel)
    // We need full item details (notes, modifiers, prices) from detail API
    console.log(`[GrabWorker] 📞 Fetching detail for ${transformedOrders.length} orders...`);
    const enrichedOrders = await Promise.all(
      transformedOrders.map(async (order) => {
        try {
          console.log(`[GrabWorker] 📞 Fetching detail for order ${order.externalOrderId}...`);
          const detail = await fetchOrderDetail(account.accessToken, order.externalOrderId);
          // Merge detail into order, detail takes priority
          const enriched = { ...order, ...detail };
          console.log(`[GrabWorker] ✅ Enriched order ${order.externalOrderId}: ${detail.items?.length || 0} items`);

          // Log first item details for debugging
          if (detail.items && detail.items.length > 0) {
            const firstItem = detail.items[0];
            console.log(`[GrabWorker]   First item: "${firstItem.productName}", price: ${firstItem.unitPrice}, options: "${firstItem.options || 'none'}"`);
          }

          return enriched;
        } catch (e: any) {
          // Fallback to basic info if detail fails
          console.error(`[GrabWorker] ❌ Detail fetch failed for ${order.externalOrderId}: ${e.message}`);
          return order;
        }
      }),
    );

    console.log(`[GrabWorker] 🏁 Enrichment complete. Returning ${enrichedOrders.length} orders`);
    console.log('═══════════════════════════════════════════════════════════');

    return {
      success: true,
      accountId: account.id,
      platform: 'grab',
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
      platform: 'grab',
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
    platform: 'grab',
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
    estimatedDeliveryTime: null,
    createdAt: grabOrder.times?.createdAt ? new Date(grabOrder.times.createdAt) : new Date(),
  };
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
