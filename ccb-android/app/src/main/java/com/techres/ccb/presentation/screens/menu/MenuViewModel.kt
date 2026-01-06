package com.techres.ccb.presentation.screens.menu

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.entity.CategoryEntity
import com.techres.ccb.data.local.entity.OrderItemEntity
import com.techres.ccb.data.local.entity.ProductEntity
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.CategoryRepository
import com.techres.ccb.data.repository.OrderRepository
import com.techres.ccb.data.repository.ProductRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.Instant
import java.util.UUID
import javax.inject.Inject

data class MenuUiState(
    val categories: List<CategoryEntity> = emptyList(),
    val products: List<ProductEntity> = emptyList(),
    val selectedCategoryId: String? = null,
    val searchQuery: String = "",
    val orderItemCount: Int = 0,
    val isLoading: Boolean = false
)

@HiltViewModel
class MenuViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val categoryRepository: CategoryRepository,
    private val productRepository: ProductRepository,
    private val orderRepository: OrderRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(MenuUiState())
    val uiState: StateFlow<MenuUiState> = _uiState.asStateFlow()

    private var currentOrderId: String? = null
    private var allProducts: List<ProductEntity> = emptyList()

    init {
        loadData()
    }

    private fun loadData() {
        val branchId = authRepository.getBranchId() ?: return

        viewModelScope.launch {
            categoryRepository.getActiveCategories(branchId).collect { categories ->
                _uiState.value = _uiState.value.copy(categories = categories)
            }
        }

        viewModelScope.launch {
            productRepository.getActiveProducts(branchId).collect { products ->
                allProducts = products
                filterProducts()
            }
        }
    }

    fun setOrderId(orderId: String?) {
        currentOrderId = orderId
        if (orderId != null) {
            viewModelScope.launch {
                orderRepository.getOrderItems(orderId).collect { items ->
                    _uiState.value = _uiState.value.copy(orderItemCount = items.sumOf { it.quantity })
                }
            }
        }
    }

    fun selectCategory(categoryId: String?) {
        _uiState.value = _uiState.value.copy(selectedCategoryId = categoryId)
        filterProducts()
    }

    fun search(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
        filterProducts()
    }

    private fun filterProducts() {
        val categoryId = _uiState.value.selectedCategoryId
        val query = _uiState.value.searchQuery.lowercase()

        val filtered = allProducts.filter { product ->
            val matchesCategory = categoryId == null || product.categoryId == categoryId
            val matchesQuery = query.isEmpty() ||
                    product.name.lowercase().contains(query) ||
                    product.code.lowercase().contains(query)
            matchesCategory && matchesQuery
        }

        _uiState.value = _uiState.value.copy(products = filtered)
    }

    fun addProductToOrder(product: ProductEntity) {
        val orderId = currentOrderId ?: return

        viewModelScope.launch {
            val orderItem = OrderItemEntity(
                id = UUID.randomUUID().toString(),
                orderId = orderId,
                productId = product.id,
                productCode = product.code,
                productName = product.name,
                quantity = 1,
                unitPrice = product.price,
                totalPrice = product.price,
                vatRate = product.vatRate,
                note = null,
                status = "pending",
                createdAt = Instant.now().toString(),
                updatedAt = Instant.now().toString()
            )
            orderRepository.addOrderItem(orderItem)

            // Update order total
            val order = orderRepository.getOrderById(orderId)
            if (order != null) {
                val items = orderRepository.getOrderItems(orderId).first()
                val subtotal = items.sumOf { it.totalPrice }
                val total = subtotal - order.discountAmount
                orderRepository.updateOrder(
                    order.copy(
                        subtotal = subtotal,
                        totalAmount = total,
                        updatedAt = Instant.now().toString()
                    )
                )
            }
        }
    }
}
