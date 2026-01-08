package com.techres.ccb.data.remote.api

import com.techres.ccb.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface MasterDataApi {

    // ============ Authentication ============

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("auth/verify-pin")
    suspend fun verifyPin(@Body request: VerifyPinRequest): Response<VerifyPinResponse>

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

    // ============ Transaction Data Upload ============

    @POST("sync/orders")
    suspend fun uploadOrders(
        @Header("Authorization") token: String,
        @Body orders: List<OrderUploadDto>
    ): Response<UploadResponse>

    @POST("sync/shifts")
    suspend fun uploadShifts(
        @Header("Authorization") token: String,
        @Body shifts: List<ShiftUploadDto>
    ): Response<UploadResponse>

    // ============ Branch Info ============

    @GET("branch/{branchId}")
    suspend fun getBranchInfo(
        @Header("Authorization") token: String,
        @Path("branchId") branchId: String
    ): Response<BranchInfoResponse>

    // ============ Brands & Branches ============

    /**
     * Get all brands with their branches for the current user
     */
    @GET("brands")
    suspend fun getBrands(
        @Header("Authorization") token: String
    ): Response<BrandsResponse>

    /**
     * Get branches by brand ID
     */
    @GET("brands/{brandId}/branches")
    suspend fun getBranchesByBrand(
        @Header("Authorization") token: String,
        @Path("brandId") brandId: String
    ): Response<BranchesResponse>

    /**
     * Get all branches for current user
     */
    @GET("branches")
    suspend fun getAllBranches(
        @Header("Authorization") token: String
    ): Response<BranchesResponse>
}
