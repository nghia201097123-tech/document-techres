package com.techres.ccb.presentation.screens.sale

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.dao.ProductToppingDao
import com.techres.ccb.data.local.entity.ProductEntity
import com.techres.ccb.data.local.entity.ProductToppingEntity
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.CategoryRepository
import com.techres.ccb.data.repository.ProductRepository
import com.techres.ccb.data.repository.TableRepository
import com.techres.ccb.domain.model.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
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

    // Tables
    val tables: List<Table> = emptyList(),

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
class SaleViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val categoryRepository: CategoryRepository,
    private val productRepository: ProductRepository,
    private val tableRepository: TableRepository,
    private val productToppingDao: ProductToppingDao
) : ViewModel() {

    companion object {
        private const val TAG = "SaleViewModel"
    }

    private val _uiState = MutableStateFlow(SaleUiState())
    val uiState: StateFlow<SaleUiState> = _uiState.asStateFlow()

    private var branchId: String = ""

    // Cache product entities để load topping info
    private var productEntityMap: Map<String, ProductEntity> = emptyMap()

    init {
        loadInitialData()
    }

    private fun loadInitialData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            try {
                branchId = authRepository.getBranchId() ?: ""
                Log.d(TAG, "loadInitialData - branchId: $branchId")

                if (branchId.isEmpty()) {
                    _uiState.update { it.copy(isLoading = false, errorMessage = "Không tìm thấy chi nhánh") }
                    return@launch
                }

                // Load categories from database
                val categoryEntities = categoryRepository.getAllCategories(branchId).first()
                val categories = mutableListOf(
                    Category(id = "all", name = "Tất cả", icon = "🍽️")
                )
                categories.addAll(categoryEntities.map { entity ->
                    Category(
                        id = entity.id,
                        name = entity.name,
                        icon = entity.imageUrl
                    )
                })

                // Load all products
                val productEntities = productRepository.getAllProducts(branchId).first()
                    .filter { it.type != "topping" } // Lọc bỏ topping khỏi danh sách sản phẩm chính

                // Cache product entities
                val allProducts = productRepository.getAllProducts(branchId).first()
                productEntityMap = allProducts.associateBy { it.id }

                // Load topping mappings
                val productIds = productEntities.map { it.id }
                val allToppings = productToppingDao.getToppingsForProductsSync(productIds)
                val toppingsByProduct = allToppings.groupBy { it.productId }

                // Build products with variants
                val products = productEntities.map { entity ->
                    val productToppings = toppingsByProduct[entity.id] ?: emptyList()
                    val variantGroups = buildVariantGroups(productToppings)

                    Product(
                        id = entity.id,
                        code = entity.code,
                        name = entity.name,
                        categoryId = entity.categoryId ?: "",
                        price = entity.price.toLong(),
                        imageUrl = entity.imageUrl,
                        description = entity.description,
                        isActive = entity.isActive,
                        hasVariants = variantGroups.isNotEmpty(),
                        variants = variantGroups
                    )
                }

                // Load tables and areas
                val areas = tableRepository.getAllAreas(branchId).first()
                val tableEntities = tableRepository.getAllTables(branchId).first()
                val areaMap = areas.associateBy { it.id }

                val tables = tableEntities.map { entity ->
                    Table(
                        id = entity.id,
                        name = entity.name,
                        areaId = entity.areaId ?: "",
                        areaName = entity.areaId?.let { areaMap[it]?.name } ?: "Khu vực chung",
                        capacity = entity.capacity,
                        status = when (entity.status.lowercase()) {
                            "occupied" -> TableStatus.OCCUPIED
                            "reserved" -> TableStatus.RESERVED
                            "cleaning" -> TableStatus.CLEANING
                            else -> TableStatus.AVAILABLE
                        },
                        currentOrderId = entity.currentOrderId
                    )
                }

                Log.d(TAG, "loadInitialData - Loaded ${categories.size} categories, ${products.size} products, ${allToppings.size} topping mappings, ${tables.size} tables")

                _uiState.update { state ->
                    state.copy(
                        categories = categories,
                        products = products,
                        tables = tables,
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "loadInitialData - Error: ${e.message}", e)
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = "Lỗi tải dữ liệu: ${e.message}")
                }
            }
        }
    }

    /**
     * Build variant groups từ topping entities
     */
    private fun buildVariantGroups(toppings: List<ProductToppingEntity>): List<ProductVariantGroup> {
        if (toppings.isEmpty()) return emptyList()

        // Group by group name
        val groupedByName = toppings.groupBy { it.groupName }

        return groupedByName.map { (groupName, groupToppings) ->
            val firstTopping = groupToppings.first()

            ProductVariantGroup(
                id = "${groupName}_${UUID.randomUUID()}",
                name = groupName,
                type = mapGroupType(firstTopping.groupType),
                isRequired = firstTopping.isRequired,
                isMultiple = firstTopping.isMultiple,
                options = groupToppings.mapNotNull { topping ->
                    val toppingProduct = productEntityMap[topping.toppingId]
                    if (toppingProduct != null) {
                        ProductVariantOption(
                            id = topping.toppingId,
                            name = toppingProduct.name,
                            price = if (topping.extraPrice > 0) topping.extraPrice.toLong() else toppingProduct.price.toLong(),
                            isDefault = topping.isDefault
                        )
                    } else null
                }.sortedBy { it.name }
            )
        }.sortedBy { it.name }
    }

    private fun mapGroupType(type: String): VariantType {
        return when (type.lowercase()) {
            "size" -> VariantType.SIZE
            "sugar" -> VariantType.SUGAR
            "ice" -> VariantType.ICE
            "topping" -> VariantType.TOPPING
            else -> VariantType.OTHER
        }
    }

    // ===== CATEGORY & SEARCH =====

    fun selectCategory(categoryId: String) {
        viewModelScope.launch {
            val allProducts = productRepository.getAllProducts(branchId).first()
                .filter { it.type != "topping" } // Lọc bỏ topping

            val filteredProducts = if (categoryId == "all") {
                allProducts
            } else {
                allProducts.filter { it.categoryId == categoryId }
            }

            val products = buildProductsWithVariants(filteredProducts)

            _uiState.update { state ->
                state.copy(
                    selectedCategoryId = categoryId,
                    products = products,
                    searchQuery = ""
                )
            }
        }
    }

    fun searchProducts(query: String) {
        viewModelScope.launch {
            val productEntities = if (query.isBlank()) {
                val allProducts = productRepository.getAllProducts(branchId).first()
                    .filter { it.type != "topping" }
                val categoryId = _uiState.value.selectedCategoryId
                if (categoryId == "all") allProducts else allProducts.filter { it.categoryId == categoryId }
            } else {
                productRepository.searchProducts(branchId, query)
                    .filter { it.type != "topping" }
            }

            val products = buildProductsWithVariants(productEntities)

            _uiState.update { state ->
                state.copy(
                    searchQuery = query,
                    products = products
                )
            }
        }
    }

    /**
     * Build products with variants from entity list
     */
    private fun buildProductsWithVariants(entities: List<ProductEntity>): List<Product> {
        val productIds = entities.map { it.id }
        val allToppings = productToppingDao.getToppingsForProductsSync(productIds)
        val toppingsByProduct = allToppings.groupBy { it.productId }

        return entities.map { entity ->
            val productToppings = toppingsByProduct[entity.id] ?: emptyList()
            val variantGroups = buildVariantGroups(productToppings)

            Product(
                id = entity.id,
                code = entity.code,
                name = entity.name,
                categoryId = entity.categoryId ?: "",
                price = entity.price.toLong(),
                imageUrl = entity.imageUrl,
                description = entity.description,
                isActive = entity.isActive,
                hasVariants = variantGroups.isNotEmpty(),
                variants = variantGroups
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
        val staffId = authRepository.getCurrentStaffId() ?: "unknown"
        val staffName = authRepository.getCurrentStaffName() ?: "Nhân viên"

        val order = Order(
            orderNumber = generateOrderNumber(),
            orderType = state.orderType,
            tableId = state.selectedTable?.id,
            tableName = state.selectedTable?.name,
            customerId = state.selectedCustomer?.id,
            customerName = state.selectedCustomer?.name,
            customerPhone = state.selectedCustomer?.phone,
            staffId = staffId,
            staffName = staffName,
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

    private fun generateOrderNumber(): String {
        val timestamp = System.currentTimeMillis()
        val random = (1000..9999).random()
        return "HD${timestamp % 1000000}$random"
    }
}
