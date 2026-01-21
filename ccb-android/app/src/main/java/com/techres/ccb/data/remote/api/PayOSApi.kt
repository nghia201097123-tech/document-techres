package com.techres.ccb.data.remote.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

/**
 * PayOS API for payment operations
 */
interface PayOSApi {

    /**
     * Create a new PayOS payment link
     * Note: PayOS routes are excluded from /api prefix in API Gateway
     */
    @POST("payos/create-payment")
    suspend fun createPayment(@Body request: CreatePaymentRequest): Response<CreatePaymentResponse>

    /**
     * Get payment status by order code
     * Note: PayOS routes are excluded from /api prefix in API Gateway
     */
    @GET("payos/payment-status/{orderCode}")
    suspend fun getPaymentStatus(@Path("orderCode") orderCode: Long): Response<PaymentStatusResponse>

    /**
     * Cancel a pending payment
     * Note: PayOS routes are excluded from /api prefix in API Gateway
     */
    @POST("payos/cancel-payment")
    suspend fun cancelPayment(@Body request: CancelPaymentRequest): Response<CancelPaymentResponse>
}

/**
 * Request to create a PayOS payment
 */
data class CreatePaymentRequest(
    val orderId: String,
    val orderCode: Long,
    val amount: Long,
    val description: String,
    val branchId: String,
    val deviceId: String,
    val tableName: String? = null,
    val customerName: String? = null
)

/**
 * Response from creating a PayOS payment
 */
data class CreatePaymentResponse(
    val success: Boolean,
    val paymentLinkId: String,
    val qrCode: String,           // QR code image URL from PayOS
    val checkoutUrl: String,      // Web checkout URL
    val orderCode: Long,
    val amount: Long
)

/**
 * Response for payment status
 */
data class PaymentStatusResponse(
    val orderCode: Long,
    val status: String,           // PENDING, PROCESSING, PAID, CANCELLED, EXPIRED
    val amount: Long,
    val amountPaid: Long,
    val transactionRef: String?,
    val transactionDateTime: String?
)

/**
 * Request to cancel a payment
 */
data class CancelPaymentRequest(
    val orderCode: Long,
    val reason: String? = null
)

/**
 * Response from cancelling a payment
 */
data class CancelPaymentResponse(
    val success: Boolean,
    val message: String
)
