package com.techres.ccb.presentation.screens.sale

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.mock.MockData
import com.techres.ccb.domain.model.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

data class SaleUiState(
    // Categories & Products
    val categories: List<Category> = emptyList(),
    val products: List<Product> = emptyList(),
    val selectedCategoryId: String = "all",
    val searchQuery: String = "",

    // Cart
    val cartItems: List<CartItem> = emptyList(),
    val orderType: OrderType = OrderType.DINE_IN,
    val selectedTable: Table? = null,
    val selectedCustomer: Customer? = null,

    // Discount
    val discountAmount: Long = 0,
    val discountReason: String? = null,

    // Tax
    val taxRate: Double = 0.0,  // 0% default, có thể set 10% VAT

    // UI State
    val isLoading: Boolean = false,
    val showVariantDialog: Boolean = false,
    val selectedProductForVariant: Product? = null,
    val showPaymentDialog: Boolean = false,
    val showTableDialog: Boolean = false,
    val showCustomerDialog: Boolean = false,

    // Messages
    val successMessage: String? = null,
    val errorMessage: String? = null
) {
    // Computed properties
    val subtotal: Long
        get() = cartItems.sumOf { it.totalPrice }

    val taxAmount: Long
        get() = (subtotal * taxRate).toLong()

    val totalAmount: Long
        get() = subtotal - discountAmount + taxAmount

    val cartItemCount: Int
        get() = cartItems.sumOf { it.quantity }

    val canCheckout: Boolean
        get() = cartItems.isNotEmpty()
}

@HiltViewModel
class SaleViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(SaleUiState())
    val uiState: StateFlow<SaleUiState> = _uiState.asStateFlow()

    init {
        loadInitialData()
    }

    private fun loadInitialData() {
        viewModelScope.launch {
            _uiState.update { state ->
                state.copy(
                    categories = MockData.categories,
                    products = MockData.getProductsByCategory("all"),
                    isLoading = false
                )
            }
        }
    }

    // ===== CATEGORY & SEARCH =====

    fun selectCategory(categoryId: String) {
        _uiState.update { state ->
            state.copy(
                selectedCategoryId = categoryId,
                products = MockData.getProductsByCategory(categoryId),
                searchQuery = ""
            )
        }
    }

    fun searchProducts(query: String) {
        _uiState.update { state ->
            val products = if (query.isBlank()) {
                MockData.getProductsByCategory(state.selectedCategoryId)
            } else {
                MockData.searchProducts(query)
            }
            state.copy(
                searchQuery = query,
                products = products
            )
        }
    }

    // ===== CART OPERATIONS =====

    fun addToCart(product: Product) {
        if (product.hasVariants && product.variants.isNotEmpty()) {
            // Show variant dialog
            _uiState.update { state ->
                state.copy(
                    showVariantDialog = true,
                    selectedProductForVariant = product
                )
            }
        } else {
            // Add directly to cart
            addItemToCart(product, emptyList(), null)
        }
    }

    fun addItemToCart(
        product: Product,
        selectedVariants: List<SelectedVariant>,
        note: String?
    ) {
        _uiState.update { state ->
            val existingItemIndex = state.cartItems.indexOfFirst { item ->
                item.product.id == product.id &&
                item.selectedVariants == selectedVariants &&
                item.note == note
            }

            val updatedCart = if (existingItemIndex >= 0) {
                // Increase quantity of existing item
                state.cartItems.mapIndexed { index, item ->
                    if (index == existingItemIndex) {
                        item.copy(quantity = item.quantity + 1)
                    } else {
                        item
                    }
                }
            } else {
                // Add new item
                state.cartItems + CartItem(
                    product = product,
                    quantity = 1,
                    selectedVariants = selectedVariants,
                    note = note
                )
            }

            state.copy(
                cartItems = updatedCart,
                showVariantDialog = false,
                selectedProductForVariant = null
            )
        }
    }

    fun updateCartItemQuantity(cartItemId: String, newQuantity: Int) {
        if (newQuantity <= 0) {
            removeFromCart(cartItemId)
            return
        }

        _uiState.update { state ->
            state.copy(
                cartItems = state.cartItems.map { item ->
                    if (item.id == cartItemId) {
                        item.copy(quantity = newQuantity)
                    } else {
                        item
                    }
                }
            )
        }
    }

    fun increaseQuantity(cartItemId: String) {
        _uiState.update { state ->
            state.copy(
                cartItems = state.cartItems.map { item ->
                    if (item.id == cartItemId) {
                        item.copy(quantity = item.quantity + 1)
                    } else {
                        item
                    }
                }
            )
        }
    }

    fun decreaseQuantity(cartItemId: String) {
        val currentItem = _uiState.value.cartItems.find { it.id == cartItemId }
        if (currentItem != null && currentItem.quantity <= 1) {
            removeFromCart(cartItemId)
        } else {
            _uiState.update { state ->
                state.copy(
                    cartItems = state.cartItems.map { item ->
                        if (item.id == cartItemId) {
                            item.copy(quantity = item.quantity - 1)
                        } else {
                            item
                        }
                    }
                )
            }
        }
    }

    fun removeFromCart(cartItemId: String) {
        _uiState.update { state ->
            state.copy(
                cartItems = state.cartItems.filter { it.id != cartItemId }
            )
        }
    }

    fun clearCart() {
        _uiState.update { state ->
            state.copy(
                cartItems = emptyList(),
                discountAmount = 0,
                discountReason = null,
                selectedTable = null,
                selectedCustomer = null
            )
        }
    }

    fun updateCartItemNote(cartItemId: String, note: String?) {
        _uiState.update { state ->
            state.copy(
                cartItems = state.cartItems.map { item ->
                    if (item.id == cartItemId) {
                        item.copy(note = note)
                    } else {
                        item
                    }
                }
            )
        }
    }

    // ===== ORDER TYPE & TABLE =====

    fun setOrderType(orderType: OrderType) {
        _uiState.update { state ->
            state.copy(
                orderType = orderType,
                selectedTable = if (orderType != OrderType.DINE_IN) null else state.selectedTable
            )
        }
    }

    fun selectTable(table: Table) {
        _uiState.update { state ->
            state.copy(
                selectedTable = table,
                showTableDialog = false
            )
        }
    }

    fun showTableDialog() {
        _uiState.update { state ->
            state.copy(showTableDialog = true)
        }
    }

    fun hideTableDialog() {
        _uiState.update { state ->
            state.copy(showTableDialog = false)
        }
    }

    // ===== CUSTOMER =====

    fun selectCustomer(customer: Customer) {
        _uiState.update { state ->
            state.copy(
                selectedCustomer = customer,
                showCustomerDialog = false
            )
        }
    }

    fun clearCustomer() {
        _uiState.update { state ->
            state.copy(selectedCustomer = null)
        }
    }

    fun showCustomerDialog() {
        _uiState.update { state ->
            state.copy(showCustomerDialog = true)
        }
    }

    fun hideCustomerDialog() {
        _uiState.update { state ->
            state.copy(showCustomerDialog = false)
        }
    }

    // ===== DISCOUNT =====

    fun applyDiscount(amount: Long, reason: String?) {
        _uiState.update { state ->
            state.copy(
                discountAmount = amount.coerceAtMost(state.subtotal),
                discountReason = reason
            )
        }
    }

    fun applyPercentDiscount(percent: Int, reason: String?) {
        val discountAmount = (_uiState.value.subtotal * percent / 100)
        applyDiscount(discountAmount, reason)
    }

    fun clearDiscount() {
        _uiState.update { state ->
            state.copy(
                discountAmount = 0,
                discountReason = null
            )
        }
    }

    // ===== VARIANT DIALOG =====

    fun showVariantDialog(product: Product) {
        _uiState.update { state ->
            state.copy(
                showVariantDialog = true,
                selectedProductForVariant = product
            )
        }
    }

    fun hideVariantDialog() {
        _uiState.update { state ->
            state.copy(
                showVariantDialog = false,
                selectedProductForVariant = null
            )
        }
    }

    // ===== PAYMENT =====

    fun showPaymentDialog() {
        if (_uiState.value.canCheckout) {
            _uiState.update { state ->
                state.copy(showPaymentDialog = true)
            }
        }
    }

    fun hidePaymentDialog() {
        _uiState.update { state ->
            state.copy(showPaymentDialog = false)
        }
    }

    fun processPayment(payments: List<Payment>): Order {
        val state = _uiState.value
        val order = Order(
            orderNumber = MockData.generateOrderNumber(),
            orderType = state.orderType,
            tableId = state.selectedTable?.id,
            tableName = state.selectedTable?.name,
            customerId = state.selectedCustomer?.id,
            customerName = state.selectedCustomer?.name,
            customerPhone = state.selectedCustomer?.phone,
            staffId = "staff_001",  // TODO: Get from session
            staffName = "Nhân viên",
            items = state.cartItems,
            subtotal = state.subtotal,
            discountAmount = state.discountAmount,
            discountReason = state.discountReason,
            taxRate = state.taxRate,
            taxAmount = state.taxAmount,
            totalAmount = state.totalAmount,
            payments = payments,
            status = OrderStatus.COMPLETED,
            completedAt = System.currentTimeMillis()
        )

        // Clear cart after successful payment
        _uiState.update { s ->
            s.copy(
                cartItems = emptyList(),
                discountAmount = 0,
                discountReason = null,
                selectedTable = null,
                selectedCustomer = null,
                showPaymentDialog = false,
                successMessage = "Thanh toán thành công! ${order.orderNumber}"
            )
        }

        return order
    }

    // ===== MESSAGES =====

    fun clearSuccessMessage() {
        _uiState.update { state ->
            state.copy(successMessage = null)
        }
    }

    fun clearErrorMessage() {
        _uiState.update { state ->
            state.copy(errorMessage = null)
        }
    }
}
