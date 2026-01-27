package com.techres.ccb.data.remote.api

import com.techres.ccb.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

/**
 * POS API interface for api-dashboard endpoints
 * Base URL: APISIX Gateway with x-svc-id: 1503
 * All endpoints use /api/ prefix (api-dashboard global prefix)
 */
interface PosApi {

    // ============ Authentication ============

    @POST("api/auth/login")
    suspend fun login(@Body request: PosLoginRequest): Response<PosLoginResponse>

    @POST("api/auth/verify-pin")
    suspend fun verifyPin(@Body request: VerifyPinRequest): Response<VerifyPinResponse>

    // ============ Master Data Sync ============
    // Note: getStaffBranchPermissions moved to MasterDataApi (api-master-data: 1504)

    @GET("api/sync/full")
    suspend fun getFullSyncData(
        @Header("Authorization") token: String,
        @Query("branchId") branchId: String
    ): Response<FullSyncResponse>

    @GET("api/sync/categories")
    suspend fun getCategories(
        @Header("Authorization") token: String,
        @Query("branchId") branchId: String,
        @Query("since") since: String? = null
    ): Response<SyncResponse<CategoryDto>>

    @GET("api/sync/products")
    suspend fun getProducts(
        @Header("Authorization") token: String,
        @Query("branchId") branchId: String,
        @Query("since") since: String? = null
    ): Response<SyncResponse<ProductDto>>

    @GET("api/sync/areas")
    suspend fun getAreas(
        @Header("Authorization") token: String,
        @Query("branchId") branchId: String,
        @Query("since") since: String? = null
    ): Response<SyncResponse<AreaDto>>

    @GET("api/sync/tables")
    suspend fun getTables(
        @Header("Authorization") token: String,
        @Query("branchId") branchId: String,
        @Query("since") since: String? = null
    ): Response<SyncResponse<TableDto>>

    @GET("api/sync/staff")
    suspend fun getStaff(
        @Header("Authorization") token: String,
        @Query("branchId") branchId: String,
        @Query("since") since: String? = null
    ): Response<SyncResponse<StaffDto>>
}

// ============ POS-specific DTOs ============

data class PosLoginRequest(
    val branchId: String,
    val deviceId: String,
    val pinCode: String
)

data class PosLoginResponse(
    val accessToken: String?,
    val branchId: String?,
    val branchName: String?,
    val brandId: String?,
    val brandName: String?,
    val brandLogoUrl: String?,
    val deviceId: String?,
    // Error fields
    val message: String?,
    val error: String?,
    val statusCode: Int?
)
