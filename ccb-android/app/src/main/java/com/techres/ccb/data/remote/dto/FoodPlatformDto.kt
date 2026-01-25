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
