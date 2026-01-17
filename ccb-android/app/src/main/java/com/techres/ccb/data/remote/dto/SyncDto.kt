package com.techres.ccb.data.remote.dto

import com.google.gson.annotations.SerializedName

// ============ Auth DTOs ============

data class LoginRequest(
    @SerializedName("tenantId") val tenantId: String,
    @SerializedName("username") val username: String,
    @SerializedName("password") val password: String
)

/**
 * OAuth Login Response from api-oauth via api-gateway
 * Endpoint: POST /api/tenant/auth/login
 */
data class LoginResponse(
    @SerializedName("accessToken") val accessToken: String?,
    @SerializedName("refreshToken") val refreshToken: String?,
    @SerializedName("expiresIn") val expiresIn: Int?,
    @SerializedName("tokenType") val tokenType: String?,
    @SerializedName("user") val user: LoginUserDto?,
    @SerializedName("requiresTwoFactor") val requiresTwoFactor: Boolean?,
    // Error fields
    @SerializedName("message") val message: String?,
    @SerializedName("error") val error: String?,
    @SerializedName("statusCode") val statusCode: Int?
)

/**
 * User info from OAuth response
 */
data class LoginUserDto(
    @SerializedName("id") val id: String,
    @SerializedName("email") val email: String?,
    @SerializedName("name") val name: String,
    @SerializedName("phone") val phone: String?,
    @SerializedName("role") val role: String?,
    @SerializedName("userType") val userType: String?,
    @SerializedName("tenantId") val tenantId: String?,
    @SerializedName("branchId") val branchId: String?,
    @SerializedName("isTwoFactorEnabled") val isTwoFactorEnabled: Boolean?,
    @SerializedName("isEmailVerified") val isEmailVerified: Boolean?,
    @SerializedName("avatarUrl") val avatarUrl: String?,
    @SerializedName("username") val username: String?
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
    @SerializedName("kitchens") val kitchens: List<KitchenDto>?,
    @SerializedName("branchInfo") val branchInfo: BranchInfoDto?,
    @SerializedName("seasonalPrices") val seasonalPrices: List<SeasonalPriceDto>?,
    @SerializedName("coupons") val coupons: List<CouponDto>?,
    // Topping groups với danh sách toppings và gán vào món
    @SerializedName("toppingGroups") val toppingGroups: List<ToppingGroupDto>?,
    // Product notes (ghi chú món ăn)
    @SerializedName("productNotes") val productNotes: List<ProductNoteDto>?,
    // Combo items (các món con trong combo)
    @SerializedName("comboItems") val comboItems: List<ComboItemDto>?,
    // Bill templates (mẫu hóa đơn)
    @SerializedName("billTemplates") val billTemplates: List<BillTemplateDto>?,
    // Bill printer configs (cấu hình máy in bill)
    @SerializedName("billPrinterConfigs") val billPrinterConfigs: List<BillPrinterConfigDto>?
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
    // Tên không dấu để tìm kiếm (VD: "Com chien duong chau")
    @SerializedName("searchName") val searchName: String? = null,
    // Tên viết tắt để tìm kiếm nhanh (VD: "ccdc" cho "Cơm chiên dương châu")
    @SerializedName("abbreviation") val abbreviation: String? = null,
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
    // Kitchen IDs - comma-separated list for routing print to kitchens
    // Synced from web dashboard product-kitchen assignments
    @SerializedName("kitchenIds") val kitchenIds: String? = null,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String,
    // Topping/Variant information
    @SerializedName("toppings") val toppings: List<ProductToppingDto>? = null
)

/**
 * DTO cho thông tin topping của sản phẩm
 */
data class ProductToppingDto(
    @SerializedName("toppingId") val toppingId: String,
    @SerializedName("groupName") val groupName: String = "TOPPING", // SIZE, ĐƯỜNG, ĐÁ, TOPPING
    @SerializedName("groupType") val groupType: String = "topping", // size, sugar, ice, topping, other
    @SerializedName("isRequired") val isRequired: Boolean = false,
    @SerializedName("isMultiple") val isMultiple: Boolean = true,
    @SerializedName("extraPrice") val extraPrice: Double = 0.0,
    @SerializedName("isDefault") val isDefault: Boolean = false,
    @SerializedName("sortOrder") val sortOrder: Int = 0
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

data class KitchenDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("description") val description: String?,
    @SerializedName("kitchenType") val kitchenType: String?, // "cooking", "grill", "bar", "dessert", etc.
    // Printer configuration from dashboard
    @SerializedName("printerName") val printerName: String? = null,
    @SerializedName("printerIp") val printerIp: String? = null,
    @SerializedName("printerPort") val printerPort: Int? = null,
    @SerializedName("printerProtocol") val printerProtocol: String? = null, // ESC_POS or TSPL
    @SerializedName("paperWidth") val paperWidth: Int? = null, // 58 or 80
    @SerializedName("printMode") val printMode: String? = null, // TICKET, LABEL, BOTH
    @SerializedName("printDensity") val printDensity: Int? = null, // 0-15 for TSPL
    @SerializedName("labelWidthMm") val labelWidthMm: Int? = null,
    @SerializedName("labelHeightMm") val labelHeightMm: Int? = null,
    @SerializedName("labelGapMm") val labelGapMm: Int? = null,
    @SerializedName("labelFontScale") val labelFontScale: Float? = null,
    @SerializedName("labelMaxToppings") val labelMaxToppings: Int? = null, // 0 = auto based on size
    // ========== TICKET PRINTING CONFIG ==========
    // Note: All ticket config fields are nullable for backward compatibility with API
    // Default values are applied in SyncRepository mapping
    @SerializedName("ticketCutAfterPrint") val ticketCutAfterPrint: Boolean? = null,
    @SerializedName("ticketPrintItemsSeparately") val ticketPrintItemsSeparately: Boolean? = null,
    @SerializedName("ticketCopies") val ticketCopies: Int? = null,
    @SerializedName("ticketPrintOrderNumber") val ticketPrintOrderNumber: Boolean? = null,
    @SerializedName("ticketPrintTableName") val ticketPrintTableName: Boolean? = null,
    @SerializedName("ticketPrintTime") val ticketPrintTime: Boolean? = null,
    @SerializedName("ticketPrintStoreName") val ticketPrintStoreName: Boolean? = null,
    @SerializedName("ticketStoreName") val ticketStoreName: String? = null,
    @SerializedName("ticketPrintNotes") val ticketPrintNotes: Boolean? = null,
    @SerializedName("ticketFontSize") val ticketFontSize: String? = null,
    @SerializedName("ticketPrintPrice") val ticketPrintPrice: Boolean? = null,
    // ========== LABEL PRINTING CONFIG ==========
    @SerializedName("labelPrintPrice") val labelPrintPrice: Boolean = false,
    @SerializedName("labelPrintStoreName") val labelPrintStoreName: Boolean = false,
    @SerializedName("labelPrintOrderNumber") val labelPrintOrderNumber: Boolean = true,
    @SerializedName("labelPrintTableName") val labelPrintTableName: Boolean = true,
    @SerializedName("labelPrintTime") val labelPrintTime: Boolean = true,
    @SerializedName("labelStoreName") val labelStoreName: String? = null,
    @SerializedName("labelReverse") val labelReverse: Boolean = false,
    // ========== LINE SPACING CONFIG ==========
    @SerializedName("ticketLineSpacing") val ticketLineSpacing: Float? = null, // 0.3 - 1.0, default 0.4
    @SerializedName("labelLineSpacing") val labelLineSpacing: Float? = null, // 0.8 - 1.5, default 1.0
    @SerializedName("sortOrder") val sortOrder: Int = 0,
    @SerializedName("isActive") val isActive: Boolean = true,
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

// ============ Brands & Branches DTOs ============

data class BrandsResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: List<BrandDto>?,
    @SerializedName("message") val message: String?
)

data class BrandDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("logo") val logo: String?,
    @SerializedName("code") val code: String?,
    @SerializedName("companyId") val companyId: String?,
    @SerializedName("companyName") val companyName: String?,
    @SerializedName("isActive") val isActive: Boolean,
    @SerializedName("branches") val branches: List<BranchDto>?
)

data class BranchDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("code") val code: String?,
    @SerializedName("address") val address: String?,
    @SerializedName("phone") val phone: String?,
    @SerializedName("brandId") val brandId: String,
    @SerializedName("brandName") val brandName: String?,
    @SerializedName("isActive") val isActive: Boolean
)

data class BranchesResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: List<BranchDto>?,
    @SerializedName("message") val message: String?
)

// ============ Staff Branch Permissions DTOs ============

/**
 * Response for GET /sync/branches-brands/{staffId}
 * Contains brands and branches that the staff has permission to access
 */
data class StaffBranchPermissionsResponse(
    @SerializedName("data") val data: List<BrandWithBranchesDto>?,
    @SerializedName("defaultBranchId") val defaultBranchId: String?,
    @SerializedName("syncedAt") val syncedAt: String?,
    // Error fields
    @SerializedName("message") val message: String?,
    @SerializedName("error") val error: String?,
    @SerializedName("statusCode") val statusCode: Int?
)

/**
 * Brand with its branches for staff permission sync
 */
data class BrandWithBranchesDto(
    @SerializedName("brand") val brand: SyncBrandDto,
    @SerializedName("branches") val branches: List<SyncBranchDto>
)

/**
 * Brand info in sync response
 */
data class SyncBrandDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("code") val code: String?,
    @SerializedName("logoUrl") val logoUrl: String?,
    @SerializedName("isActive") val isActive: Boolean
)

/**
 * Branch info in sync response
 */
data class SyncBranchDto(
    @SerializedName("id") val id: String,
    @SerializedName("brandId") val brandId: String,
    @SerializedName("name") val name: String,
    @SerializedName("storeCode") val storeCode: String?,
    @SerializedName("address") val address: String?,
    @SerializedName("phone") val phone: String?,
    @SerializedName("isDefault") val isDefault: Boolean,
    @SerializedName("status") val status: String?
)

// ============ Seasonal Price DTOs ============

data class SeasonalPriceProductDto(
    @SerializedName("productId") val productId: String
)

data class SeasonalPriceDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("description") val description: String?,
    @SerializedName("adjustmentType") val adjustmentType: String,
    @SerializedName("adjustmentValue") val adjustmentValue: Double,
    @SerializedName("startDate") val startDate: String,
    @SerializedName("endDate") val endDate: String,
    @SerializedName("sortOrder") val sortOrder: Int,
    @SerializedName("isActive") val isActive: Boolean,
    @SerializedName("products") val products: List<SeasonalPriceProductDto>,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String
)

// ============ Coupon DTOs ============

data class CouponDto(
    @SerializedName("id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("name") val name: String,
    @SerializedName("description") val description: String?,
    @SerializedName("couponType") val couponType: String,
    // Áp dụng cho: bill (hóa đơn), item (món), category (danh mục)
    @SerializedName("applyTo") val applyTo: String = "bill",
    // Cách kích hoạt: manual (nhập mã), auto (tự động)
    @SerializedName("activationType") val activationType: String = "manual",
    @SerializedName("discountValue") val discountValue: Double,
    @SerializedName("maxDiscount") val maxDiscount: Double?,
    @SerializedName("minOrderAmount") val minOrderAmount: Double,
    // Số lượng tối thiểu để áp dụng (cho item/category)
    @SerializedName("minQuantity") val minQuantity: Int = 1,
    // Danh sách product IDs (khi applyTo=item)
    @SerializedName("productIds") val productIds: List<String>? = null,
    // Danh sách category IDs (khi applyTo=category)
    @SerializedName("categoryIds") val categoryIds: List<String>? = null,
    // Có thể kết hợp với coupon khác
    @SerializedName("isCombinable") val isCombinable: Boolean = false,
    // Độ ưu tiên (số nhỏ = ưu tiên cao)
    @SerializedName("priority") val priority: Int = 100,
    @SerializedName("usageLimit") val usageLimit: Int?,
    @SerializedName("usageCount") val usageCount: Int,
    @SerializedName("dailyLimit") val dailyLimit: Int?,
    @SerializedName("dailyUsageCount") val dailyUsageCount: Int,
    @SerializedName("requiresApproval") val requiresApproval: Boolean,
    @SerializedName("approvalThreshold") val approvalThreshold: Double?,
    @SerializedName("startDate") val startDate: String?,
    @SerializedName("endDate") val endDate: String?,
    @SerializedName("sortOrder") val sortOrder: Int,
    @SerializedName("isActive") val isActive: Boolean,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String
)

// ============ Topping Group DTOs ============

/**
 * Nhóm topping (ví dụ: SIZE, ĐƯỜNG, ĐÁ, TOPPING)
 * Mỗi nhóm có danh sách topping items và danh sách sản phẩm được gán
 */
data class ToppingGroupDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,                          // SIZE, ĐƯỜNG, ĐÁ, TOPPING
    @SerializedName("groupType") val groupType: String = "topping",    // size, sugar, ice, topping, other
    @SerializedName("isRequired") val isRequired: Boolean = false,     // Bắt buộc chọn?
    @SerializedName("isMultiple") val isMultiple: Boolean = true,      // Chọn nhiều?
    @SerializedName("minSelect") val minSelect: Int = 0,               // Số tối thiểu cần chọn
    @SerializedName("maxSelect") val maxSelect: Int = 99,              // Số tối đa được chọn
    @SerializedName("sortOrder") val sortOrder: Int = 0,
    @SerializedName("isActive") val isActive: Boolean = true,
    @SerializedName("toppings") val toppings: List<ToppingItemDto>,    // Danh sách topping trong nhóm
    @SerializedName("productIds") val productIds: List<String>?,       // Danh sách sản phẩm được gán nhóm này
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String
)

/**
 * Topping item trong nhóm (ví dụ: Size S, Size M)
 */
data class ToppingItemDto(
    @SerializedName("id") val id: String,
    @SerializedName("code") val code: String?,                         // TOP2962
    @SerializedName("name") val name: String,                          // Size S
    @SerializedName("price") val price: Double = 0.0,                  // Giá thêm (+5,000đ)
    @SerializedName("isDefault") val isDefault: Boolean = false,       // Mặc định?
    @SerializedName("maxQuantity") val maxQuantity: Int = 5,           // Tối đa: 5
    @SerializedName("sortOrder") val sortOrder: Int = 0,
    @SerializedName("isActive") val isActive: Boolean = true
)

// ============ Product Note DTOs ============

/**
 * Ghi chú món ăn (Product Note)
 * Ví dụ: "Không hành", "Ít đá", "Không đường"
 */
data class ProductNoteDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("description") val description: String?,
    @SerializedName("sortOrder") val sortOrder: Int = 0,
    @SerializedName("isActive") val isActive: Boolean = true,
    @SerializedName("productIds") val productIds: List<String>?,       // Danh sách sản phẩm được gán ghi chú này
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String
)

// ============ Combo Item DTOs ============

/**
 * Thông tin món con trong combo
 * Ví dụ: Combo "Cơm gà + Trà sữa" gồm có: "Cơm gà" x1, "Trà sữa" x1
 */
data class ComboItemDto(
    @SerializedName("id") val id: String,
    @SerializedName("comboId") val comboId: String,            // ID của sản phẩm combo (sản phẩm cha)
    @SerializedName("productId") val productId: String,        // ID của sản phẩm con trong combo
    @SerializedName("productName") val productName: String,    // Tên sản phẩm con (để hiển thị không cần join)
    @SerializedName("productCode") val productCode: String?,   // Mã sản phẩm con
    @SerializedName("quantity") val quantity: Int = 1,         // Số lượng sản phẩm con trong combo
    @SerializedName("sortOrder") val sortOrder: Int = 0,
    @SerializedName("isActive") val isActive: Boolean = true
)

// ============ Bill Template DTOs ============

/**
 * Mẫu hóa đơn (Bill Template)
 * Được cấu hình từ web-dashboard và sync về CCB
 */
data class BillTemplateDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("templateType") val templateType: String = "classic",
    @SerializedName("description") val description: String?,
    // Header config
    @SerializedName("showLogo") val showLogo: Boolean = true,
    @SerializedName("logoUrl") val logoUrl: String?,
    @SerializedName("storeName") val storeName: String,
    @SerializedName("storeAddress") val storeAddress: String?,
    @SerializedName("storePhone") val storePhone: String?,
    @SerializedName("taxCode") val taxCode: String?,
    @SerializedName("headerText") val headerText: String?,
    // Content config
    @SerializedName("billTitle") val billTitle: String = "HÓA ĐƠN BÁN HÀNG",
    @SerializedName("showOrderNumber") val showOrderNumber: Boolean = true,
    @SerializedName("showTableName") val showTableName: Boolean = true,
    @SerializedName("showStaffName") val showStaffName: Boolean = true,
    @SerializedName("showCustomerName") val showCustomerName: Boolean = true,
    @SerializedName("showDateTime") val showDateTime: Boolean = true,
    @SerializedName("dateFormat") val dateFormat: String = "dd/MM/yyyy HH:mm",
    // Time tracking config
    @SerializedName("showCheckInTime") val showCheckInTime: Boolean = false,
    @SerializedName("showCheckOutTime") val showCheckOutTime: Boolean = false,
    @SerializedName("checkInLabel") val checkInLabel: String = "Giờ vào",
    @SerializedName("checkOutLabel") val checkOutLabel: String = "Giờ ra",
    // Items config
    @SerializedName("showItemCode") val showItemCode: Boolean = false,
    @SerializedName("showItemNote") val showItemNote: Boolean = true,
    @SerializedName("showUnitPrice") val showUnitPrice: Boolean = true,
    @SerializedName("showQuantity") val showQuantity: Boolean = true,
    // Price config
    @SerializedName("showSubtotal") val showSubtotal: Boolean = true,
    // Discount config (4 loại giảm giá)
    @SerializedName("showItemDiscount") val showItemDiscount: Boolean = true,
    @SerializedName("showTotalItemDiscount") val showTotalItemDiscount: Boolean = true,
    @SerializedName("itemDiscountLabel") val itemDiscountLabel: String = "Giảm giá món",
    @SerializedName("showBillDiscount") val showBillDiscount: Boolean = true,
    @SerializedName("billDiscountLabel") val billDiscountLabel: String = "Giảm giá hóa đơn",
    @SerializedName("showCouponDiscount") val showCouponDiscount: Boolean = true,
    @SerializedName("couponDiscountLabel") val couponDiscountLabel: String = "Mã giảm giá",
    @SerializedName("showVoucherDiscount") val showVoucherDiscount: Boolean = true,
    @SerializedName("voucherDiscountLabel") val voucherDiscountLabel: String = "Voucher",
    @SerializedName("showTotalDiscount") val showTotalDiscount: Boolean = true,
    @SerializedName("totalDiscountLabel") val totalDiscountLabel: String = "Tổng giảm giá",
    @SerializedName("showDiscount") val showDiscount: Boolean = true, // Deprecated
    @SerializedName("showDiscountPercent") val showDiscountPercent: Boolean = true,
    @SerializedName("showServiceFee") val showServiceFee: Boolean = true,
    @SerializedName("showVat") val showVat: Boolean = true,
    @SerializedName("showVatDetails") val showVatDetails: Boolean = true,
    @SerializedName("showPriceBeforeVat") val showPriceBeforeVat: Boolean = true,
    @SerializedName("showPriceAfterVat") val showPriceAfterVat: Boolean = true,
    @SerializedName("vatLabel") val vatLabel: String = "VAT",
    @SerializedName("priceBeforeVatLabel") val priceBeforeVatLabel: String = "Giá trước thuế",
    @SerializedName("priceAfterVatLabel") val priceAfterVatLabel: String = "Giá sau thuế",
    // Payment config
    @SerializedName("showPaymentMethod") val showPaymentMethod: Boolean = true,
    @SerializedName("showReceivedAmount") val showReceivedAmount: Boolean = true,
    @SerializedName("showChangeAmount") val showChangeAmount: Boolean = true,
    // Footer config
    @SerializedName("showQrCode") val showQrCode: Boolean = false,
    @SerializedName("qrCodeType") val qrCodeType: String = "order_id",
    @SerializedName("qrCodeContent") val qrCodeContent: String?,
    @SerializedName("showBarcode") val showBarcode: Boolean = false,
    @SerializedName("thankYouMessage") val thankYouMessage: String = "Cảm ơn quý khách!",
    @SerializedName("comebackMessage") val comebackMessage: String = "Hẹn gặp lại!",
    @SerializedName("footerText") val footerText: String?,
    @SerializedName("showWifiInfo") val showWifiInfo: Boolean = false,
    @SerializedName("wifiName") val wifiName: String?,
    @SerializedName("wifiPassword") val wifiPassword: String?,
    // Style config
    @SerializedName("paperWidth") val paperWidth: Int = 80,
    @SerializedName("fontSize") val fontSize: String = "normal",
    @SerializedName("separatorChar") val separatorChar: String = "-",
    @SerializedName("doubleSeparatorChar") val doubleSeparatorChar: String = "=",
    @SerializedName("cutPaper") val cutPaper: Boolean = true,
    @SerializedName("openCashDrawer") val openCashDrawer: Boolean = false,
    @SerializedName("beepAfterPrint") val beepAfterPrint: Boolean = false,
    @SerializedName("numberOfCopies") val numberOfCopies: Int = 1,
    // Status
    @SerializedName("isDefault") val isDefault: Boolean = false,
    @SerializedName("isActive") val isActive: Boolean = true,
    @SerializedName("sortOrder") val sortOrder: Int = 0,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String
)

/**
 * Cấu hình máy in bill (Bill Printer Config)
 */
data class BillPrinterConfigDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("description") val description: String?,
    // Connection config
    @SerializedName("connectionType") val connectionType: String = "network",
    @SerializedName("printerIp") val printerIp: String?,
    @SerializedName("printerPort") val printerPort: Int = 9100,
    @SerializedName("printerMac") val printerMac: String?,
    @SerializedName("printerUsbPath") val printerUsbPath: String?,
    // Template config
    @SerializedName("templateId") val templateId: String?,
    // Print config
    @SerializedName("paperWidth") val paperWidth: Int = 80,
    @SerializedName("autoPrintOnPayment") val autoPrintOnPayment: Boolean = true,
    @SerializedName("printPreview") val printPreview: Boolean = false,
    @SerializedName("numberOfCopies") val numberOfCopies: Int = 1,
    @SerializedName("cutPaper") val cutPaper: Boolean = true,
    @SerializedName("openCashDrawer") val openCashDrawer: Boolean = true,
    @SerializedName("beepAfterPrint") val beepAfterPrint: Boolean = true,
    // Retry config
    @SerializedName("retryCount") val retryCount: Int = 3,
    @SerializedName("retryDelayMs") val retryDelayMs: Int = 1000,
    @SerializedName("connectionTimeoutMs") val connectionTimeoutMs: Int = 5000,
    // Status
    @SerializedName("isDefault") val isDefault: Boolean = false,
    @SerializedName("isActive") val isActive: Boolean = true,
    @SerializedName("sortOrder") val sortOrder: Int = 0,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String
)
