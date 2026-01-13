package com.techres.ccb.data.remote.api

import com.techres.ccb.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

/**
 * POS API interface for api-master-data endpoints
 * Base URL: /api/pos/ -> routes to api-master-data via api-gateway
 */
interface PosApi {

    // ============ Authentication ============

    @POST("auth/login")
    suspend fun login(@Body request: PosLoginRequest): Response<PosLoginResponse>

    @POST("auth/verify-pin")
    suspend fun verifyPin(@Body request: VerifyPinRequest): Response<VerifyPinResponse>

    // ============ Staff Branch Permissions Sync ============

    /**
     * Get brands and branches that staff has permission to access
     * Only syncs the branches that the logged-in staff member can work with
     */
    @GET("sync/branches-brands/{staffId}")
    suspend fun getStaffBranchPermissions(
        @Header("Authorization") token: String,
        @Path("staffId") staffId: String
    ): Response<StaffBranchPermissionsResponse>

    // ============ Master Data Sync ============

    @GET("sync/full")
    suspend fun getFullSyncData(
        @Header("Authorization") token: String,
        @Query("branchId") branchId: String
    ): Response<FullSyncResponse>

    @GET("sync/categories")
    suspend fun getCategories(
        @Header("Authorization") token: String,
        @Query("branchId") branchId: String,
        @Query("since") since: String? = null
    ): Response<SyncResponse<CategoryDto>>

    @GET("sync/products")
    suspend fun getProducts(
        @Header("Authorization") token: String,
        @Query("branchId") branchId: String,
        @Query("since") since: String? = null
    ): Response<SyncResponse<ProductDto>>

    @GET("sync/areas")
    suspend fun getAreas(
        @Header("Authorization") token: String,
        @Query("branchId") branchId: String,
        @Query("since") since: String? = null
    ): Response<SyncResponse<AreaDto>>

    @GET("sync/tables")
    suspend fun getTables(
        @Header("Authorization") token: String,
        @Query("branchId") branchId: String,
        @Query("since") since: String? = null
    ): Response<SyncResponse<TableDto>>

    @GET("sync/staff")
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
