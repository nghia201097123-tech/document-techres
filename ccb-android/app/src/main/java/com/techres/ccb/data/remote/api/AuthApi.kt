package com.techres.ccb.data.remote.api

import com.techres.ccb.data.remote.dto.LoginRequest
import com.techres.ccb.data.remote.dto.LoginResponse
import com.techres.ccb.data.remote.dto.VerifyPinRequest
import com.techres.ccb.data.remote.dto.VerifyPinResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

interface AuthApi {
    // api-oauth endpoint: /api/auth/login
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    // api-oauth endpoint: /api/auth/verify-pin
    @POST("api/auth/verify-pin")
    suspend fun verifyPin(@Body request: VerifyPinRequest): Response<VerifyPinResponse>
}
