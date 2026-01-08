package com.techres.ccb.data.remote.dto

import com.google.gson.annotations.SerializedName

// ============ Auth DTOs ============

data class LoginRequest(
    @SerializedName("tenantId") val tenantId: String,
    @SerializedName("username") val username: String,
    @SerializedName("password") val password: String,
    @SerializedName("deviceId") val deviceId: String? = null,
    @SerializedName("deviceName") val deviceName: String? = null
)

data class LoginResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: LoginData?,
    @SerializedName("message") val message: String?,
    // Alternative structure for web-dashboard style response
    @SerializedName("staff") val staff: LoginStaffDto?,
    @SerializedName("company") val company: LoginCompanyDto?,
    @SerializedName("token") val token: String?
)

data class LoginData(
    @SerializedName("token") val token: String,
    @SerializedName("staff") val staff: LoginStaffDto?,
    @SerializedName("company") val company: LoginCompanyDto?,
    @SerializedName("branchId") val branchId: String?,
    @SerializedName("branchName") val branchName: String?,
    @SerializedName("brandId") val brandId: String?,
    @SerializedName("brandName") val brandName: String?,
    @SerializedName("companyId") val companyId: String?,
    @SerializedName("companyName") val companyName: String?,
    @SerializedName("expiresAt") val expiresAt: String?
)

data class LoginStaffDto(
    @SerializedName("id") val id: String,
    @SerializedName("code") val code: String?,
    @SerializedName("username") val username: String?,
    @SerializedName("name") val name: String,
    @SerializedName("phone") val phone: String?,
    @SerializedName("email") val email: String?,
    @SerializedName("avatarUrl") val avatarUrl: String?,
    @SerializedName("role") val role: String?,
    @SerializedName("isActive") val isActive: Boolean?,
    @SerializedName("departmentId") val departmentId: String?,
    @SerializedName("departmentName") val departmentName: String?,
    @SerializedName("brandId") val brandId: String?,
    @SerializedName("branchId") val branchId: String?
)

data class LoginCompanyDto(
    @SerializedName("id") val id: String,
    @SerializedName("tenantId") val tenantId: String?,
    @SerializedName("name") val name: String,
    @SerializedName("logoUrl") val logoUrl: String?,
    @SerializedName("brandId") val brandId: String?,
    @SerializedName("branchId") val branchId: String?,
    @SerializedName("brandName") val brandName: String?,
    @SerializedName("branchName") val branchName: String?
)

data class VerifyPinRequest(
    @SerializedName("branchId") val branchId: String,
    @SerializedName("pinCode") val pinCode: String
)

data class VerifyPinResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: StaffDto?,
    @SerializedName("message") val message: String?
)

// ============ Sync Response ============

data class SyncResponse<T>(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: List<T>,
    @SerializedName("syncTime") val syncTime: String,
    @SerializedName("hasMore") val hasMore: Boolean = false,
    @SerializedName("message") val message: String?
)

data class FullSyncResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: FullSyncData?,
    @SerializedName("syncTime") val syncTime: String,
    @SerializedName("message") val message: String?
)

data class FullSyncData(
    @SerializedName("categories") val categories: List<CategoryDto>,
    @SerializedName("products") val products: List<ProductDto>,
    @SerializedName("areas") val areas: List<AreaDto>,
    @SerializedName("tables") val tables: List<TableDto>,
    @SerializedName("staff") val staff: List<StaffDto>,
    @SerializedName("branchInfo") val branchInfo: BranchInfoDto?
)

// ============ Master Data DTOs ============

data class CategoryDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("description") val description: String?,
    @SerializedName("imageUrl") val imageUrl: String?,
    @SerializedName("sortOrder") val sortOrder: Int,
    @SerializedName("isActive") val isActive: Boolean,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String
)

data class ProductDto(
    @SerializedName("id") val id: String,
    @SerializedName("categoryId") val categoryId: String?,
    @SerializedName("code") val code: String,
    @SerializedName("name") val name: String,
    @SerializedName("description") val description: String?,
    @SerializedName("imageUrl") val imageUrl: String?,
    @SerializedName("price") val price: Double,
    @SerializedName("costPrice") val costPrice: Double,
    @SerializedName("vatRate") val vatRate: Double,
    @SerializedName("unit") val unit: String?,
    @SerializedName("type") val type: String,
    @SerializedName("isAvailable") val isAvailable: Boolean,
    @SerializedName("isActive") val isActive: Boolean,
    @SerializedName("sortOrder") val sortOrder: Int,
    @SerializedName("preparationTime") val preparationTime: Int,
    @SerializedName("printToKitchen") val printToKitchen: Boolean,
    @SerializedName("printToBar") val printToBar: Boolean,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String
)

data class AreaDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("description") val description: String?,
    @SerializedName("sortOrder") val sortOrder: Int,
    @SerializedName("isActive") val isActive: Boolean,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String
)

data class TableDto(
    @SerializedName("id") val id: String,
    @SerializedName("areaId") val areaId: String?,
    @SerializedName("name") val name: String,
    @SerializedName("capacity") val capacity: Int,
    @SerializedName("sortOrder") val sortOrder: Int,
    @SerializedName("isActive") val isActive: Boolean,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String
)

data class StaffDto(
    @SerializedName("id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("name") val name: String,
    @SerializedName("phone") val phone: String?,
    @SerializedName("email") val email: String?,
    @SerializedName("avatarUrl") val avatarUrl: String?,
    @SerializedName("pinCode") val pinCode: String,
    @SerializedName("role") val role: String,
    @SerializedName("permissions") val permissions: String?,
    @SerializedName("isActive") val isActive: Boolean,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String
)

data class BranchInfoDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("storeCode") val storeCode: String,
    @SerializedName("address") val address: String?,
    @SerializedName("phone") val phone: String?,
    @SerializedName("logoUrl") val logoUrl: String?,
    @SerializedName("brandName") val brandName: String,
    @SerializedName("companyName") val companyName: String,
    @SerializedName("taxCode") val taxCode: String?,
    @SerializedName("modelType") val modelType: String
)

// ============ Upload DTOs ============

data class OrderUploadDto(
    @SerializedName("id") val id: String,
    @SerializedName("branchId") val branchId: String,
    @SerializedName("tableId") val tableId: String?,
    @SerializedName("tableName") val tableName: String?,
    @SerializedName("shiftId") val shiftId: String?,
    @SerializedName("staffId") val staffId: String?,
    @SerializedName("staffName") val staffName: String?,
    @SerializedName("orderNumber") val orderNumber: String,
    @SerializedName("status") val status: String,
    @SerializedName("orderType") val orderType: String,
    @SerializedName("subtotal") val subtotal: Double,
    @SerializedName("discountAmount") val discountAmount: Double,
    @SerializedName("surchargeAmount") val surchargeAmount: Double,
    @SerializedName("vatAmount") val vatAmount: Double,
    @SerializedName("totalAmount") val totalAmount: Double,
    @SerializedName("paidAmount") val paidAmount: Double,
    @SerializedName("paymentMethod") val paymentMethod: String?,
    @SerializedName("paymentStatus") val paymentStatus: String,
    @SerializedName("notes") val notes: String?,
    @SerializedName("guestCount") val guestCount: Int,
    @SerializedName("completedAt") val completedAt: String?,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("items") val items: List<OrderItemUploadDto>
)

data class OrderItemUploadDto(
    @SerializedName("id") val id: String,
    @SerializedName("productId") val productId: String?,
    @SerializedName("productCode") val productCode: String,
    @SerializedName("productName") val productName: String,
    @SerializedName("quantity") val quantity: Int,
    @SerializedName("unitPrice") val unitPrice: Double,
    @SerializedName("discountAmount") val discountAmount: Double,
    @SerializedName("totalPrice") val totalPrice: Double,
    @SerializedName("vatRate") val vatRate: Double,
    @SerializedName("notes") val notes: String?,
    @SerializedName("status") val status: String,
    @SerializedName("createdAt") val createdAt: String
)

data class ShiftUploadDto(
    @SerializedName("id") val id: String,
    @SerializedName("branchId") val branchId: String,
    @SerializedName("staffId") val staffId: String,
    @SerializedName("staffName") val staffName: String,
    @SerializedName("status") val status: String,
    @SerializedName("openingAmount") val openingAmount: Double,
    @SerializedName("closingAmount") val closingAmount: Double,
    @SerializedName("expectedAmount") val expectedAmount: Double,
    @SerializedName("differenceAmount") val differenceAmount: Double,
    @SerializedName("totalOrders") val totalOrders: Int,
    @SerializedName("totalRevenue") val totalRevenue: Double,
    @SerializedName("cashRevenue") val cashRevenue: Double,
    @SerializedName("cardRevenue") val cardRevenue: Double,
    @SerializedName("transferRevenue") val transferRevenue: Double,
    @SerializedName("otherRevenue") val otherRevenue: Double,
    @SerializedName("totalDiscount") val totalDiscount: Double,
    @SerializedName("notes") val notes: String?,
    @SerializedName("openedAt") val openedAt: String,
    @SerializedName("closedAt") val closedAt: String?
)

data class UploadResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("syncedIds") val syncedIds: List<String>,
    @SerializedName("failedIds") val failedIds: List<String>,
    @SerializedName("message") val message: String?
)

data class BranchInfoResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: BranchInfoDto?,
    @SerializedName("message") val message: String?
)

// ============ New Sync DTOs for Pull/Push Flow ============

/**
 * Response for PULL operations (Cloud → Local)
 */
data class PullSyncResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: PullSyncData?,
    @SerializedName("meta") val meta: SyncMeta?,
    @SerializedName("message") val message: String?
)

data class PullSyncData(
    @SerializedName("categories") val categories: List<SyncItem<CategoryDto>>?,
    @SerializedName("products") val products: List<SyncItem<ProductDto>>?,
    @SerializedName("staff") val staff: List<SyncItem<StaffDto>>?,
    @SerializedName("vouchers") val vouchers: List<SyncItem<VoucherDto>>?,
    @SerializedName("paymentMethods") val paymentMethods: List<PaymentMethodDto>?,
    @SerializedName("deletedIds") val deletedIds: DeletedIds?
)

data class SyncItem<T>(
    @SerializedName("data") val data: T,
    @SerializedName("action") val action: String // UPSERT, UPDATE, DELETE
)

data class DeletedIds(
    @SerializedName("categoryIds") val categoryIds: List<String>?,
    @SerializedName("productIds") val productIds: List<String>?,
    @SerializedName("staffIds") val staffIds: List<String>?,
    @SerializedName("voucherIds") val voucherIds: List<String>?
)

data class SyncMeta(
    @SerializedName("serverTimestamp") val serverTimestamp: Long,
    @SerializedName("serverVersion") val serverVersion: Int,
    @SerializedName("hasMore") val hasMore: Boolean,
    @SerializedName("totalChanges") val totalChanges: Int,
    @SerializedName("currentPage") val currentPage: Int?,
    @SerializedName("totalPages") val totalPages: Int?
)

/**
 * Payload for PUSH operations (Local → Cloud)
 */
data class OrderSyncPayload(
    @SerializedName("order") val order: OrderPushDto,
    @SerializedName("items") val items: List<OrderItemPushDto>,
    @SerializedName("payments") val payments: List<PaymentPushDto>
)

data class OrderPushDto(
    @SerializedName("localId") val localId: String,
    @SerializedName("idempotencyKey") val idempotencyKey: String,
    @SerializedName("orderNumber") val orderNumber: String,
    @SerializedName("branchId") val branchId: String,
    @SerializedName("shiftId") val shiftId: String?,
    @SerializedName("staffId") val staffId: String?,
    @SerializedName("staffName") val staffName: String?,
    @SerializedName("tableId") val tableId: String?,
    @SerializedName("tableName") val tableName: String?,
    @SerializedName("customerName") val customerName: String?,
    @SerializedName("customerPhone") val customerPhone: String?,
    @SerializedName("status") val status: String,
    @SerializedName("orderType") val orderType: String,
    @SerializedName("subtotal") val subtotal: Double,
    @SerializedName("discountAmount") val discountAmount: Double,
    @SerializedName("surchargeAmount") val surchargeAmount: Double,
    @SerializedName("vatAmount") val vatAmount: Double,
    @SerializedName("totalAmount") val totalAmount: Double,
    @SerializedName("paidAmount") val paidAmount: Double,
    @SerializedName("paymentStatus") val paymentStatus: String,
    @SerializedName("notes") val notes: String?,
    @SerializedName("guestCount") val guestCount: Int,
    @SerializedName("completedAt") val completedAt: String?,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("version") val version: Int
)

data class OrderItemPushDto(
    @SerializedName("localId") val localId: String,
    @SerializedName("productId") val productId: String?,
    @SerializedName("productCode") val productCode: String,
    @SerializedName("productName") val productName: String,
    @SerializedName("quantity") val quantity: Int,
    @SerializedName("unitPrice") val unitPrice: Double,
    @SerializedName("originalPrice") val originalPrice: Double,
    @SerializedName("discountAmount") val discountAmount: Double,
    @SerializedName("totalPrice") val totalPrice: Double,
    @SerializedName("vatRate") val vatRate: Double,
    @SerializedName("notes") val notes: String?,
    @SerializedName("status") val status: String,
    @SerializedName("priceVersion") val priceVersion: Int,
    @SerializedName("createdAt") val createdAt: String
)

data class PaymentPushDto(
    @SerializedName("localId") val localId: String,
    @SerializedName("idempotencyKey") val idempotencyKey: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("paymentMethod") val paymentMethod: String,
    @SerializedName("paymentMethodName") val paymentMethodName: String,
    @SerializedName("receivedAmount") val receivedAmount: Double?,
    @SerializedName("changeAmount") val changeAmount: Double?,
    @SerializedName("referenceCode") val referenceCode: String?,
    @SerializedName("status") val status: String,
    @SerializedName("paidAt") val paidAt: String
)

data class ShiftSyncPayload(
    @SerializedName("localId") val localId: String,
    @SerializedName("idempotencyKey") val idempotencyKey: String,
    @SerializedName("branchId") val branchId: String,
    @SerializedName("staffId") val staffId: String,
    @SerializedName("staffName") val staffName: String,
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("deviceCode") val deviceCode: String,
    @SerializedName("status") val status: String,
    @SerializedName("openingCash") val openingCash: Double,
    @SerializedName("closingCash") val closingCash: Double?,
    @SerializedName("expectedClosingCash") val expectedClosingCash: Double?,
    @SerializedName("cashVariance") val cashVariance: Double?,
    @SerializedName("totalCashSales") val totalCashSales: Double,
    @SerializedName("totalBankSales") val totalBankSales: Double,
    @SerializedName("totalOrders") val totalOrders: Int,
    @SerializedName("totalRevenue") val totalRevenue: Double,
    @SerializedName("totalDiscount") val totalDiscount: Double,
    @SerializedName("notes") val notes: String?,
    @SerializedName("openedAt") val openedAt: String,
    @SerializedName("closedAt") val closedAt: String?,
    @SerializedName("version") val version: Int
)

/**
 * Response for PUSH operations (Local → Cloud)
 */
data class PushSyncResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("localId") val localId: String?,
    @SerializedName("serverId") val serverId: String?,
    @SerializedName("serverVersion") val serverVersion: Int?,
    @SerializedName("syncedAt") val syncedAt: String?,
    @SerializedName("error") val error: String?,
    @SerializedName("conflictData") val conflictData: ConflictDataDto?
)

data class ConflictDataDto(
    @SerializedName("serverData") val serverData: String, // JSON
    @SerializedName("serverVersion") val serverVersion: Int,
    @SerializedName("serverUpdatedAt") val serverUpdatedAt: String
)

// ============ Additional DTOs ============

data class VoucherDto(
    @SerializedName("id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("name") val name: String,
    @SerializedName("description") val description: String?,
    @SerializedName("discountType") val discountType: String,
    @SerializedName("discountValue") val discountValue: Double,
    @SerializedName("minOrderAmount") val minOrderAmount: Double?,
    @SerializedName("maxDiscountAmount") val maxDiscountAmount: Double?,
    @SerializedName("maxUsageCount") val maxUsageCount: Int?,
    @SerializedName("maxUsagePerCustomer") val maxUsagePerCustomer: Int?,
    @SerializedName("currentUsageCount") val currentUsageCount: Int,
    @SerializedName("startDate") val startDate: Long,
    @SerializedName("endDate") val endDate: Long,
    @SerializedName("isActive") val isActive: Boolean,
    @SerializedName("appliesTo") val appliesTo: String?,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String
)

data class PaymentMethodDto(
    @SerializedName("id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("name") val name: String,
    @SerializedName("type") val type: String,
    @SerializedName("isActive") val isActive: Boolean,
    @SerializedName("sortOrder") val sortOrder: Int
)
