package com.techres.ccb.data.remote.api

import com.techres.ccb.data.remote.dto.DisconnectedAccountsResponse
import com.techres.ccb.data.remote.dto.FoodPlatformSyncResponse
import com.techres.ccb.data.remote.dto.ReconnectResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface FoodPlatformApi {

    /**
     * Get food platform config for sync
     * Returns accounts (connected + disconnected) and store mappings
     */
    @GET("api/public/sync/food-platform/{branchId}")
    suspend fun getFoodPlatformSync(
        @Path("branchId") branchId: Int
    ): Response<FoodPlatformSyncResponse>

    /**
     * Reconnect a disconnected food platform account
     */
    @POST("api/public/reconnect/{accountId}")
    suspend fun reconnectAccount(
        @Path("accountId") accountId: String
    ): Response<ReconnectResponse>

    /**
     * Get disconnected accounts for a branch
     */
    @GET("api/public/disconnected-accounts/{branchId}")
    suspend fun getDisconnectedAccounts(
        @Path("branchId") branchId: Int
    ): Response<DisconnectedAccountsResponse>
}
