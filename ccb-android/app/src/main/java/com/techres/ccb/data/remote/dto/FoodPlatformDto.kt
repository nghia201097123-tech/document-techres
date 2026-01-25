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
