package com.techres.ccb.data.repository

import com.techres.ccb.data.remote.api.CancelPaymentRequest
import com.techres.ccb.data.remote.api.CancelPaymentResponse
import com.techres.ccb.data.remote.api.CreatePaymentRequest
import com.techres.ccb.data.remote.api.CreatePaymentResponse
import com.techres.ccb.data.remote.api.PayOSApi
import com.techres.ccb.data.remote.api.PaymentStatusResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Result wrapper for PayOS operations
 */
sealed class PayOSResult<out T> {
    data class Success<T>(val data: T) : PayOSResult<T>()
    data class Error(val message: String, val code: Int? = null) : PayOSResult<Nothing>()
}

/**
 * Repository for PayOS payment operations
 */
@Singleton
class PayOSRepository @Inject constructor(
    private val payOSApi: PayOSApi
) {
    /**
     * Create a new PayOS payment link
     */
    suspend fun createPayment(
        orderId: String,
        orderCode: Long,
        amount: Long,
        description: String,
        branchId: String,
        deviceId: String,
        tableName: String? = null,
        customerName: String? = null
    ): PayOSResult<CreatePaymentResponse> = withContext(Dispatchers.IO) {
        try {
            val request = CreatePaymentRequest(
                orderId = orderId,
                orderCode = orderCode,
                amount = amount,
                description = description,
                branchId = branchId,
                deviceId = deviceId,
                tableName = tableName,
                customerName = customerName
            )

            val response = payOSApi.createPayment(request)

            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.success) {
                    Timber.d("PayOS payment created: orderCode=$orderCode, qrCode=${body.qrCode}")
                    PayOSResult.Success(body)
                } else {
                    PayOSResult.Error("Payment creation failed")
                }
            } else {
                val errorMsg = response.errorBody()?.string() ?: "Unknown error"
                Timber.e("PayOS create payment failed: ${response.code()} - $errorMsg")
                PayOSResult.Error(errorMsg, response.code())
            }
        } catch (e: Exception) {
            Timber.e(e, "PayOS create payment exception")
            PayOSResult.Error(e.message ?: "Network error")
        }
    }

    /**
     * Get payment status
     */
    suspend fun getPaymentStatus(orderCode: Long): PayOSResult<PaymentStatusResponse> =
        withContext(Dispatchers.IO) {
            try {
                val response = payOSApi.getPaymentStatus(orderCode)

                if (response.isSuccessful && response.body() != null) {
                    PayOSResult.Success(response.body()!!)
                } else {
                    val errorMsg = response.errorBody()?.string() ?: "Unknown error"
                    Timber.e("PayOS get status failed: ${response.code()} - $errorMsg")
                    PayOSResult.Error(errorMsg, response.code())
                }
            } catch (e: Exception) {
                Timber.e(e, "PayOS get status exception")
                PayOSResult.Error(e.message ?: "Network error")
            }
        }

    /**
     * Cancel a pending payment
     */
    suspend fun cancelPayment(
        orderCode: Long,
        reason: String? = null
    ): PayOSResult<CancelPaymentResponse> = withContext(Dispatchers.IO) {
        try {
            val request = CancelPaymentRequest(orderCode, reason)
            val response = payOSApi.cancelPayment(request)

            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.success) {
                    Timber.d("PayOS payment cancelled: orderCode=$orderCode")
                    PayOSResult.Success(body)
                } else {
                    PayOSResult.Error(body.message)
                }
            } else {
                val errorMsg = response.errorBody()?.string() ?: "Unknown error"
                Timber.e("PayOS cancel payment failed: ${response.code()} - $errorMsg")
                PayOSResult.Error(errorMsg, response.code())
            }
        } catch (e: Exception) {
            Timber.e(e, "PayOS cancel payment exception")
            PayOSResult.Error(e.message ?: "Network error")
        }
    }
}
