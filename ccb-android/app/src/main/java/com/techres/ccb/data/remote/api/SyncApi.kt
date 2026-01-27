package com.techres.ccb.data.remote.api

import com.techres.ccb.data.remote.dto.OrderSyncPayload
import com.techres.ccb.data.remote.dto.PullSyncResponse
import com.techres.ccb.data.remote.dto.PushSyncResponse
import com.techres.ccb.data.remote.dto.ShiftSyncPayload
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Sync API interface for api-dashboard endpoints
 * Base URL: APISIX Gateway with x-svc-id: 1503
 * All endpoints use /api/ prefix (api-dashboard global prefix)
 */
interface SyncApi {

    // Health check for connectivity verification
    @GET("api/public/health-check")
    suspend fun healthCheck(): Response<Unit>

    // ==================== PULL (Cloud → Local) ====================

    /**
     * Delta sync for master data
     * Returns only changes since the given timestamp
     */
    @GET("api/sync/master-data/delta")
    suspend fun pullMasterDataDelta(
        @Query("branchId") branchId: String,
        @Query("since") since: Long?,
        @Query("version") version: Int?
    ): Response<PullSyncResponse>

    /**
     * Full sync for initial data load (paginated)
     */
    @GET("api/sync/master-data/full")
    suspend fun pullMasterDataFull(
        @Query("branchId") branchId: String,
        @Query("deviceId") deviceId: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): Response<PullSyncResponse>

    // ==================== PUSH (Local → Cloud) ====================

    /**
     * Sync a single order bundle (order + items + payments)
     */
    @POST("api/sync/orders")
    suspend fun pushOrder(
        @Header("X-Device-Id") deviceId: String,
        @Header("X-Idempotency-Key") idempotencyKey: String,
        @Body payload: OrderSyncPayload
    ): Response<PushSyncResponse>

    /**
     * Sync multiple orders in batch
     */
    @POST("api/sync/orders/batch")
    suspend fun pushOrdersBatch(
        @Header("X-Device-Id") deviceId: String,
        @Body payloads: List<OrderSyncPayload>
    ): Response<List<PushSyncResponse>>

    /**
     * Sync a shift (open/close)
     */
    @POST("api/sync/shifts")
    suspend fun pushShift(
        @Header("X-Device-Id") deviceId: String,
        @Header("X-Idempotency-Key") idempotencyKey: String,
        @Body payload: ShiftSyncPayload
    ): Response<PushSyncResponse>

    /**
     * Update an existing order on server
     */
    @PUT("api/sync/orders/{id}")
    suspend fun updateOrder(
        @Path("id") serverId: String,
        @Header("X-Device-Id") deviceId: String,
        @Header("X-Expected-Version") expectedVersion: Int,
        @Body payload: OrderSyncPayload
    ): Response<PushSyncResponse>
}
