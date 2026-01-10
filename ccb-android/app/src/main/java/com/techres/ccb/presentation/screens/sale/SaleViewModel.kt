package com.techres.ccb.presentation.screens.sale

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.techres.ccb.data.local.dao.ComboItemDao
import com.techres.ccb.data.local.dao.ProductToppingDao
import com.techres.ccb.data.local.dao.ProductNoteDao
import com.techres.ccb.data.local.entity.ComboItemEntity
import com.techres.ccb.data.local.entity.OrderEntity
import com.techres.ccb.data.local.entity.OrderItemEntity
import com.techres.ccb.data.local.entity.ProductEntity
import com.techres.ccb.data.local.entity.ProductToppingEntity
import com.techres.ccb.data.local.entity.ProductNoteEntity
import com.techres.ccb.data.repository.AuthRepository
import com.techres.ccb.data.repository.CategoryRepository
import com.techres.ccb.data.repository.OrderRepository
import com.techres.ccb.data.repository.ProductRepository
import com.techres.ccb.data.repository.ShiftRepository
import com.techres.ccb.data.repository.TableRepository
import com.techres.ccb.domain.model.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
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

    // Cart (for new items to add)
    val cartItems: List<CartItem> = emptyList(),
    val orderType: OrderType = OrderType.DINE_IN,
    val selectedTable: Table? = null,
    val selectedCustomer: Customer? = null,

    // Current active order for selected table
    val currentOrder: OrderEntity? = null,
    val currentOrderItems: List<OrderItemEntity> = emptyList(),

    // Available notes for quick selection
    val availableNotes: List<ProductNoteEntity> = emptyList(),

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
    val showNoteDialog: Boolean = false,
    val selectedCartItemForNote: String? = null,

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

    val canPlaceOrder: Boolean
        get() = cartItems.isNotEmpty()

    val canCheckout: Boolean
        get() = currentOrder != null

    val hasActiveOrder: Boolean
        get() = currentOrder != null

    // Total from current order + new cart items
    val orderSubtotal: Long
        get() = (currentOrder?.subtotal?.toLong() ?: 0L) + subtotal

    val orderTotal: Long
        get() = (currentOrder?.totalAmount?.toLong() ?: 0L) + totalAmount
}

@HiltViewModel
class SaleViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val categoryRepository: CategoryRepository,
    private val productRepository: ProductRepository,
    private val tableRepository: TableRepository,
    private val orderRepository: OrderRepository,
    private val shiftRepository: ShiftRepository,
    private val productToppingDao: ProductToppingDao,
    private val comboItemDao: ComboItemDao,
    private val productNoteDao: ProductNoteDao
) : ViewModel() {

    companion object {
        private const val TAG = "SaleViewModel"
    }

    private val _uiState = MutableStateFlow(SaleUiState())
    val uiState: StateFlow<SaleUiState> = _uiState.asStateFlow()

    private var branchId: String = ""

    // Cache product entities để load topping info
    private var productEntityMap: Map<String, ProductEntity> = emptyMap()

    // Cache topping category IDs to filter out topping products
    private var toppingCategoryIds: Set<String> = emptySet()

    // OPTIMIZATION: Cache all products with variants for fast category switching
    private var allProductsCache: List<Product> = emptyList()

    // OPTIMIZATION: Pre-computed products by category for instant switching
    private var productsByCategoryCache: Map<String, List<Product>> = emptyMap()

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

                // OPTIMIZATION: Load all data in PARALLEL using async
                withContext(Dispatchers.IO) {
                    val startTime = System.currentTimeMillis()

                    // Launch all queries in parallel
                    val categoriesDeferred = async { categoryRepository.getAllCategories(branchId).first() }
                    val allProductsDeferred = async { productRepository.getAllProducts(branchId).first() }
                    val areasDeferred = async { tableRepository.getAllAreas(branchId).first() }
                    val tablesDeferred = async { tableRepository.getAllTables(branchId).first() }
                    val notesDeferred = async { productNoteDao.getActiveNotes(branchId).first() }

                    // Await all results
                    val categoryEntities = categoriesDeferred.await()
                    val allProducts = allProductsDeferred.await()
                    val areas = areasDeferred.await()
                    val tableEntities = tablesDeferred.await()
                    val notes = notesDeferred.await()

                    Log.d(TAG, "loadInitialData - Parallel queries completed in ${System.currentTimeMillis() - startTime}ms")

                    // Process categories
                    toppingCategoryIds = categoryEntities
                        .filter { it.name.lowercase().contains("topping") }
                        .map { it.id }
                        .toSet()

                    val categoryList = mutableListOf(
                        Category(id = "all", name = "Tất cả", icon = "🍽️")
                    )
                    categoryList.addAll(categoryEntities
                        .filter { !it.name.lowercase().contains("topping") }
                        .map { entity ->
                            Category(
                                id = entity.id,
                                name = entity.name,
                                icon = entity.imageUrl
                            )
                        })

                    // OPTIMIZATION: Cache all products (load only ONCE)
                    productEntityMap = allProducts.associateBy { it.id }

                    // Filter products (exclude toppings)
                    val productEntities = allProducts
                        .filter { it.type != "topping" }
                        .filter { it.categoryId !in toppingCategoryIds }

                    // OPTIMIZATION: Build products WITHOUT variants first (fast display)
                    val productList = productEntities.map { entity ->
                        Product(
                            id = entity.id,
                            code = entity.code,
                            name = entity.name,
                            categoryId = entity.categoryId ?: "",
                            price = entity.price.toLong(),
                            imageUrl = entity.imageUrl,
                            description = entity.description,
                            isActive = entity.isActive,
                            hasVariants = false, // Will be updated later
                            variants = emptyList()
                        )
                    }

                    // Process tables
                    val areaMap = areas.associateBy { it.id }
                    val tableList = tableEntities.map { entity ->
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

                    Log.d(TAG, "loadInitialData - Processed ${categoryList.size} categories, ${productList.size} products, ${tableList.size} tables in ${System.currentTimeMillis() - startTime}ms")

                    // Update UI immediately with products (no variants yet)
                    _uiState.update { state ->
                        state.copy(
                            categories = categoryList.toList(),
                            products = productList,
                            tables = tableList,
                            availableNotes = notes,
                            isLoading = false
                        )
                    }

                    // OPTIMIZATION: Load variants in background AFTER UI is displayed
                    val productIds = productEntities.map { it.id }
                    val allToppings = productToppingDao.getToppingsForProductsSync(productIds)
                    val toppingsByProduct = allToppings.groupBy { it.productId }

                    // Update products with variants
                    val productsWithVariants = productList.map { product ->
                        val productToppings = toppingsByProduct[product.id] ?: emptyList()
                        val variantGroups = buildVariantGroups(productToppings)
                        product.copy(
                            hasVariants = variantGroups.isNotEmpty(),
                            variants = variantGroups
                        )
                    }

                    // OPTIMIZATION: Cache all products for fast category switching
                    allProductsCache = productsWithVariants

                    // OPTIMIZATION: Pre-compute products by category for INSTANT switching
                    val categoryMap = mutableMapOf<String, List<Product>>()
                    categoryMap["all"] = productsWithVariants
                    productsWithVariants.groupBy { it.categoryId }.forEach { (catId, products) ->
                        categoryMap[catId] = products
                    }
                    productsByCategoryCache = categoryMap

                    // Update UI with variants
                    _uiState.update { state ->
                        state.copy(products = productsWithVariants)
                    }

                    Log.d(TAG, "loadInitialData - Complete with variants in ${System.currentTimeMillis() - startTime}ms, ${allToppings.size} topping mappings, cached ${productsByCategoryCache.size} categories")
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
     * Refresh tables from database to get latest status
     */
    private fun refreshTables() {
        viewModelScope.launch {
            try {
                val branchId = authRepository.getBranchId() ?: return@launch

                withContext(Dispatchers.IO) {
                    val areas = tableRepository.getAllAreas(branchId).first()
                    val tableEntities = tableRepository.getAllTables(branchId).first()
                    val areaMap = areas.associateBy { it.id }

                    val tableList = tableEntities.map { entity ->
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

                    _uiState.update { it.copy(tables = tableList) }
                }

                Log.d(TAG, "refreshTables - Tables refreshed")
            } catch (e: Exception) {
                Log.e(TAG, "refreshTables - Error: ${e.message}", e)
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
        // OPTIMIZATION: Use pre-computed cache - NO database query, INSTANT switching
        // Only show all products for "all" category, otherwise return empty list if category has no products
        val products = if (categoryId == "all") {
            allProductsCache
        } else {
            productsByCategoryCache[categoryId] ?: emptyList()
        }

        _uiState.update { state ->
            state.copy(
                selectedCategoryId = categoryId,
                products = products,
                searchQuery = ""
            )
        }
    }

    fun searchProducts(query: String) {
        // OPTIMIZATION: Search from cache - NO database query
        val categoryId = _uiState.value.selectedCategoryId
        val baseProducts = if (query.isBlank()) {
            // Return products for selected category, or empty if category has no products
            if (categoryId == "all") {
                allProductsCache
            } else {
                productsByCategoryCache[categoryId] ?: emptyList()
            }
        } else {
            // Search in all products cache
            val lowerQuery = query.lowercase()
            allProductsCache.filter { product ->
                product.name.lowercase().contains(lowerQuery) ||
                product.code.lowercase().contains(lowerQuery)
            }
        }

        _uiState.update { state ->
            state.copy(
                searchQuery = query,
                products = baseProducts
            )
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
        viewModelScope.launch {
            // Load combo items if this product is a combo
            val comboItems = withContext(Dispatchers.IO) {
                val entities = comboItemDao.getItemsByComboSync(product.id)
                if (entities.isNotEmpty()) {
                    Log.d(TAG, "addItemToCart - Found ${entities.size} combo items for ${product.name}")
                }
                entities.map { entity ->
                    ComboChildItem(
                        productId = entity.productId,
                        productName = entity.productName,
                        productCode = entity.productCode,
                        quantity = entity.quantity
                    )
                }
            }

            if (comboItems.isNotEmpty()) {
                Log.d(TAG, "addItemToCart - Product ${product.name} is a combo with ${comboItems.size} child items")
            } else {
                Log.d(TAG, "addItemToCart - Product ${product.name} is NOT a combo (no child items found)")
            }

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
                    // Add new item with combo children
                    state.cartItems + CartItem(
                        product = product,
                        quantity = 1,
                        selectedVariants = selectedVariants,
                        note = note,
                        comboItems = comboItems
                    )
                }

                state.copy(
                    cartItems = updatedCart,
                    showVariantDialog = false,
                    selectedProductForVariant = null
                )
            }
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
        viewModelScope.launch {
            // Load active order for this table
            val activeOrder = withContext(Dispatchers.IO) {
                orderRepository.getActiveOrderByTable(table.id)
            }

            val orderItems = if (activeOrder != null) {
                withContext(Dispatchers.IO) {
                    orderRepository.getOrderItemsSync(activeOrder.id)
                }
            } else {
                emptyList()
            }

            Log.d(TAG, "selectTable - table: ${table.name}, activeOrder: ${activeOrder?.orderNumber}, items: ${orderItems.size}")

            _uiState.update { state ->
                state.copy(
                    selectedTable = table,
                    showTableDialog = false,
                    currentOrder = activeOrder,
                    currentOrderItems = orderItems,
                    // Clear cart when switching tables with active order
                    cartItems = if (activeOrder != null) emptyList() else state.cartItems
                )
            }
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

    // ===== NOTE DIALOG =====

    fun showNoteDialog(cartItemId: String) {
        _uiState.update { state ->
            state.copy(
                showNoteDialog = true,
                selectedCartItemForNote = cartItemId
            )
        }
    }

    fun hideNoteDialog() {
        _uiState.update { state ->
            state.copy(
                showNoteDialog = false,
                selectedCartItemForNote = null
            )
        }
    }

    fun applyNoteToCartItem(cartItemId: String, note: String?) {
        updateCartItemNote(cartItemId, note?.takeIf { it.isNotBlank() })
        hideNoteDialog()
    }

    // ===== ORDER MANAGEMENT =====

    private fun getCurrentTimestamp(): String {
        return SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).format(Date())
    }

    /**
     * Expand combo items - tạo order items cho cả món combo và các món con
     * Món con sẽ được gửi xuống bếp để chế biến
     */
    private suspend fun expandComboItems(
        cartItem: CartItem,
        orderId: String,
        now: String
    ): List<OrderItemEntity> {
        val orderItems = mutableListOf<OrderItemEntity>()

        // Build variants string with prices: "Kiwi:10000, Size S:10000"
        val variantsWithPrices = cartItem.selectedVariants.joinToString(", ") { variant ->
            if (variant.price > 0) {
                "${variant.name}:${variant.price}"
            } else {
                variant.name
            }
        }

        // Combine variants and user note into notes field
        val variantsAndNote = buildString {
            if (variantsWithPrices.isNotEmpty()) {
                append(variantsWithPrices)
            }
            if (!cartItem.note.isNullOrEmpty()) {
                if (isNotEmpty()) append(" | ")
                append("Ghi chú: ${cartItem.note}")
            }
        }.ifEmpty { null }

        // Get combo child items
        val comboItems = withContext(Dispatchers.IO) {
            comboItemDao.getItemsByComboSync(cartItem.product.id)
        }

        if (comboItems.isEmpty()) {
            // Not a combo - create single order item
            orderItems.add(
                OrderItemEntity(
                    id = UUID.randomUUID().toString(),
                    orderId = orderId,
                    productId = cartItem.product.id,
                    productCode = cartItem.product.code,
                    productName = cartItem.product.name,
                    productImageUrl = cartItem.product.imageUrl,
                    quantity = cartItem.quantity,
                    unitPrice = cartItem.product.price.toDouble(),
                    totalPrice = cartItem.totalPrice.toDouble(),
                    notes = variantsAndNote,
                    status = "pending",
                    createdAt = now,
                    updatedAt = now
                )
            )
        } else {
            // This is a combo - create combo parent item
            orderItems.add(
                OrderItemEntity(
                    id = UUID.randomUUID().toString(),
                    orderId = orderId,
                    productId = cartItem.product.id,
                    productCode = cartItem.product.code,
                    productName = cartItem.product.name,
                    productImageUrl = cartItem.product.imageUrl,
                    quantity = cartItem.quantity,
                    unitPrice = cartItem.product.price.toDouble(),
                    totalPrice = cartItem.totalPrice.toDouble(),
                    notes = variantsAndNote,
                    status = "pending",
                    isComboParent = true,
                    createdAt = now,
                    updatedAt = now
                )
            )

            // Create child items for kitchen (price = 0, marked as combo child)
            comboItems.forEach { comboItem ->
                orderItems.add(
                    OrderItemEntity(
                        id = UUID.randomUUID().toString(),
                        orderId = orderId,
                        productId = comboItem.productId,
                        productCode = comboItem.productCode ?: "",
                        productName = comboItem.productName,
                        productImageUrl = null,
                        quantity = cartItem.quantity * comboItem.quantity,  // Multiply by parent quantity
                        unitPrice = 0.0,  // Child items have no price (included in combo)
                        totalPrice = 0.0,
                        notes = "[Combo: ${cartItem.product.name}]",  // Mark as part of combo
                        status = "pending",
                        isComboChild = true,
                        comboParentId = cartItem.product.id,
                        createdAt = now,
                        updatedAt = now
                    )
                )
            }

            Log.d(TAG, "expandComboItems - Expanded combo ${cartItem.product.name} with ${comboItems.size} child items")
        }

        return orderItems
    }

    /**
     * Đặt món - Tạo order mới với status pending
     * Table status sẽ chuyển sang occupied
     */
    fun placeOrder() {
        val state = _uiState.value
        Log.d(TAG, "placeOrder - Starting: cartItems=${state.cartItems.size}, orderType=${state.orderType}, table=${state.selectedTable?.name}")

        if (state.cartItems.isEmpty()) {
            Log.w(TAG, "placeOrder - Cart is empty, returning")
            return
        }
        if (state.orderType == OrderType.DINE_IN && state.selectedTable == null) {
            Log.w(TAG, "placeOrder - Dine-in requires table selection")
            _uiState.update { it.copy(errorMessage = "Vui lòng chọn bàn trước khi đặt món") }
            return
        }

        viewModelScope.launch {
            try {
                val staffId = authRepository.getCurrentStaffId() ?: "unknown"
                val staffName = authRepository.getCurrentStaffName() ?: "Nhân viên"
                val currentShift = withContext(Dispatchers.IO) {
                    shiftRepository.getCurrentOpenShift(branchId)
                }
                val shiftId = currentShift?.id
                val now = getCurrentTimestamp()

                Log.d(TAG, "placeOrder - staffId=$staffId, shiftId=$shiftId, branchId=$branchId")

                val orderId = UUID.randomUUID().toString()
                val orderNumber = generateOrderNumber()

                // Create order entity
                val orderEntity = OrderEntity(
                    id = orderId,
                    branchId = branchId,
                    tableId = state.selectedTable?.id,
                    tableName = state.selectedTable?.name,
                    shiftId = shiftId,
                    staffId = staffId,
                    staffName = staffName,
                    customerName = state.selectedCustomer?.name,
                    customerPhone = state.selectedCustomer?.phone,
                    orderNumber = orderNumber,
                    status = "pending",
                    orderType = state.orderType.name.lowercase(),
                    subtotal = state.subtotal.toDouble(),
                    discountAmount = state.discountAmount.toDouble(),
                    discountReason = state.discountReason,
                    totalAmount = state.totalAmount.toDouble(),
                    paymentStatus = "unpaid",
                    createdAt = now,
                    updatedAt = now,
                    idempotencyKey = UUID.randomUUID().toString()
                )

                // Create order items with combo expansion
                val orderItems = mutableListOf<OrderItemEntity>()
                state.cartItems.forEach { cartItem ->
                    val expandedItems = expandComboItems(cartItem, orderId, now)
                    orderItems.addAll(expandedItems)
                }

                // Save to database
                Log.d(TAG, "placeOrder - Saving order to database: orderId=$orderId, tableId=${orderEntity.tableId}, shiftId=${orderEntity.shiftId}")
                withContext(Dispatchers.IO) {
                    orderRepository.createOrder(orderEntity, orderItems)
                    Log.d(TAG, "placeOrder - Order saved successfully")

                    // Update table status to occupied
                    state.selectedTable?.let { table ->
                        Log.d(TAG, "placeOrder - Updating table status: tableId=${table.id}")
                        tableRepository.updateTableStatus(table.id, "occupied", orderId, now)
                    }
                }

                Log.d(TAG, "placeOrder - Created order: $orderNumber with ${orderItems.size} items")

                // Update UI state
                _uiState.update { s ->
                    s.copy(
                        cartItems = emptyList(),
                        currentOrder = orderEntity,
                        currentOrderItems = orderItems,
                        successMessage = "Đặt món thành công! $orderNumber"
                    )
                }

                // Refresh tables to show updated status
                refreshTables()

            } catch (e: Exception) {
                Log.e(TAG, "placeOrder - Error: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi đặt món: ${e.message}") }
            }
        }
    }

    /**
     * Thêm món vào order hiện tại
     */
    fun addItemsToOrder() {
        val state = _uiState.value
        val currentOrder = state.currentOrder ?: return
        if (state.cartItems.isEmpty()) return

        viewModelScope.launch {
            try {
                val now = getCurrentTimestamp()

                // Create new order items with combo expansion
                val newItems = mutableListOf<OrderItemEntity>()
                state.cartItems.forEach { cartItem ->
                    val expandedItems = expandComboItems(cartItem, currentOrder.id, now)
                    newItems.addAll(expandedItems)
                }

                // Calculate new totals
                val newSubtotal = currentOrder.subtotal + state.subtotal
                val newTotal = currentOrder.totalAmount + state.totalAmount

                // Update order in database
                withContext(Dispatchers.IO) {
                    newItems.forEach { orderRepository.addOrderItem(it) }

                    val updatedOrder = currentOrder.copy(
                        subtotal = newSubtotal,
                        totalAmount = newTotal,
                        updatedAt = now
                    )
                    orderRepository.updateOrder(updatedOrder)
                }

                // Reload order items
                val allItems = withContext(Dispatchers.IO) {
                    orderRepository.getOrderItemsSync(currentOrder.id)
                }

                Log.d(TAG, "addItemsToOrder - Added ${newItems.size} items to order ${currentOrder.orderNumber}")

                _uiState.update { s ->
                    s.copy(
                        cartItems = emptyList(),
                        currentOrder = currentOrder.copy(subtotal = newSubtotal, totalAmount = newTotal, updatedAt = now),
                        currentOrderItems = allItems,
                        successMessage = "Đã thêm ${newItems.size} món"
                    )
                }

            } catch (e: Exception) {
                Log.e(TAG, "addItemsToOrder - Error: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi thêm món: ${e.message}") }
            }
        }
    }

    /**
     * Thanh toán và hoàn tất order
     * Đồng bộ: Order -> Order Items -> Table -> Shift Statistics
     */
    fun completeOrder(paymentMethod: String = "cash") {
        val state = _uiState.value
        val currentOrder = state.currentOrder ?: return

        viewModelScope.launch {
            try {
                val now = getCurrentTimestamp()

                withContext(Dispatchers.IO) {
                    // 1. Update order status to completed
                    val completedOrder = currentOrder.copy(
                        status = "completed",
                        paymentStatus = "paid",
                        paymentMethod = paymentMethod,
                        paidAmount = currentOrder.totalAmount,
                        completedAt = now,
                        updatedAt = now
                    )
                    orderRepository.updateOrder(completedOrder)

                    // 2. Update all order items status to completed
                    orderRepository.updateAllItemsStatus(currentOrder.id, "completed", now)

                    // 3. Update table status back to available
                    state.selectedTable?.let { table ->
                        tableRepository.updateTableStatus(table.id, "available", null, now)
                    }

                    // 4. Update shift statistics
                    currentOrder.shiftId?.let { shiftId ->
                        shiftRepository.addOrderRevenue(
                            shiftId = shiftId,
                            orderTotal = currentOrder.totalAmount,
                            discountAmount = currentOrder.discountAmount,
                            paymentMethod = paymentMethod,
                            updatedAt = now
                        )
                    }
                }

                Log.d(TAG, "completeOrder - Completed order with full sync: ${currentOrder.orderNumber}")

                _uiState.update { s ->
                    s.copy(
                        cartItems = emptyList(),
                        currentOrder = null,
                        currentOrderItems = emptyList(),
                        selectedTable = null,
                        selectedCustomer = null,
                        successMessage = "Thanh toán thành công! ${currentOrder.orderNumber}"
                    )
                }

                // Refresh tables to show updated status
                refreshTables()

            } catch (e: Exception) {
                Log.e(TAG, "completeOrder - Error: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi thanh toán: ${e.message}") }
            }
        }
    }

    /**
     * Huỷ order
     * Đồng bộ: Order -> Order Items -> Table -> Shift Statistics
     */
    fun cancelOrder(reason: String = "") {
        val state = _uiState.value
        val currentOrder = state.currentOrder ?: return

        viewModelScope.launch {
            try {
                val now = getCurrentTimestamp()

                withContext(Dispatchers.IO) {
                    // 1. Update order status to cancelled
                    val cancelledOrder = currentOrder.copy(
                        status = "cancelled",
                        cancelReason = reason,
                        cancelledAt = now,
                        updatedAt = now
                    )
                    orderRepository.updateOrder(cancelledOrder)

                    // 2. Update all order items status to cancelled
                    orderRepository.updateAllItemsStatus(currentOrder.id, "cancelled", now)

                    // 3. Update table status back to available
                    state.selectedTable?.let { table ->
                        tableRepository.updateTableStatus(table.id, "available", null, now)
                    }

                    // 4. Update shift cancelled count
                    currentOrder.shiftId?.let { shiftId ->
                        shiftRepository.incrementCancelledCount(shiftId, now)
                    }
                }

                Log.d(TAG, "cancelOrder - Cancelled order with full sync: ${currentOrder.orderNumber}")

                _uiState.update { s ->
                    s.copy(
                        cartItems = emptyList(),
                        currentOrder = null,
                        currentOrderItems = emptyList(),
                        selectedTable = null,
                        selectedCustomer = null,
                        successMessage = "Đã huỷ đơn hàng ${currentOrder.orderNumber}"
                    )
                }

                // Refresh tables to show updated status
                refreshTables()

            } catch (e: Exception) {
                Log.e(TAG, "cancelOrder - Error: ${e.message}", e)
                _uiState.update { it.copy(errorMessage = "Lỗi huỷ đơn: ${e.message}") }
            }
        }
    }

    // ===== PAYMENT DIALOG =====

    fun showPaymentDialog() {
        if (_uiState.value.currentOrder != null) {
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

    fun processPayment(payments: List<Payment>) {
        hidePaymentDialog()
        // Use first payment method
        val method = payments.firstOrNull()?.method?.name?.lowercase() ?: "cash"
        completeOrder(method)
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
