package com.techres.ccb.presentation.screens.payment

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.dao.BankAccountDao
import com.techres.ccb.data.local.dao.CouponDao
import com.techres.ccb.data.local.entity.BankAccountEntity
import com.techres.ccb.data.local.entity.CouponEntity
import com.techres.ccb.data.local.entity.OrderEntity
import com.techres.ccb.data.local.entity.OrderItemEntity
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.OrderRepository
import com.techres.ccb.util.AppliedCouponInfo
import com.techres.ccb.util.DiscountCalculator
import com.techres.ccb.util.OrderItemForDiscount
import com.google.gson.Gson
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.time.Instant
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import javax.inject.Inject

data class PaymentUiState(
    val order: OrderEntity? = null,
    val orderItems: List<OrderItemEntity> = emptyList(),
    val itemCount: Int = 0,
    val selectedPaymentMethod: String = "cash",
    val receivedAmount: Double = 0.0,
    val changeAmount: Double = 0.0,
    val canProcessPayment: Boolean = false,
    val isProcessing: Boolean = false,
    val isPaymentComplete: Boolean = false,
    // Coupon/Discount state
    val couponCode: String = "",
    val appliedCoupons: List<AppliedCouponInfo> = emptyList(),
    val totalDiscount: Double = 0.0,
    val discountError: String? = null,
    val isApplyingCoupon: Boolean = false,
    // Calculated prices
    val subtotal: Double = 0.0,
    val priceBeforeVat: Double = 0.0,
    val vatAmount: Double = 0.0,
    val grandTotal: Double = 0.0,
    // Bank account for transfer payment
    val bankAccount: BankAccountEntity? = null
)

@HiltViewModel
class PaymentViewModel @Inject constructor(
    private val orderRepository: OrderRepository,
    private val couponDao: CouponDao,
    private val bankAccountDao: BankAccountDao,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(PaymentUiState())
    val uiState: StateFlow<PaymentUiState> = _uiState.asStateFlow()

    private var currentOrderId: String? = null
    private var branchId: String? = null
    private val gson = Gson()

    fun loadOrder(orderId: String) {
        currentOrderId = orderId

        viewModelScope.launch {
            branchId = authRepository.getBranchId()
            val order = orderRepository.getOrderById(orderId)
            val items = orderRepository.getOrderItems(orderId).first()

            val subtotal = items.sumOf { it.unitPrice * it.quantity }

            // Load bank account for transfer payment
            val bankAccount = branchId?.let { branch ->
                bankAccountDao.getPrimaryBankAccount(branch)
            }

            _uiState.value = _uiState.value.copy(
                order = order,
                orderItems = items,
                itemCount = items.sumOf { it.quantity },
                subtotal = subtotal,
                grandTotal = order?.totalAmount ?: subtotal,
                canProcessPayment = order != null && (order.totalAmount > 0 || subtotal > 0),
                bankAccount = bankAccount
            )

            // Auto-apply coupons
            applyAutoCoupons()
        }
    }

    private suspend fun applyAutoCoupons() {
        val branch = branchId ?: return
        val currentDate = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }.format(Date())

        try {
            val autoCoupons = couponDao.getAutoCoupons(branch, currentDate)
            if (autoCoupons.isNotEmpty()) {
                recalculateDiscounts(autoCoupons, null)
            }
        } catch (e: Exception) {
            Log.e("PaymentViewModel", "Error applying auto coupons", e)
        }
    }

    fun setCouponCode(code: String) {
        _uiState.value = _uiState.value.copy(
            couponCode = code,
            discountError = null
        )
    }

    fun applyCoupon() {
        val code = _uiState.value.couponCode.trim()
        if (code.isEmpty()) {
            _uiState.value = _uiState.value.copy(discountError = "Vui lòng nhập mã giảm giá")
            return
        }

        val branch = branchId ?: return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isApplyingCoupon = true, discountError = null)

            try {
                val currentDate = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }.format(Date())

                val coupon = couponDao.getValidCouponByCode(code, branch, currentDate)

                if (coupon == null) {
                    _uiState.value = _uiState.value.copy(
                        isApplyingCoupon = false,
                        discountError = "Mã giảm giá không hợp lệ hoặc đã hết hạn"
                    )
                    return@launch
                }

                // Check if already applied
                if (_uiState.value.appliedCoupons.any { it.couponId == coupon.id }) {
                    _uiState.value = _uiState.value.copy(
                        isApplyingCoupon = false,
                        discountError = "Mã giảm giá này đã được áp dụng"
                    )
                    return@launch
                }

                // Check min order amount
                if (_uiState.value.subtotal < coupon.minOrderAmount) {
                    _uiState.value = _uiState.value.copy(
                        isApplyingCoupon = false,
                        discountError = "Đơn hàng tối thiểu ${formatPrice(coupon.minOrderAmount)} để áp dụng mã này"
                    )
                    return@launch
                }

                // Get auto coupons and add manual coupon
                val autoCoupons = couponDao.getAutoCoupons(branch, currentDate)
                recalculateDiscounts(autoCoupons, coupon)

                _uiState.value = _uiState.value.copy(
                    isApplyingCoupon = false,
                    couponCode = ""
                )
            } catch (e: Exception) {
                Log.e("PaymentViewModel", "Error applying coupon", e)
                _uiState.value = _uiState.value.copy(
                    isApplyingCoupon = false,
                    discountError = "Có lỗi xảy ra, vui lòng thử lại"
                )
            }
        }
    }

    fun removeCoupon(couponId: String) {
        viewModelScope.launch {
            val branch = branchId ?: return@launch
            val currentDate = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }.format(Date())

            // Re-apply only auto coupons
            val autoCoupons = couponDao.getAutoCoupons(branch, currentDate)
            recalculateDiscounts(autoCoupons, null)
        }
    }

    private fun recalculateDiscounts(autoCoupons: List<CouponEntity>, manualCoupon: CouponEntity?) {
        val items = _uiState.value.orderItems

        // Convert to discount calculator format
        val discountItems = items.map { item ->
            OrderItemForDiscount(
                productId = item.productId ?: "",
                productName = item.productName,
                categoryId = item.categoryId,
                unitPrice = item.unitPrice,
                quantity = item.quantity,
                vatRate = item.vatRate
            )
        }

        // Combine coupons
        val allCoupons = if (manualCoupon != null) {
            autoCoupons + manualCoupon
        } else {
            autoCoupons
        }

        // Calculate discounts
        val result = DiscountCalculator.calculateOrderDiscount(
            items = discountItems,
            coupons = allCoupons,
            manualCouponCode = manualCoupon?.code,
            orderAmount = _uiState.value.subtotal
        )

        // Update UI state
        _uiState.value = _uiState.value.copy(
            appliedCoupons = result.appliedCoupons,
            totalDiscount = result.totalDiscount,
            priceBeforeVat = result.priceBeforeVat,
            vatAmount = result.totalVat,
            grandTotal = result.grandTotal,
            canProcessPayment = result.grandTotal > 0
        )
    }

    fun selectPaymentMethod(method: String) {
        // All non-cash methods allow payment if grandTotal > 0
        // Cash requires receivedAmount >= grandTotal
        _uiState.value = _uiState.value.copy(
            selectedPaymentMethod = method,
            canProcessPayment = when (method) {
                "cash" -> _uiState.value.receivedAmount >= _uiState.value.grandTotal
                "bank_transfer", "credit_card", "e_wallet", "qr_code" -> _uiState.value.grandTotal > 0
                else -> _uiState.value.grandTotal > 0
            }
        )
    }

    fun setReceivedAmount(amount: Double) {
        val total = _uiState.value.grandTotal
        val change = if (amount >= total) amount - total else 0.0

        _uiState.value = _uiState.value.copy(
            receivedAmount = amount,
            changeAmount = change,
            canProcessPayment = amount >= total
        )
    }

    fun processPayment() {
        val orderId = currentOrderId ?: return
        val order = _uiState.value.order ?: return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isProcessing = true)

            try {
                val paidAmount = if (_uiState.value.selectedPaymentMethod == "cash") {
                    _uiState.value.receivedAmount
                } else {
                    _uiState.value.grandTotal
                }

                // Serialize applied coupons
                val appliedCouponsJson = if (_uiState.value.appliedCoupons.isNotEmpty()) {
                    gson.toJson(_uiState.value.appliedCoupons)
                } else null

                val couponIds = if (_uiState.value.appliedCoupons.isNotEmpty()) {
                    gson.toJson(_uiState.value.appliedCoupons.map { it.couponId })
                } else null

                val updatedOrder = order.copy(
                    status = "completed",
                    paymentMethod = _uiState.value.selectedPaymentMethod,
                    discountAmount = _uiState.value.totalDiscount,
                    vatAmount = _uiState.value.vatAmount,
                    totalAmount = _uiState.value.grandTotal,
                    paidAmount = paidAmount,
                    changeAmount = _uiState.value.changeAmount,
                    couponId = _uiState.value.appliedCoupons.firstOrNull()?.couponId,
                    couponCode = _uiState.value.appliedCoupons.firstOrNull()?.code,
                    couponIds = couponIds,
                    appliedCouponsJson = appliedCouponsJson,
                    updatedAt = Instant.now().toString(),
                    syncStatus = "pending"
                )

                orderRepository.updateOrder(updatedOrder)

                // Increment usage count for applied coupons
                _uiState.value.appliedCoupons.forEach { coupon ->
                    couponDao.incrementUsage(coupon.couponId)
                    couponDao.incrementDailyUsage(coupon.couponId)
                }

                _uiState.value = _uiState.value.copy(
                    isProcessing = false,
                    isPaymentComplete = true
                )
            } catch (e: Exception) {
                Log.e("PaymentViewModel", "Error processing payment", e)
                _uiState.value = _uiState.value.copy(isProcessing = false)
            }
        }
    }

    private fun formatPrice(amount: Double): String {
        return String.format(Locale.US, "%,.0f đ", amount)
    }
}
