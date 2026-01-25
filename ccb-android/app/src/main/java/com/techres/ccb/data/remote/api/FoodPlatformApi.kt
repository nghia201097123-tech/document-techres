package com.techres.ccb.data.remote.api

import com.techres.ccb.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.Body
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
        @Path("branchId") branchId: String
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
        @Path("branchId") branchId: String
    ): Response<DisconnectedAccountsResponse>

    // ==================== Account Management ====================

    /**
     * Create a new food platform account
     */
    @POST("api/accounts")
    suspend fun createAccount(
        @Body request: CreateAccountRequest
    ): Response<CreateAccountResponse>

    /**
     * Login with username/password
     */
    @POST("api/accounts/{accountId}/login")
    suspend fun login(
        @Path("accountId") accountId: String,
        @Body request: FoodPlatformLoginRequest
    ): Response<FoodPlatformLoginResponse>

    /**
     * Request OTP for phone authentication
     */
    @POST("api/accounts/{accountId}/request-otp")
    suspend fun requestOtp(
        @Path("accountId") accountId: String,
        @Body request: RequestOtpRequest
    ): Response<RequestOtpResponse>

    /**
     * Verify OTP
     */
    @POST("api/accounts/{accountId}/verify-otp")
    suspend fun verifyOtp(
        @Path("accountId") accountId: String,
        @Body request: VerifyOtpRequest
    ): Response<VerifyOtpResponse>

    /**
     * Select store after OTP verification
     */
    @POST("api/accounts/{accountId}/select-store")
    suspend fun selectStore(
        @Path("accountId") accountId: String,
        @Body request: SelectStoreRequest
    ): Response<SelectStoreResponse>

    /**
     * Test connection - verify account can connect to platform
     */
    @POST("api/accounts/{accountId}/test")
    suspend fun testConnection(
        @Path("accountId") accountId: String
    ): Response<TestConnectionResponse>

    /**
     * Disconnect account from platform
     */
    @POST("api/accounts/{accountId}/disconnect")
    suspend fun disconnectAccount(
        @Path("accountId") accountId: String
    ): Response<DisconnectResponse>
}
