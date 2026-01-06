package com.techres.ccb.data.remote.dto

import com.google.gson.annotations.SerializedName

// ============ Auth DTOs ============

data class LoginRequest(
    @SerializedName("branchCode") val branchCode: String,
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("deviceName") val deviceName: String
)

data class LoginResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: LoginData?,
    @SerializedName("message") val message: String?
)

data class LoginData(
    @SerializedName("token") val token: String,
    @SerializedName("branchId") val branchId: String,
    @SerializedName("branchName") val branchName: String,
    @SerializedName("brandId") val brandId: String,
    @SerializedName("brandName") val brandName: String,
    @SerializedName("companyId") val companyId: String,
    @SerializedName("companyName") val companyName: String,
    @SerializedName("expiresAt") val expiresAt: String
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
