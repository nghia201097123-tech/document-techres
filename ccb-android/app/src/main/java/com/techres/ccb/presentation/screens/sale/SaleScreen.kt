package com.techres.ccb.presentation.screens.sale

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import com.techres.ccb.data.local.entity.OrderEntity
import com.techres.ccb.data.local.entity.OrderItemEntity
import com.techres.ccb.data.local.entity.ProductNoteEntity
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.techres.ccb.domain.model.*
import com.techres.ccb.presentation.screens.sale.dialogs.CustomerSelectionDialog
import com.techres.ccb.presentation.screens.sale.dialogs.NoteDialog
import com.techres.ccb.presentation.screens.sale.dialogs.PaymentDialog
import com.techres.ccb.presentation.screens.sale.dialogs.ProductVariantDialog
import com.techres.ccb.presentation.screens.sale.dialogs.TableSelectionDialog
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SaleScreen(
    onNavigateBack: () -> Unit,
    viewModel: SaleViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    // Show success snackbar
    LaunchedEffect(uiState.successMessage) {
        if (uiState.successMessage != null) {
            // Auto clear after showing
            kotlinx.coroutines.delay(3000)
            viewModel.clearSuccessMessage()
        }
    }

    // Show error snackbar
    LaunchedEffect(uiState.errorMessage) {
        if (uiState.errorMessage != null) {
            // Auto clear after showing
            kotlinx.coroutines.delay(4000)
            viewModel.clearErrorMessage()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Row(modifier = Modifier.fillMaxSize()) {
            // Left Panel - Products (70%)
            ProductPanel(
                modifier = Modifier
                    .weight(0.65f)
                    .fillMaxHeight(),
                categories = uiState.categories,
                products = uiState.products,
                selectedCategoryId = uiState.selectedCategoryId,
                searchQuery = uiState.searchQuery,
                onCategorySelected = viewModel::selectCategory,
                onSearchQueryChanged = viewModel::searchProducts,
                onProductClicked = viewModel::addToCart,
                onProductLongClicked = viewModel::showVariantDialog,
                onNavigateBack = onNavigateBack
            )

            // Divider
            VerticalDivider(
                modifier = Modifier.fillMaxHeight(),
                thickness = 1.dp,
                color = MaterialTheme.colorScheme.outlineVariant
            )

            // Right Panel - Cart (30%)
            CartPanel(
                modifier = Modifier
                    .weight(0.35f)
                    .fillMaxHeight(),
                cartItems = uiState.cartItems,
                orderType = uiState.orderType,
                selectedTable = uiState.selectedTable,
                selectedCustomer = uiState.selectedCustomer,
                subtotal = uiState.subtotal,
                discountAmount = uiState.discountAmount,
                taxAmount = uiState.taxAmount,
                totalAmount = uiState.totalAmount,
                currentOrder = uiState.currentOrder,
                currentOrderItems = uiState.currentOrderItems,
                onOrderTypeChanged = viewModel::setOrderType,
                onTableClicked = { viewModel.showTableDialog() },
                onCustomerClicked = { viewModel.showCustomerDialog() },
                onIncreaseQuantity = viewModel::increaseQuantity,
                onDecreaseQuantity = viewModel::decreaseQuantity,
                onRemoveItem = viewModel::removeFromCart,
                onEditNote = viewModel::showNoteDialog,
                onClearCart = viewModel::clearCart,
                onPlaceOrder = viewModel::placeOrder,
                onAddItemsToOrder = viewModel::addItemsToOrder,
                onCheckout = { viewModel.showPaymentDialog() },
                onCancelOrder = { viewModel.cancelOrder() }
            )
        }

        // Success message
        AnimatedVisibility(
            visible = uiState.successMessage != null,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 16.dp)
        ) {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFF4CAF50)
                ),
                shape = RoundedCornerShape(8.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = null,
                        tint = Color.White
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = uiState.successMessage ?: "",
                        color = Color.White,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }

        // Error message
        AnimatedVisibility(
            visible = uiState.errorMessage != null,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 16.dp)
        ) {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFFF44336)
                ),
                shape = RoundedCornerShape(8.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Error,
                        contentDescription = null,
                        tint = Color.White
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = uiState.errorMessage ?: "",
                        color = Color.White,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }

        // Dialogs
        if (uiState.showVariantDialog && uiState.selectedProductForVariant != null) {
            ProductVariantDialog(
                product = uiState.selectedProductForVariant!!,
                onDismiss = { viewModel.hideVariantDialog() },
                onConfirm = { variants, note ->
                    viewModel.addItemToCart(
                        uiState.selectedProductForVariant!!,
                        variants,
                        note
                    )
                }
            )
        }

        if (uiState.showPaymentDialog) {
            // Use order total when there's an active order
            val currentOrder = uiState.currentOrder
            val paymentTotal = if (currentOrder != null) {
                currentOrder.totalAmount.toLong() + uiState.totalAmount
            } else {
                uiState.totalAmount
            }
            PaymentDialog(
                totalAmount = paymentTotal,
                onDismiss = { viewModel.hidePaymentDialog() },
                onPaymentComplete = { payments ->
                    viewModel.processPayment(payments)
                }
            )
        }

        if (uiState.showTableDialog) {
            TableSelectionDialog(
                tables = uiState.tables,
                onDismiss = { viewModel.hideTableDialog() },
                onTableSelected = { viewModel.selectTable(it) }
            )
        }

        if (uiState.showCustomerDialog) {
            CustomerSelectionDialog(
                onDismiss = { viewModel.hideCustomerDialog() },
                onCustomerSelected = { viewModel.selectCustomer(it) }
            )
        }

        // Note Dialog
        if (uiState.showNoteDialog && uiState.selectedCartItemForNote != null) {
            val selectedItem = uiState.cartItems.find { it.id == uiState.selectedCartItemForNote }
            if (selectedItem != null) {
                NoteDialog(
                    currentNote = selectedItem.note,
                    availableNotes = uiState.availableNotes,
                    onDismiss = { viewModel.hideNoteDialog() },
                    onConfirm = { note ->
                        viewModel.applyNoteToCartItem(
                            uiState.selectedCartItemForNote!!,
                            note
                        )
                    }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductPanel(
    modifier: Modifier = Modifier,
    categories: List<Category>,
    products: List<Product>,
    selectedCategoryId: String,
    searchQuery: String,
    onCategorySelected: (String) -> Unit,
    onSearchQueryChanged: (String) -> Unit,
    onProductClicked: (Product) -> Unit,
    onProductLongClicked: (Product) -> Unit,
    onNavigateBack: () -> Unit
) {
    Column(modifier = modifier.background(MaterialTheme.colorScheme.surface)) {
        // Top Bar with Search
        TopAppBar(
            title = {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = onSearchQueryChanged,
                    placeholder = { Text("Tìm sản phẩm...") },
                    leadingIcon = {
                        Icon(Icons.Default.Search, contentDescription = null)
                    },
                    trailingIcon = {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = { onSearchQueryChanged("") }) {
                                Icon(Icons.Default.Clear, contentDescription = "Xóa")
                            }
                        }
                    },
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(24.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
                    )
                )
            },
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Quay lại")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = MaterialTheme.colorScheme.surface
            )
        )

        // Category Tabs
        LazyRow(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(categories) { category ->
                CategoryChip(
                    category = category,
                    isSelected = category.id == selectedCategoryId,
                    onClick = { onCategorySelected(category.id) }
                )
            }
        }

        HorizontalDivider()

        // Product Grid
        if (products.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = Icons.Default.SearchOff,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = MaterialTheme.colorScheme.outline
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Không tìm thấy sản phẩm",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.outline
                    )
                }
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 140.dp),
                contentPadding = PaddingValues(8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(products, key = { it.id }) { product ->
                    ProductCard(
                        product = product,
                        onClick = { onProductClicked(product) },
                        onLongClick = { onProductLongClicked(product) }
                    )
                }
            }
        }
    }
}

@Composable
fun CategoryChip(
    category: Category,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    FilterChip(
        selected = isSelected,
        onClick = onClick,
        label = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (category.icon != null) {
                    Text(
                        text = category.icon,
                        fontSize = 16.sp,
                        modifier = Modifier.padding(end = 4.dp)
                    )
                }
                Text(text = category.name)
            }
        },
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = MaterialTheme.colorScheme.primary,
            selectedLabelColor = MaterialTheme.colorScheme.onPrimary
        )
    )
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ProductCard(
    product: Product,
    onClick: () -> Unit,
    onLongClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(0.85f)
            .combinedClickable(
                onClick = onClick,
                onLongClick = onLongClick
            ),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Product Image/Icon placeholder
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                // Show category icon as placeholder
                Text(
                    text = when {
                        product.categoryId == "cat_drink" -> "☕"
                        product.categoryId == "cat_food" -> "🍜"
                        product.categoryId == "cat_dessert" -> "🍰"
                        product.categoryId == "cat_combo" -> "🎁"
                        else -> "📦"
                    },
                    fontSize = 40.sp
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Product Name
            Text(
                text = product.name,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(4.dp))

            // Price
            Text(
                text = formatCurrency(product.price),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )

            // Sold count badge
            if (product.soldCount > 0) {
                Text(
                    text = "Đã bán ${product.soldCount}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.outline
                )
            }
        }
    }
}

@Composable
fun CartPanel(
    modifier: Modifier = Modifier,
    cartItems: List<CartItem>,
    orderType: OrderType,
    selectedTable: Table?,
    selectedCustomer: Customer?,
    subtotal: Long,
    discountAmount: Long,
    taxAmount: Long,
    totalAmount: Long,
    currentOrder: OrderEntity? = null,
    currentOrderItems: List<OrderItemEntity> = emptyList(),
    onOrderTypeChanged: (OrderType) -> Unit,
    onTableClicked: () -> Unit,
    onCustomerClicked: () -> Unit,
    onIncreaseQuantity: (String) -> Unit,
    onDecreaseQuantity: (String) -> Unit,
    onRemoveItem: (String) -> Unit,
    onEditNote: (String) -> Unit = {},
    onClearCart: () -> Unit,
    onPlaceOrder: () -> Unit = {},
    onAddItemsToOrder: () -> Unit = {},
    onCheckout: () -> Unit,
    onCancelOrder: () -> Unit = {}
) {
    val hasActiveOrder = currentOrder != null
    Column(
        modifier = modifier
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
    ) {
        // Cart Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(if (hasActiveOrder) Color(0xFF2196F3) else MaterialTheme.colorScheme.primary)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = if (hasActiveOrder) Icons.Default.Receipt else Icons.Default.ShoppingCart,
                contentDescription = null,
                tint = Color.White
            )
            Spacer(modifier = Modifier.width(8.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = if (hasActiveOrder) currentOrder?.orderNumber ?: "Đơn hàng" else "Đơn hàng mới",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                if (hasActiveOrder) {
                    Text(
                        text = "Đang chờ thanh toán",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = 0.8f)
                    )
                }
            }
            if (hasActiveOrder) {
                Badge(containerColor = Color(0xFF4CAF50)) {
                    Text(
                        text = "${currentOrderItems.size} món",
                        color = Color.White
                    )
                }
            } else if (cartItems.isNotEmpty()) {
                Badge(containerColor = MaterialTheme.colorScheme.error) {
                    Text(
                        text = cartItems.sumOf { it.quantity }.toString(),
                        color = Color.White
                    )
                }
            }
        }

        // Order Type Selector with icons
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            OrderType.entries.forEach { type ->
                val isSelected = orderType == type
                val (icon, bgColor) = when (type) {
                    OrderType.DINE_IN -> Icons.Default.TableRestaurant to Color(0xFF2196F3)
                    OrderType.TAKE_AWAY -> Icons.Default.ShoppingBag to Color(0xFF4CAF50)
                    OrderType.DELIVERY -> Icons.Default.LocalShipping to Color(0xFFFF9800)
                }
                Card(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { onOrderTypeChanged(type) },
                    shape = RoundedCornerShape(8.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isSelected) bgColor else MaterialTheme.colorScheme.surfaceVariant
                    ),
                    elevation = CardDefaults.cardElevation(
                        defaultElevation = if (isSelected) 4.dp else 0.dp
                    )
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = type.displayName,
                            modifier = Modifier.size(20.dp),
                            tint = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = type.displayName,
                            fontSize = 10.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            color = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }

        // Table & Customer Selection
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Table button (only for DINE_IN)
            if (orderType == OrderType.DINE_IN) {
                OutlinedButton(
                    onClick = onTableClicked,
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Icon(Icons.Default.TableRestaurant, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = selectedTable?.name ?: "Chọn bàn",
                        fontSize = 12.sp,
                        maxLines = 1
                    )
                }
            }

            // Customer button
            OutlinedButton(
                onClick = onCustomerClicked,
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = selectedCustomer?.name ?: "Khách lẻ",
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }

        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

        // Order Items (current order + cart)
        if (cartItems.isEmpty() && currentOrderItems.isEmpty()) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = Icons.Default.ShoppingCart,
                        contentDescription = null,
                        modifier = Modifier.size(48.dp),
                        tint = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Chưa có sản phẩm",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.outline
                    )
                }
            }
        } else {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 8.dp)
            ) {
                // Display current order items (read-only)
                if (currentOrderItems.isNotEmpty()) {
                    Text(
                        text = "Đã order:",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(vertical = 4.dp)
                    )
                    currentOrderItems.forEach { item ->
                        OrderItemRow(item = item)
                        Spacer(modifier = Modifier.height(4.dp))
                    }

                    if (cartItems.isNotEmpty()) {
                        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                        Text(
                            text = "Thêm mới:",
                            style = MaterialTheme.typography.labelMedium,
                            color = Color(0xFF2196F3),
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(vertical = 4.dp)
                        )
                    }
                }

                // Display new cart items (editable)
                cartItems.forEach { item ->
                    CartItemRow(
                        item = item,
                        onIncrease = { onIncreaseQuantity(item.id) },
                        onDecrease = { onDecreaseQuantity(item.id) },
                        onRemove = { onRemoveItem(item.id) },
                        onEditNote = { onEditNote(item.id) }
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
        }

        // Cart Summary
        val orderSubtotal = (currentOrder?.subtotal?.toLong() ?: 0L) + subtotal
        val orderTotal = (currentOrder?.totalAmount?.toLong() ?: 0L) + totalAmount

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            )
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                // Current order amount (if exists)
                if (hasActiveOrder && currentOrder != null) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Đã order:", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.outline)
                        Text(formatCurrency(currentOrder.totalAmount.toLong()), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.outline)
                    }
                    if (subtotal > 0) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Thêm mới:", style = MaterialTheme.typography.bodyMedium, color = Color(0xFF2196F3))
                            Text(formatCurrency(subtotal), style = MaterialTheme.typography.bodyMedium, color = Color(0xFF2196F3))
                        }
                    }
                } else {
                    // Subtotal for new order
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Tạm tính:", style = MaterialTheme.typography.bodyMedium)
                        Text(formatCurrency(subtotal), style = MaterialTheme.typography.bodyMedium)
                    }
                }

                // Discount
                if (discountAmount > 0) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Giảm giá:", style = MaterialTheme.typography.bodyMedium, color = Color(0xFF4CAF50))
                        Text("-${formatCurrency(discountAmount)}", style = MaterialTheme.typography.bodyMedium, color = Color(0xFF4CAF50))
                    }
                }

                // Tax
                if (taxAmount > 0) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("VAT:", style = MaterialTheme.typography.bodyMedium)
                        Text(formatCurrency(taxAmount), style = MaterialTheme.typography.bodyMedium)
                    }
                }

                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                // Total
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        "TỔNG CỘNG:",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        formatCurrency(if (hasActiveOrder) orderTotal else totalAmount),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }

        // Action Buttons
        if (hasActiveOrder) {
            // Active order buttons
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Add more items button (if cart has items)
                if (cartItems.isNotEmpty()) {
                    Button(
                        onClick = onAddItemsToOrder,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF2196F3)
                        )
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("THÊM ${cartItems.size} MÓN", fontWeight = FontWeight.Bold)
                    }
                }

                // Payment and Cancel buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Cancel button
                    OutlinedButton(
                        onClick = onCancelOrder,
                        modifier = Modifier.weight(0.35f),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = MaterialTheme.colorScheme.error
                        )
                    ) {
                        Icon(Icons.Default.Cancel, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("HUỶ", fontWeight = FontWeight.Bold)
                    }

                    // Checkout button
                    Button(
                        onClick = onCheckout,
                        modifier = Modifier.weight(0.65f),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF4CAF50)
                        )
                    ) {
                        Icon(Icons.Default.Payment, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("THANH TOÁN", fontWeight = FontWeight.Bold)
                    }
                }
            }
        } else {
            // New order buttons
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Clear Cart button
                OutlinedButton(
                    onClick = onClearCart,
                    modifier = Modifier.weight(0.25f),
                    enabled = cartItems.isNotEmpty(),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Icon(Icons.Default.Delete, contentDescription = null, modifier = Modifier.size(18.dp))
                }

                // Place Order button
                Button(
                    onClick = onPlaceOrder,
                    modifier = Modifier.weight(0.75f),
                    enabled = cartItems.isNotEmpty(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF2196F3)
                    )
                ) {
                    Icon(Icons.Default.Send, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("ĐẶT MÓN", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun CartItemRow(
    item: CartItem,
    onIncrease: () -> Unit,
    onDecrease: () -> Unit,
    onRemove: () -> Unit,
    onEditNote: () -> Unit = {}
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // Header: Product name + Remove button
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top
            ) {
                // Product name + base price
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = item.product.name,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = formatCurrency(item.product.price),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.outline
                    )
                }

                // Remove button
                IconButton(
                    onClick = onRemove,
                    modifier = Modifier.size(24.dp)
                ) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "Xoa",
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.error
                    )
                }
            }

            // Variants section - Grab style (each variant on its own line)
            if (item.selectedVariants.isNotEmpty()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 8.dp, top = 6.dp)
                ) {
                    item.selectedVariants.forEach { variant ->
                        VariantLineItem(variant = variant)
                    }
                }
            }

            // Note section - clickable to edit
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 6.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(
                        if (item.note.isNullOrEmpty())
                            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                        else
                            MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                    )
                    .clickable { onEditNote() }
                    .padding(horizontal = 8.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = if (item.note.isNullOrEmpty()) Icons.Default.NoteAdd else Icons.Default.Edit,
                    contentDescription = "Ghi chu",
                    modifier = Modifier.size(14.dp),
                    tint = if (item.note.isNullOrEmpty())
                        MaterialTheme.colorScheme.outline
                    else
                        MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = if (item.note.isNullOrEmpty()) "Them ghi chu..." else item.note!!,
                    style = MaterialTheme.typography.labelSmall,
                    color = if (item.note.isNullOrEmpty())
                        MaterialTheme.colorScheme.outline
                    else
                        MaterialTheme.colorScheme.primary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Bottom: Quantity controls + Price
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Quantity controls
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    IconButton(
                        onClick = onDecrease,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            Icons.Default.Remove,
                            contentDescription = "Giam",
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    Text(
                        text = item.quantity.toString(),
                        modifier = Modifier.padding(horizontal = 8.dp),
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Bold
                    )

                    IconButton(
                        onClick = onIncrease,
                        modifier = Modifier
                            .size(32.dp)
                            .background(
                                MaterialTheme.colorScheme.primary,
                                CircleShape
                            )
                    ) {
                        Icon(
                            Icons.Default.Add,
                            contentDescription = "Tang",
                            modifier = Modifier.size(18.dp),
                            tint = Color.White
                        )
                    }
                }

                // Price
                Text(
                    text = formatCurrency(item.totalPrice),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

/**
 * Displays a single variant line item in Grab style
 * Shows icon based on variant type, name, and price if applicable
 */
@Composable
fun VariantLineItem(variant: SelectedVariant) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Bullet point / prefix
        Text(
            text = "•",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.outline,
            modifier = Modifier.padding(end = 6.dp)
        )

        // Variant name
        Text(
            text = variant.name,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.weight(1f)
        )

        // Price if > 0
        if (variant.price > 0) {
            Text(
                text = "+${formatCurrency(variant.price)}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
fun OrderItemRow(item: OrderItemEntity) {
    Card(
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Product info
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = item.productName,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                if (!item.notes.isNullOrEmpty()) {
                    Text(
                        text = "📝 ${item.notes}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }

            // Quantity and Price
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Badge(
                    containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.2f)
                ) {
                    Text(
                        text = "x${item.quantity}",
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                    )
                }
                Text(
                    text = formatCurrency(item.totalPrice.toLong()),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

// ===== UTILITY FUNCTIONS =====

fun formatCurrency(amount: Long): String {
    val formatter = NumberFormat.getNumberInstance(Locale("vi", "VN"))
    return "${formatter.format(amount)}đ"
}
