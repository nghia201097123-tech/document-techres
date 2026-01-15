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
import com.techres.ccb.data.remote.dto.SyncResponse
import com.techres.ccb.data.remote.dto.UploadResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface MasterDataApi {
    // Full sync endpoint - returns all master data including kitchenIds for products
    @GET("pos-sync/full")
    suspend fun getFullSyncData(
        @Header("Authorization") token: String,
        @Query("branchId") branchId: String
    ): Response<FullSyncResponse>

    @GET("pos-sync/categories")
    suspend fun getCategories(
        @Header("Authorization") token: String,
        @Query("branchId") branchId: String,
        @Query("since") since: String? = null
    ): Response<SyncResponse<CategoryDto>>

    // Products with kitchenIds for print routing
    @GET("pos-sync/products")
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

    @GET("branch/{branchId}")
    suspend fun getBranchInfo(
        @Header("Authorization") token: String,
        @Path("branchId") branchId: String
    ): Response<BranchInfoResponse>

    @GET("brands")
    suspend fun getBrands(
        @Header("Authorization") token: String
    ): Response<BrandsResponse>

    @GET("brands/{brandId}/branches")
    suspend fun getBranchesByBrand(
        @Header("Authorization") token: String,
        @Path("brandId") brandId: String
    ): Response<BranchesResponse>

    @GET("branches")
    suspend fun getAllBranches(
        @Header("Authorization") token: String
    ): Response<BranchesResponse>
}
