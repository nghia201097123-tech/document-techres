package com.techres.ccb.data.remote.dto

import com.google.gson.annotations.SerializedName

// ==================== Sync Response ====================

data class FoodPlatformSyncResponse(
    val status: Int,
    val message: String?,
    val data: FoodPlatformSyncData?
)

data class FoodPlatformSyncData(
    val accounts: List<FoodPlatformAccountWithMappings>,
    val itemMappings: List<FoodPlatformItemMappingDto>?,
    val syncedAt: String?
)

data class FoodPlatformAccountWithMappings(
    val account: FoodPlatformAccountDto,
    val storeMappings: List<FoodPlatformStoreMappingDto>
)

data class FoodPlatformAccountDto(
    val id: String,
    val tenantId: String?,
    val platform: String,
    val displayName: String?,
    val username: String?,
    val status: String,
    val externalMerchantId: String?,
    val externalMerchantName: String?,
    val isActive: Boolean?,
    val lastError: String?,
    val errorCount: Int?
)

data class FoodPlatformStoreMappingDto(
    val id: String,
    val externalStoreId: String,
    val externalStoreName: String?,
    val externalStoreAddress: String?,
    val branchId: Int,
    val branchName: String?,
    val isActive: Boolean?
)

data class FoodPlatformItemMappingDto(
    val id: String,
    val accountId: String,
    val externalItemId: String,
    val externalPlatformItemId: String?,
    val externalItemName: String?,
    val techresBrandId: Int?,
    val techresItemId: Int?,
    val techresItemName: String?,
    val mappingType: String?
)

// ==================== Reconnect Response ====================

data class ReconnectResponse(
    val status: Int,
    val message: String?,
    val data: ReconnectData?
)

data class ReconnectData(
    val accountId: String?,
    val status: String?,
    val reconnected: Boolean?,
    val error: String?
)

// ==================== Disconnected Accounts Response ====================

data class DisconnectedAccountsResponse(
    val status: Int,
    val message: String?,
    val data: DisconnectedAccountsData?
)

data class DisconnectedAccountsData(
    val disconnectedAccounts: List<DisconnectedAccountDto>,
    val count: Int
)

data class DisconnectedAccountDto(
    val accountId: String,
    val platform: String,
    val displayName: String?,
    val username: String?,
    val status: String,
    val lastError: String?,
    val errorCount: Int?
)

// ==================== Create Account ====================

data class CreateAccountRequest(
    val tenantId: String,
    val platform: String,
    val authType: String,
    val displayName: String? = null
)

data class CreateAccountResponse(
    val status: Int,
    val message: String?,
    val data: CreatedAccountDto?
)

data class CreatedAccountDto(
    val id: String,
    val tenantId: String?,
    val platform: String?,
    val authType: String?,
    val displayName: String?,
    val status: String?
)

// ==================== Login ====================

data class FoodPlatformLoginRequest(
    val username: String,
    val password: String,
    val branchId: String? = null
)

data class FoodPlatformLoginResponse(
    val status: Int,
    val message: String?,
    val data: LoginResultDto?
)

data class LoginResultDto(
    val accountId: String?,
    val status: String?,
    val merchantId: String?,
    val merchantName: String?
)

// ==================== Request OTP ====================

data class RequestOtpRequest(
    val phoneNumber: String
)

data class RequestOtpResponse(
    val status: Int,
    val message: String?,
    val data: RequestOtpResultDto?
)

data class RequestOtpResultDto(
    val success: Boolean?,
    val message: String?,
    val expiresIn: Int?
)

// ==================== Verify OTP ====================

data class VerifyOtpRequest(
    val otp: String
)

data class VerifyOtpResponse(
    val status: Int,
    val message: String?,
    val data: VerifyOtpResultDto?
)

data class VerifyOtpResultDto(
    val success: Boolean?,
    val stores: List<StoreDto>?
)

data class StoreDto(
    val merchantId: String?,
    val storeName: String?,
    val storeAddress: String?
)

// ==================== Select Store ====================

data class SelectStoreRequest(
    val merchantId: String,
    val storeName: String
)

data class SelectStoreResponse(
    val status: Int,
    val message: String?,
    val data: LoginResultDto?
)

// ==================== Test Connection ====================

data class TestConnectionResponse(
    val status: Int,
    val message: String?,
    val data: TestConnectionResultDto?
)

data class TestConnectionResultDto(
    val success: Boolean?,
    val message: String?,
    val platform: String?,
    val merchantId: String?,
    val merchantName: String?
)

// ==================== Disconnect ====================

data class DisconnectResponse(
    val status: Int,
    val message: String?,
    val data: DisconnectResultDto?
)

data class DisconnectResultDto(
    val accountId: String?,
    val status: String?
)

// ==================== Poll Orders ====================

data class PollOrdersResponse(
    val status: Int,
    val message: String?,
    val data: PollOrdersData?
)

data class PollOrdersData(
    val branchId: String,
    val totalOrders: Int,
    val newOrders: Int,
    val newOrderIds: List<String>?,
    val accounts: List<PollOrdersAccountResult>,
    val orders: List<PollOrderDto>,
    val polledAt: String?
)

data class PollOrdersAccountResult(
    val platform: String,
    val accountId: String,
    val displayName: String?,
    val success: Boolean,
    val ordersCount: Int,
    val newOrdersCount: Int,
    val error: String?,
    val orderStats: OrderStatsDto?
)

data class OrderStatsDto(
    val unreadNumberInNew: Int?,
    val unreadAANumberInPrepare: Int?,
    val unreadViaCallNumberInPrepare: Int?,
    val numberInNew: Int?,
    val numberInPrepare: Int?,
    val numberInReady: Int?,
    val numberInDelivering: Int?
)

data class PollOrderDto(
    val id: String?,
    val externalOrderId: String,
    val orderCode: String,
    val platform: String,
    val status: String,
    @SerializedName("merchantStatus")
    val merchantStatus: String?,           // Trạng thái từ platform: ORDER_IN_PREPARE, ORDER_EXECUTING, COMPLETED, CANCELLED...
    // Customer info
    val customerId: String?,
    val customerName: String?,
    val customerPhone: String?,
    val customerAddress: String?,
    val customerNote: String?,
    // Items
    val items: List<PollOrderItemDto>?,
    val itemsCount: Int?,
    // Payment
    val subtotal: Double?,
    val deliveryFee: Double?,
    val platformFee: Double?,
    val discount: Double?,
    val totalAmount: Double,
    // Additional fee fields (Grab)
    @SerializedName("smallOrderFee")
    val smallOrderFee: Double?,            // Phí đơn hàng nhỏ
    @SerializedName("itemDiscountAmount")
    val itemDiscountAmount: Double?,       // Giảm giá món
    @SerializedName("promotionAmount")
    val promotionAmount: Double?,          // Giảm giá khuyến mãi
    val isPaid: Boolean?,
    val paymentMethod: String?,
    // Driver info
    val driverId: String?,
    val driverName: String?,
    val driverPhone: String?,
    val driverAvatar: String?,
    val driverLicensePlate: String?,
    val estimatedDeliveryTime: String?,
    // Scheduled order (đơn đặt trước)
    @SerializedName("isScheduledOrder")
    val isScheduledOrder: Boolean?,
    @SerializedName("scheduledDeliveryTime")
    val scheduledDeliveryTime: String?,
    // Combined order (đơn ghép)
    @SerializedName("isCombinedOrder")
    val isCombinedOrder: Boolean?,
    @SerializedName("parentOrderId")
    val parentOrderId: String?,
    // Order status message
    val orderContentMessage: String?,
    // Timestamps
    val createdAt: String?,
    val platformCreatedAt: String?,
    val acceptedAt: String?,
    val preparedAt: String?,
    val completedAt: String?,
    val cancelledAt: String?
)

data class PollOrderItemDto(
    val productName: String,
    val quantity: Int,
    val unitPrice: Double?,
    val totalPrice: Double?,
    @SerializedName("discountAmount")
    val discountAmount: Double?,           // Giảm giá cho món
    val note: String?,
    val options: String?,
    val externalProductId: String?,
    val modifiers: List<PollItemModifierGroupDto>?  // Chi tiết modifier groups
)

/**
 * Modifier group từ API
 */
data class PollItemModifierGroupDto(
    val groupId: String?,
    val groupName: String?,
    val modifiers: List<PollItemModifierDto>?
)

/**
 * Modifier từ API
 */
data class PollItemModifierDto(
    val modifierId: String?,
    val modifierName: String?,
    val quantity: Int?,
    val price: Double?
)

// ==================== Order Actions ====================

/**
 * Request to cancel an order
 */
data class CancelOrderRequest(
    val reason: String? = null
)

/**
 * Response for order actions (confirm, cancel, complete)
 */
data class OrderActionResponse(
    val status: Int,
    val message: String?,
    val data: OrderActionData?
)

data class OrderActionData(
    val id: String?,
    val orderCode: String?,
    val status: String?,
    val merchantStatus: String?,
    val confirmedAt: String?,
    val cancelledAt: String?,
    val completedAt: String?,
    val cancelReason: String?
)
