package com.techres.ccb.data.remote.api

import com.techres.ccb.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

/**
 * Authentication API interface
 * Routes through /api/tenant/auth/* -> api-oauth
 */
interface AuthApi {

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("auth/verify-pin")
    suspend fun verifyPin(@Body request: VerifyPinRequest): Response<VerifyPinResponse>

    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): Response<LoginResponse>

    @POST("auth/logout")
    suspend fun logout(@Header("Authorization") token: String): Response<Unit>
}

data class RefreshTokenRequest(
    val refreshToken: String
)
