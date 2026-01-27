package com.techres.ccb.data.remote.api

import com.techres.ccb.data.remote.dto.BranchInfoResponse
import com.techres.ccb.data.remote.dto.BranchesResponse
import com.techres.ccb.data.remote.dto.BrandsResponse
import com.techres.ccb.data.remote.dto.CategoryDto
import com.techres.ccb.data.remote.dto.FullSyncResponse
import com.techres.ccb.data.remote.dto.OrderUploadDto
import com.techres.ccb.data.remote.dto.ProductDto
import com.techres.ccb.data.remote.dto.AreaDto
import com.techres.ccb.data.remote.dto.TableDto
import com.techres.ccb.data.remote.dto.StaffDto
import com.techres.ccb.data.remote.dto.ShiftUploadDto
import com.techres.ccb.data.remote.dto.StaffBranchPermissionsResponse
import com.techres.ccb.data.remote.dto.SyncResponse
import com.techres.ccb.data.remote.dto.UploadResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Master Data API interface for api-master-data endpoints
 * Base URL: APISIX Gateway with x-svc-id: 1504
 * All endpoints use /api/v1/ prefix (api-master-data global prefix)
 */
interface MasterDataApi {

    // ============ Staff Branch Permissions Sync ============

    /**
     * Get brands and branches that staff has permission to access
     * Only syncs the branches that the logged-in staff member can work with
     */
    @GET("api/v1/sync/branches-brands/{staffId}")
    suspend fun getStaffBranchPermissions(
        @Header("Authorization") token: String,
        @Path("staffId") staffId: String
    ): Response<StaffBranchPermissionsResponse>

    // ============ Master Data Sync ============

    // Full sync endpoint - returns all master data including kitchenIds for products
    @GET("api/v1/sync/full")
    suspend fun getFullSyncData(
        @Header("Authorization") token: String,
        @Query("branchId") branchId: String
    ): Response<FullSyncResponse>

    @GET("api/v1/sync/categories")
    suspend fun getCategories(
        @Header("Authorization") token: String,
        @Query("branchId") branchId: String,
        @Query("since") since: String? = null
    ): Response<SyncResponse<CategoryDto>>

    // Products with kitchenIds for print routing
    @GET("api/v1/sync/products")
    suspend fun getProducts(
        @Header("Authorization") token: String,
        @Query("branchId") branchId: String,
        @Query("since") since: String? = null
    ): Response<SyncResponse<ProductDto>>

    @GET("api/v1/sync/areas")
    suspend fun getAreas(
        @Header("Authorization") token: String,
        @Query("branchId") branchId: String,
        @Query("since") since: String? = null
    ): Response<SyncResponse<AreaDto>>

    @GET("api/v1/sync/tables")
    suspend fun getTables(
        @Header("Authorization") token: String,
        @Query("branchId") branchId: String,
        @Query("since") since: String? = null
    ): Response<SyncResponse<TableDto>>

    @GET("api/v1/sync/staff")
    suspend fun getStaff(
        @Header("Authorization") token: String,
        @Query("branchId") branchId: String,
        @Query("since") since: String? = null
    ): Response<SyncResponse<StaffDto>>

    @POST("api/v1/sync/orders")
    suspend fun uploadOrders(
        @Header("Authorization") token: String,
        @Body orders: List<OrderUploadDto>
    ): Response<UploadResponse>

    @POST("api/v1/sync/shifts")
    suspend fun uploadShifts(
        @Header("Authorization") token: String,
        @Body shifts: List<ShiftUploadDto>
    ): Response<UploadResponse>

    @GET("api/v1/branch/{branchId}")
    suspend fun getBranchInfo(
        @Header("Authorization") token: String,
        @Path("branchId") branchId: String
    ): Response<BranchInfoResponse>

    @GET("api/v1/brands")
    suspend fun getBrands(
        @Header("Authorization") token: String
    ): Response<BrandsResponse>

    @GET("api/v1/brands/{brandId}/branches")
    suspend fun getBranchesByBrand(
        @Header("Authorization") token: String,
        @Path("brandId") brandId: String
    ): Response<BranchesResponse>

    @GET("api/v1/branches")
    suspend fun getAllBranches(
        @Header("Authorization") token: String
    ): Response<BranchesResponse>
}
