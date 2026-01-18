package com.techres.ccb.presentation.screens.sale

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import com.techres.ccb.data.local.entity.OrderEntity
import com.techres.ccb.data.local.entity.OrderItemEntity
import com.techres.ccb.data.local.entity.ProductNoteEntity
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.SubcomposeAsyncImage
import coil.compose.SubcomposeAsyncImageContent
import androidx.compose.material3.CircularProgressIndicator
import androidx.hilt.navigation.compose.hiltViewModel
import com.techres.ccb.domain.model.*
import com.techres.ccb.presentation.screens.sale.dialogs.CouponDisplayItem
import com.techres.ccb.presentation.screens.sale.dialogs.CustomerSelectionDialog
import com.techres.ccb.presentation.screens.sale.dialogs.NoteDialog
import com.techres.ccb.presentation.screens.sale.dialogs.PaymentDialog
import com.techres.ccb.presentation.screens.sale.dialogs.PaymentOrderItem
import com.techres.ccb.presentation.screens.sale.dialogs.PaymentToppingItem
import com.techres.ccb.presentation.screens.sale.dialogs.ProductVariantDialog
import com.techres.ccb.presentation.screens.sale.dialogs.TableSelectionDialog
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SaleScreen(
    onNavigateBack: () -> Unit,
    orderId: String? = null,
    tableId: String? = null,
    showPaymentOnStart: Boolean = false,
    viewModel: SaleViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val configuration = LocalConfiguration.current
    val screenWidthDp = configuration.screenWidthDp

    // Determine if we're on a phone (< 600dp) or tablet
    val isCompactScreen = screenWidthDp < 600
    var showCartDialog by remember { mutableStateOf(false) }

    // Track if we should auto-show payment dialog after order loads
    var pendingShowPayment by remember { mutableStateOf(showPaymentOnStart) }

    // Set pending payment flag IMMEDIATELY to block product clicks
    LaunchedEffect(showPaymentOnStart) {
        if (showPaymentOnStart) {
            viewModel.setPendingPaymentDialog(true)
        }
    }

    // Load existing order if orderId is provided
    LaunchedEffect(orderId) {
        if (!orderId.isNullOrEmpty()) {
            viewModel.loadExistingOrder(orderId)
        }
    }

    // Pre-select table if tableId is provided
    LaunchedEffect(tableId) {
        if (!tableId.isNullOrEmpty()) {
            viewModel.selectTableById(tableId)
        }
    }

    // Auto-show payment dialog after order is loaded
    LaunchedEffect(uiState.currentOrder, pendingShowPayment) {
        if (pendingShowPayment && uiState.currentOrder != null) {
            viewModel.showPaymentDialog()
            pendingShowPayment = false
        }
    }

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
        // Show loading indicator while data is loading
        if (uiState.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(48.dp),
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Đang tải dữ liệu...",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else if (isCompactScreen) {
            // Phone Layout: Full screen products + floating cart button
            PhoneLayout(
                uiState = uiState,
                viewModel = viewModel,
                onNavigateBack = onNavigateBack,
                onShowCart = { showCartDialog = true }
            )

            // Cart Dialog for Phone
            if (showCartDialog) {
                CartDialog(
                    uiState = uiState,
                    viewModel = viewModel,
                    onDismiss = { showCartDialog = false }
                )
            }
        } else {
            // Tablet Layout: Side by side
            TabletLayout(
                uiState = uiState,
                viewModel = viewModel,
                onNavigateBack = onNavigateBack
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
            val isAddingToExistingItem = uiState.selectedCartItemForTopping != null
            // Get existing variants from cart item when adding toppings
            val existingVariants = if (isAddingToExistingItem) {
                uiState.cartItems.find { it.id == uiState.selectedCartItemForTopping }?.selectedVariants ?: emptyList()
            } else {
                emptyList()
            }
            ProductVariantDialog(
                product = uiState.selectedProductForVariant!!,
                availableNotes = uiState.notesForSelectedProduct, // Use product-specific notes
                isAddingTopping = isAddingToExistingItem,
                existingVariants = existingVariants,
                onDismiss = { viewModel.hideVariantDialog() },
                onConfirm = { variants, note ->
                    if (isAddingToExistingItem) {
                        // Replace all toppings on cart item with new selection
                        viewModel.updateCartItemVariants(
                            uiState.selectedCartItemForTopping!!,
                            variants
                        )
                    } else {
                        // Add new item to cart
                        viewModel.addItemToCart(
                            uiState.selectedProductForVariant!!,
                            variants,
                            note
                        )
                    }
                }
            )
        }

        if (uiState.showPaymentDialog) {
            // Tính toán các giá trị cho PaymentDialog
            // CHỈ tính toán cho các món đã order, KHÔNG bao gồm cart items chưa thêm
            val currentOrder = uiState.currentOrder
            val subtotal = if (currentOrder != null) {
                // Chỉ sử dụng subtotal của order hiện tại, KHÔNG cộng cart items
                currentOrder.subtotal.toLong()
            } else {
                // Nếu chưa có order, sử dụng cart items (đang tạo order mới)
                uiState.subtotal
            }

            // Tổng = Tạm tính - Giảm giá (giá đã bao gồm VAT nên không cộng thêm)
            val paymentTotal = (subtotal - uiState.discountAmount).coerceAtLeast(0L)

            // Helper function to parse toppings from notes field
            // Format: "+ ToppingName (+price)" or just "+ ToppingName"
            fun parseToppingsFromNotes(notes: String?, itemVatRate: Double): List<PaymentToppingItem> {
                if (notes.isNullOrBlank()) return emptyList()

                val toppings = mutableListOf<PaymentToppingItem>()
                // Split by comma and look for topping entries (starting with "+")
                val parts = notes.split(",").map { it.trim() }

                for (part in parts) {
                    // Check if this is a topping (starts with "+ ")
                    if (part.startsWith("+ ") || part.startsWith("+")) {
                        val toppingPart = part.removePrefix("+ ").removePrefix("+").trim()

                        // Extract price if present: "ToppingName (+10000)" or "ToppingName"
                        val priceMatch = Regex("""\(\+(\d+)\)$""").find(toppingPart)
                        val price = priceMatch?.groupValues?.get(1)?.toLongOrNull() ?: 0L
                        val name = if (priceMatch != null) {
                            toppingPart.replace(priceMatch.value, "").trim()
                        } else {
                            toppingPart
                        }

                        if (name.isNotEmpty()) {
                            toppings.add(PaymentToppingItem(
                                name = name,
                                price = price,
                                vatRate = itemVatRate // Use item's VAT rate for toppings
                            ))
                        }
                    }
                }
                return toppings
            }

            // Tạo danh sách món cho item-level discount
            // CHỈ bao gồm món đã order, KHÔNG bao gồm cart items chưa thêm
            val orderItems = buildList {
                if (currentOrder != null) {
                    // Có order đang active - chỉ lấy món từ order (filter combo children)
                    uiState.currentOrderItems
                        .filter { !it.isComboChild }
                        .forEach { item ->
                            // Parse toppings from notes field
                            val toppings = parseToppingsFromNotes(item.notes, item.vatRate)
                            // Calculate unit price of main item (without toppings)
                            val toppingsPrice = toppings.sumOf { it.price }
                            val mainUnitPrice = (item.unitPrice.toLong() - toppingsPrice).coerceAtLeast(0L)

                            add(PaymentOrderItem(
                                id = item.id,
                                name = item.productName,
                                quantity = item.quantity,
                                unitPrice = mainUnitPrice,
                                totalPrice = item.totalPrice.toLong(),
                                discountAmount = uiState.itemDiscounts[item.id] ?: 0L,
                                categoryId = item.categoryId,
                                vatRate = item.vatRate,
                                toppings = toppings
                            ))
                        }
                } else {
                    // Chưa có order - lấy từ giỏ hàng (đang tạo order mới)
                    uiState.cartItems.forEach { item ->
                        add(PaymentOrderItem(
                            id = item.id,
                            name = item.product.name,
                            quantity = item.quantity,
                            unitPrice = item.product.price.toLong(),
                            totalPrice = item.totalPrice,
                            discountAmount = uiState.itemDiscounts[item.id] ?: 0L,
                            categoryId = item.product.categoryId,
                            vatRate = item.product.vatRate,
                            toppings = item.selectedVariants.map { variant ->
                                PaymentToppingItem(
                                    name = variant.name,
                                    price = variant.price,
                                    vatRate = variant.vatRate
                                )
                            }
                        ))
                    }
                }
            }

            // Tính VAT từ từng món và topping (dựa trên vatRate riêng của mỗi item)
            // Công thức: VAT = Giá - (Giá / (1 + VAT%))
            val vatAmount = orderItems.sumOf { item ->
                // VAT của món chính (giá gốc, không bao gồm topping)
                val mainItemPrice = item.unitPrice * item.quantity
                val mainItemVat = if (item.vatRate > 0) {
                    val priceBeforeVat = mainItemPrice / (1 + item.vatRate / 100.0)
                    (mainItemPrice - priceBeforeVat).toLong()
                } else 0L

                // VAT của từng topping
                val toppingsVat = item.toppings.sumOf { topping ->
                    val toppingTotalPrice = topping.price * item.quantity
                    if (topping.vatRate > 0) {
                        val priceBeforeVat = toppingTotalPrice / (1 + topping.vatRate / 100.0)
                        (toppingTotalPrice - priceBeforeVat).toLong()
                    } else 0L
                }

                mainItemVat + toppingsVat
            }

            // Convert CouponEntity to CouponDisplayItem with availability status
            val couponDisplayItems = uiState.availableCoupons.map { coupon ->
                // Compute availability and reason
                val usageRemaining = coupon.usageLimit?.let { it - coupon.usageCount }
                val dailyRemaining = coupon.dailyLimit?.let { it - coupon.dailyUsageCount }
                val needsMoreAmount = coupon.minOrderAmount > 0 && subtotal < coupon.minOrderAmount.toLong()
                val missingAmount = if (needsMoreAmount) coupon.minOrderAmount.toLong() - subtotal else 0L

                val (isAvailable, unavailableReason) = when {
                    usageRemaining != null && usageRemaining <= 0 -> false to "Đã hết lượt sử dụng"
                    dailyRemaining != null && dailyRemaining <= 0 -> false to "Đã hết lượt hôm nay"
                    needsMoreAmount -> false to "Cần thêm ${formatCurrency(missingAmount)}"
                    else -> true to null
                }

                CouponDisplayItem(
                    id = coupon.id,
                    code = coupon.code,
                    name = coupon.name,
                    description = coupon.description,
                    couponType = coupon.couponType,
                    applyTo = coupon.applyTo,
                    discountValue = coupon.discountValue,
                    maxDiscount = coupon.maxDiscount,
                    minOrderAmount = coupon.minOrderAmount,
                    isApplied = uiState.appliedDiscounts.any { it.couponId == coupon.id },
                    // New fields
                    usageLimit = coupon.usageLimit,
                    usageCount = coupon.usageCount,
                    dailyLimit = coupon.dailyLimit,
                    dailyUsageCount = coupon.dailyUsageCount,
                    startDate = coupon.startDate,
                    endDate = coupon.endDate,
                    isAvailable = isAvailable,
                    unavailableReason = unavailableReason
                )
            }.sortedByDescending { it.isAvailable } // Show available coupons first

            PaymentDialog(
                totalAmount = paymentTotal,
                subtotal = subtotal,
                discountAmount = uiState.discountAmount,
                vatAmount = vatAmount,
                appliedDiscounts = uiState.appliedDiscounts,
                couponCode = uiState.couponCode,
                couponError = uiState.couponError,
                isApplyingCoupon = uiState.isApplyingCoupon,
                availableCoupons = couponDisplayItems,
                orderItems = orderItems,
                // Discount breakdown
                itemDiscountTotal = uiState.itemDiscountTotal,
                billDiscountTotal = uiState.billDiscountAmount,
                billDiscountDescription = uiState.billDiscountDescription,
                onCouponCodeChange = { viewModel.setCouponCode(it) },
                onApplyCoupon = { viewModel.applyCoupon() },
                onApplyCouponById = { viewModel.applyCouponById(it) },
                onRemoveDiscount = { viewModel.removeCoupon(it) },
                onApplyManualDiscount = { amount, reason -> viewModel.applyDiscount(amount, reason) },
                onApplyPercentDiscount = { percent, reason -> viewModel.applyPercentDiscount(percent, reason) },
                onApplyItemDiscount = { itemId, amount, discountType -> viewModel.applyItemDiscount(itemId, amount, discountType) },
                onClearDiscount = { viewModel.clearDiscount() },
                onClearItemDiscounts = { viewModel.clearItemDiscounts() },
                onClearBillDiscount = { viewModel.clearBillDiscount() },
                onPrintTemporaryBill = { viewModel.printTemporaryBill() },
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

        // Note Dialog - use product-specific notes
        if (uiState.showNoteDialog && uiState.selectedCartItemForNote != null) {
            val selectedItem = uiState.cartItems.find { it.id == uiState.selectedCartItemForNote }
            if (selectedItem != null) {
                NoteDialog(
                    currentNote = selectedItem.note,
                    availableNotes = uiState.notesForSelectedProduct, // Use product-specific notes
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

        // Cancel Order Confirmation Dialog
        if (uiState.showCancelOrderDialog) {
            CancelOrderConfirmationDialog(
                onDismiss = { viewModel.hideCancelOrderConfirmation() },
                onConfirm = { reason -> viewModel.confirmCancelOrder(reason) }
            )
        }

        // Order Note Dialog (ghi chú tổng bill)
        if (uiState.showOrderNoteDialog) {
            OrderNoteDialog(
                note = uiState.orderNoteInput,
                onNoteChanged = { viewModel.updateOrderNoteInput(it) },
                onDismiss = { viewModel.hideOrderNoteDialog() },
                onConfirm = { viewModel.saveOrderNote() }
            )
        }

        // Remove Order Item Confirmation Dialog (huỷ món với lý do)
        val itemToRemove = uiState.itemToRemove
        if (uiState.showRemoveItemDialog && itemToRemove != null) {
            RemoveOrderItemConfirmationDialog(
                item = itemToRemove,
                onDismiss = { viewModel.hideRemoveItemConfirmation() },
                onConfirm = { reason -> viewModel.confirmCancelOrderItem(reason) }
            )
        }

        // Reprint Menu Dialog
        if (uiState.showReprintMenu) {
            ReprintMenuDialog(
                itemId = uiState.reprintItemId,
                onDismiss = { viewModel.hideReprintMenu() },
                onReprintLabels = { viewModel.reprintLabels(uiState.reprintItemId) },
                onReprintKitchenTickets = { viewModel.reprintKitchenTickets(uiState.reprintItemId) }
            )
        }
    }
}

/**
 * Phone Layout - Full screen products with floating cart button
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PhoneLayout(
    uiState: SaleUiState,
    viewModel: SaleViewModel,
    onNavigateBack: () -> Unit,
    onShowCart: () -> Unit
) {
    val cartItemCount = uiState.cartItems.sumOf { it.quantity }
    val hasActiveOrder = uiState.currentOrder != null
    // Exclude combo children from count - only count parent items
    val orderItemCount = uiState.currentOrderItems.count { !it.isComboChild }
    val totalBadgeCount = cartItemCount + orderItemCount

    Box(modifier = Modifier.fillMaxSize()) {
        // Full screen product panel
        ProductPanel(
            modifier = Modifier.fillMaxSize(),
            categories = uiState.categories,
            filteredCategories = uiState.filteredCategories,
            products = uiState.products,
            selectedProductType = uiState.selectedProductType,
            selectedCategoryId = uiState.selectedCategoryId,
            searchQuery = uiState.searchQuery,
            onProductTypeSelected = viewModel::selectProductType,
            onCategorySelected = viewModel::selectCategory,
            onSearchQueryChanged = viewModel::searchProducts,
            onProductClicked = viewModel::addToCart,
            onProductLongClicked = viewModel::showVariantDialog,
            onNavigateBack = onNavigateBack,
            hasCategories = uiState::hasCategories
        )

        // Floating Cart Button
        FloatingActionButton(
            onClick = onShowCart,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp)
                .size(64.dp),
            containerColor = if (hasActiveOrder) Color(0xFF2196F3) else MaterialTheme.colorScheme.primary
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = if (hasActiveOrder) Icons.Default.Receipt else Icons.Default.ShoppingCart,
                    contentDescription = "Giỏ hàng",
                    tint = Color.White,
                    modifier = Modifier.size(28.dp)
                )
                if (totalBadgeCount > 0) {
                    Badge(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .offset(x = 8.dp, y = (-8).dp),
                        containerColor = MaterialTheme.colorScheme.error
                    ) {
                        Text(
                            text = totalBadgeCount.toString(),
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        // Show total amount if has items
        if (totalBadgeCount > 0) {
            val orderTotal = (uiState.currentOrder?.totalAmount?.toLong() ?: 0L) + uiState.totalAmount
            Card(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(16.dp)
                    .clickable { onShowCart() },
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (hasActiveOrder) Color(0xFF2196F3) else MaterialTheme.colorScheme.primary
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = formatCurrency(orderTotal),
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                }
            }
        }
    }
}

/**
 * Tablet Layout - Side by side products and cart
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TabletLayout(
    uiState: SaleUiState,
    viewModel: SaleViewModel,
    onNavigateBack: () -> Unit
) {
    Row(modifier = Modifier.fillMaxSize()) {
        // Left Panel - Products (65%)
        ProductPanel(
            modifier = Modifier
                .weight(0.65f)
                .fillMaxHeight(),
            categories = uiState.categories,
            filteredCategories = uiState.filteredCategories,
            products = uiState.products,
            selectedProductType = uiState.selectedProductType,
            selectedCategoryId = uiState.selectedCategoryId,
            searchQuery = uiState.searchQuery,
            onProductTypeSelected = viewModel::selectProductType,
            onCategorySelected = viewModel::selectCategory,
            onSearchQueryChanged = viewModel::searchProducts,
            onProductClicked = viewModel::addToCart,
            onProductLongClicked = viewModel::showVariantDialog,
            onNavigateBack = onNavigateBack,
            hasCategories = uiState::hasCategories
        )

        // Divider
        VerticalDivider(
            modifier = Modifier.fillMaxHeight(),
            thickness = 1.dp,
            color = MaterialTheme.colorScheme.outlineVariant
        )

        // Right Panel - Cart (35%)
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
            canPlaceOrder = uiState.canPlaceOrder,
            missingRequiredToppingsMessage = uiState.missingRequiredToppingsMessage,
            cartItemsWithMissingRequiredToppings = uiState.cartItemsWithMissingRequiredToppings,
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
            onCancelOrder = { viewModel.showCancelOrderConfirmation() },
            onRemoveOrderItem = viewModel::showRemoveItemConfirmation,
            onRemoveOrderItemTopping = viewModel::removeOrderItemTopping,
            onRemoveCartItemVariant = viewModel::removeCartItemVariant,
            onAddToppingToCartItem = viewModel::showAddToppingDialog,
            onCancelAddingItems = viewModel::cancelAddingItems,
            onReprintItem = viewModel::showReprintMenuForItem,
            onReprintAllItems = viewModel::showReprintMenuForAllItems,
            onOrderNoteClicked = { viewModel.showOrderNoteDialog() }
        )
    }
}

/**
 * Full screen cart dialog for phone layout
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartDialog(
    uiState: SaleUiState,
    viewModel: SaleViewModel,
    onDismiss: () -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            dismissOnBackPress = true,
            dismissOnClickOutside = true
        )
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.9f)
                .padding(horizontal = 8.dp),
            shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 8.dp
        ) {
            Column {
                // Dialog Header with close button
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.primary)
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.ShoppingCart,
                            contentDescription = null,
                            tint = Color.White
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (uiState.currentOrder != null) uiState.currentOrder.orderNumber else "Giỏ hàng",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Đóng",
                            tint = Color.White
                        )
                    }
                }

                // Cart Panel content
                CartPanel(
                    modifier = Modifier.fillMaxSize(),
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
                    canPlaceOrder = uiState.canPlaceOrder,
                    missingRequiredToppingsMessage = uiState.missingRequiredToppingsMessage,
                    cartItemsWithMissingRequiredToppings = uiState.cartItemsWithMissingRequiredToppings,
                    onOrderTypeChanged = viewModel::setOrderType,
                    onTableClicked = { viewModel.showTableDialog() },
                    onCustomerClicked = { viewModel.showCustomerDialog() },
                    onIncreaseQuantity = viewModel::increaseQuantity,
                    onDecreaseQuantity = viewModel::decreaseQuantity,
                    onRemoveItem = viewModel::removeFromCart,
                    onEditNote = viewModel::showNoteDialog,
                    onClearCart = viewModel::clearCart,
                    onPlaceOrder = {
                        viewModel.placeOrder()
                        onDismiss()
                    },
                    onAddItemsToOrder = {
                        viewModel.addItemsToOrder()
                        onDismiss()
                    },
                    onCheckout = { viewModel.showPaymentDialog() },
                    onCancelOrder = { viewModel.showCancelOrderConfirmation() },
                    onRemoveOrderItem = viewModel::showRemoveItemConfirmation,
                    onRemoveOrderItemTopping = viewModel::removeOrderItemTopping,
                    onRemoveCartItemVariant = viewModel::removeCartItemVariant,
                    onAddToppingToCartItem = viewModel::showAddToppingDialog,
                    onCancelAddingItems = viewModel::cancelAddingItems,
                    onReprintItem = viewModel::showReprintMenuForItem,
                    onReprintAllItems = viewModel::showReprintMenuForAllItems,
                    onOrderNoteClicked = { viewModel.showOrderNoteDialog() },
                    isCompactMode = true // Don't show header in compact mode
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
    filteredCategories: List<Category>,
    products: List<Product>,
    selectedProductType: SaleProductType,
    selectedCategoryId: String,
    searchQuery: String,
    onProductTypeSelected: (SaleProductType) -> Unit,
    onCategorySelected: (String) -> Unit,
    onSearchQueryChanged: (String) -> Unit,
    onProductClicked: (Product) -> Unit,
    onProductLongClicked: (Product) -> Unit,
    onNavigateBack: () -> Unit,
    hasCategories: (SaleProductType) -> Boolean
) {
    Column(modifier = modifier.background(MaterialTheme.colorScheme.surface)) {
        // Top Bar with Search
        TopAppBar(
            title = {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = onSearchQueryChanged,
                    placeholder = {
                        Text(
                            "Tìm sản phẩm...",
                            color = Color.Gray,
                            fontSize = 14.sp
                        )
                    },
                    leadingIcon = {
                        Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray)
                    },
                    trailingIcon = {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = { onSearchQueryChanged("") }) {
                                Icon(Icons.Default.Clear, contentDescription = "Xóa", tint = Color.Gray)
                            }
                        }
                    },
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.sp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
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

        // Product Type Tabs
        ScrollableTabRow(
            selectedTabIndex = SaleProductType.entries.indexOf(selectedProductType),
            modifier = Modifier.fillMaxWidth(),
            edgePadding = 8.dp,
            divider = {},
            containerColor = MaterialTheme.colorScheme.surface
        ) {
            SaleProductType.entries.forEach { productType ->
                val hasItems = hasCategories(productType)
                Tab(
                    selected = selectedProductType == productType,
                    onClick = { onProductTypeSelected(productType) },
                    enabled = hasItems || productType == SaleProductType.ALL,
                    text = {
                        Text(
                            text = productType.label,
                            fontWeight = if (selectedProductType == productType) FontWeight.Bold else FontWeight.Normal,
                            fontSize = 13.sp
                        )
                    }
                )
            }
        }

        // Category Chips (filtered by product type)
        if (filteredCategories.isNotEmpty()) {
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(filteredCategories) { category ->
                    CategoryChip(
                        category = category,
                        isSelected = category.id == selectedCategoryId,
                        onClick = { onCategorySelected(category.id) }
                    )
                }
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
            // Product Image
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                if (!product.imageUrl.isNullOrBlank()) {
                    SubcomposeAsyncImage(
                        model = product.imageUrl,
                        contentDescription = product.name,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop,
                        loading = {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                strokeWidth = 2.dp
                            )
                        },
                        error = {
                            // Show placeholder on error
                            Text(
                                text = "📦",
                                fontSize = 40.sp
                            )
                        },
                        success = {
                            SubcomposeAsyncImageContent()
                        }
                    )
                } else {
                    // Show category icon as placeholder when no image
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
    canPlaceOrder: Boolean = true,
    missingRequiredToppingsMessage: String? = null,
    cartItemsWithMissingRequiredToppings: List<Pair<String, List<String>>> = emptyList(),
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
    onCancelOrder: () -> Unit = {},
    onRemoveOrderItem: (String) -> Unit = {},
    onRemoveOrderItemTopping: (String, String) -> Unit = { _, _ -> },
    onRemoveCartItemVariant: (String, String, String) -> Unit = { _, _, _ -> }, // (cartItemId, groupId, optionId)
    onAddToppingToCartItem: (String) -> Unit = {}, // cartItemId
    onCancelAddingItems: () -> Unit = {}, // Cancel adding more items
    onReprintItem: (String) -> Unit = {}, // Reprint single item
    onReprintAllItems: () -> Unit = {}, // Reprint all items menu
    onOrderNoteClicked: () -> Unit = {}, // Open order note dialog
    isCompactMode: Boolean = false // Hide header when shown in dialog
) {
    val hasActiveOrder = currentOrder != null
    Column(
        modifier = modifier
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
    ) {
        // Cart Header - hide in compact mode (dialog has its own header)
        if (!isCompactMode) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(if (hasActiveOrder) Color(0xFF2196F3) else MaterialTheme.colorScheme.primary)
                    .statusBarsPadding()
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
                    // Exclude combo children from count
                    val parentItemCount = currentOrderItems.count { !it.isComboChild }
                    Badge(containerColor = Color(0xFF4CAF50)) {
                        Text(
                            text = "$parentItemCount món",
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

            // Order Note button (only show when has active order)
            if (hasActiveOrder) {
                OutlinedButton(
                    onClick = onOrderNoteClicked,
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Icon(Icons.Default.NoteAlt, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (currentOrder?.notes.isNullOrBlank()) "Ghi chú" else "Có ghi chú",
                        fontSize = 12.sp,
                        maxLines = 1
                    )
                }
            }
        }

        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

        // Order Items (current order + cart) - Optimized with LazyColumn
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
            // Global state for expand/collapse all toppings
            var allToppingsExpanded by remember { mutableStateOf(true) }
            // Per-item expanded state (must be outside LazyColumn to avoid scroll issues)
            val itemToppingsExpanded = remember { mutableStateMapOf<String, Boolean>() }
            var showCancelledItems by remember { mutableStateOf(false) }

            // Prepare data
            val comboChildrenMap = currentOrderItems
                .filter { it.isComboChild }
                .groupBy { it.comboParentId }
            val activeItems = currentOrderItems.filter { !it.isComboChild && it.status != "cancelled" }
            val cancelledItems = currentOrderItems.filter { !it.isComboChild && it.status == "cancelled" }

            androidx.compose.foundation.lazy.LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // Active order items section
                if (activeItems.isNotEmpty()) {
                    item {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Đã order (${activeItems.size})",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Bold
                            )
                            // Expand/Collapse all button
                            TextButton(
                                onClick = {
                                    allToppingsExpanded = !allToppingsExpanded
                                    itemToppingsExpanded.clear() // Reset per-item states
                                },
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                                modifier = Modifier.height(28.dp)
                            ) {
                                Icon(
                                    imageVector = if (allToppingsExpanded) Icons.Default.UnfoldLess else Icons.Default.UnfoldMore,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = if (allToppingsExpanded) "Thu gọn" else "Mở rộng",
                                    fontSize = 12.sp
                                )
                            }
                        }
                    }

                    items(activeItems.size, key = { activeItems[it].id }) { index ->
                        val item = activeItems[index]
                        val comboChildren = comboChildrenMap[item.id] ?: emptyList()
                        val isExpanded = itemToppingsExpanded[item.id] ?: allToppingsExpanded
                        OrderItemRow(
                            item = item,
                            comboChildren = comboChildren,
                            onRemoveItem = onRemoveOrderItem,
                            onReprint = onReprintItem,
                            forceExpanded = isExpanded,
                            onToppingsToggle = { itemToppingsExpanded[item.id] = !isExpanded }
                        )
                    }
                }

                // Cancelled items section - collapsible
                if (cancelledItems.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(4.dp))
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { showCancelledItems = !showCancelledItems },
                            shape = RoundedCornerShape(8.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = Color(0xFFFFEBEE)
                            )
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 12.dp, vertical = 8.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.Cancel,
                                        contentDescription = null,
                                        tint = Color(0xFFF44336),
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "Đã huỷ (${cancelledItems.size} món)",
                                        fontWeight = FontWeight.Medium,
                                        fontSize = 14.sp,
                                        color = Color(0xFFF44336)
                                    )
                                }
                                Icon(
                                    imageVector = if (showCancelledItems) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                    contentDescription = null,
                                    tint = Color(0xFFF44336),
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }

                    // Cancelled items list (compact) - only show when expanded
                    if (showCancelledItems) {
                        items(cancelledItems.size, key = { "cancelled_${cancelledItems[it].id}" }) { index ->
                            val item = cancelledItems[index]
                            CancelledItemRowCompact(item = item)
                        }
                    }
                }

                // New cart items section
                if (cartItems.isNotEmpty()) {
                    item {
                        if (currentOrderItems.isNotEmpty()) {
                            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                        }
                        Text(
                            text = "Thêm mới (${cartItems.size})",
                            style = MaterialTheme.typography.labelMedium,
                            color = Color(0xFF2196F3),
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(vertical = 4.dp)
                        )
                    }

                    items(cartItems.size, key = { "cart_${cartItems[it].id}" }) { index ->
                        val item = cartItems[index]
                        val missingGroups = cartItemsWithMissingRequiredToppings
                            .find { it.first == item.id }
                            ?.second ?: emptyList()

                        CartItemRow(
                            item = item,
                            onIncrease = { onIncreaseQuantity(item.id) },
                            onDecrease = { onDecreaseQuantity(item.id) },
                            onRemove = { onRemoveItem(item.id) },
                            onEditNote = { onEditNote(item.id) },
                            onRemoveVariant = onRemoveCartItemVariant,
                            onAddTopping = { onAddToppingToCartItem(item.id) },
                            missingRequiredGroups = missingGroups
                        )
                    }
                }

                // Bottom padding
                item { Spacer(modifier = Modifier.height(8.dp)) }
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

                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                // Total (giá đã bao gồm VAT, không cộng thêm)
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

        // Warning message for missing required toppings
        if (missingRequiredToppingsMessage != null && !hasActiveOrder) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                shape = RoundedCornerShape(8.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFFFFF3E0)
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = null,
                        tint = Color(0xFFFF9800),
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Vui lòng chọn lại topping bắt buộc ($missingRequiredToppingsMessage)",
                        fontSize = 13.sp,
                        color = Color(0xFFE65100),
                        modifier = Modifier.weight(1f)
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
                // Reprint all items button (if there are order items)
                if (currentOrderItems.isNotEmpty()) {
                    OutlinedButton(
                        onClick = onReprintAllItems,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = Color(0xFF9C27B0)
                        )
                    ) {
                        Icon(Icons.Default.Print, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("IN LẠI TẤT CẢ", fontWeight = FontWeight.Bold)
                    }
                }

                // Add more items button with cancel button (if cart has items)
                if (cartItems.isNotEmpty()) {
                    // Hiển thị nút thêm món và huỷ thêm
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Huỷ thêm món - với text rõ ràng hơn
                        OutlinedButton(
                            onClick = onCancelAddingItems,
                            modifier = Modifier.weight(0.35f),
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = Color(0xFFFF5722)
                            )
                        ) {
                            Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("BỎ THÊM", fontWeight = FontWeight.Medium, fontSize = 13.sp)
                        }

                        // Add items button - nổi bật
                        Button(
                            onClick = onAddItemsToOrder,
                            modifier = Modifier.weight(0.65f),
                            enabled = canPlaceOrder,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF2196F3)
                            )
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("THÊM ${cartItems.size} MÓN", fontWeight = FontWeight.Bold)
                        }
                    }
                }

                // Payment and Cancel order buttons (luôn hiện khi có order)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Huỷ đơn button
                    OutlinedButton(
                        onClick = onCancelOrder,
                        modifier = Modifier.weight(0.35f),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = MaterialTheme.colorScheme.error
                        )
                    ) {
                        Icon(Icons.Default.Cancel, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("HUỶ ĐƠN", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }

                    // Checkout button
                    Button(
                        onClick = onCheckout,
                        modifier = Modifier.weight(0.65f),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF4CAF50)
                        )
                    ) {
                        Icon(Icons.Default.Payment, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
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
                    enabled = canPlaceOrder,
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

/**
 * Cart item row - Grab style layout
 * Layout:
 * [Product Name]                    [X]
 * [Base Price]
 *   • Topping 1                +5.000đ
 *   • Topping 2                +8.000đ
 *   • Size M                   +5.000đ
 * [Note if exists]
 * [-] [qty] [+]              [Total Price]
 */
@Composable
fun CartItemRow(
    item: CartItem,
    onIncrease: () -> Unit,
    onDecrease: () -> Unit,
    onRemove: () -> Unit,
    onEditNote: () -> Unit = {},
    onRemoveVariant: ((String, String, String) -> Unit)? = null, // (itemId, groupId, optionId)
    onAddTopping: (() -> Unit)? = null, // Open topping dialog
    missingRequiredGroups: List<String> = emptyList() // Groups that need selection
) {
    val hasMissingRequired = missingRequiredGroups.isNotEmpty()
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (hasMissingRequired) Color(0xFFFFF3E0) else MaterialTheme.colorScheme.surface
        ),
        border = if (hasMissingRequired) {
            androidx.compose.foundation.BorderStroke(2.dp, Color(0xFFFF9800))
        } else null,
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // Warning for missing required toppings
            if (hasMissingRequired) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = null,
                        tint = Color(0xFFFF9800),
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Chọn: ${missingRequiredGroups.joinToString(", ")}",
                        fontSize = 12.sp,
                        color = Color(0xFFE65100),
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            // Row 1: Product name + Remove button
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Text(
                    text = item.product.name,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
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

            // Row 2: Base price
            Text(
                text = formatCurrency(item.product.price),
                style = MaterialTheme.typography.bodySmall,
                color = Color.Gray
            )

            // Row 3: Combo child items
            if (item.comboItems.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFFFFF3E0).copy(alpha = 0.5f))
                        .padding(8.dp)
                ) {
                    Text(
                        text = "Bao gồm:",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFFE65100),
                        modifier = Modifier.padding(bottom = 4.dp)
                    )
                    item.comboItems.forEach { comboChild ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "•",
                                fontSize = 14.sp,
                                color = Color(0xFFFF9800),
                                modifier = Modifier.padding(end = 8.dp)
                            )
                            Text(
                                text = comboChild.productName,
                                fontSize = 13.sp,
                                color = Color(0xFF424242),
                                modifier = Modifier.weight(1f)
                            )
                            Badge(
                                containerColor = Color(0xFFFF9800).copy(alpha = 0.2f)
                            ) {
                                Text(
                                    text = "x${comboChild.quantity * item.quantity}",
                                    fontSize = 11.sp,
                                    color = Color(0xFFE65100),
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }

            // Row 4: Variants/Toppings - Grab style
            if (item.selectedVariants.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 4.dp)
                ) {
                    item.selectedVariants.forEach { variant ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 3.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.weight(1f)
                            ) {
                                Text(
                                    text = "•",
                                    fontSize = 14.sp,
                                    color = Color.Gray,
                                    modifier = Modifier.padding(end = 8.dp)
                                )
                                Text(
                                    text = variant.name,
                                    fontSize = 14.sp,
                                    color = Color(0xFF424242)
                                )
                            }
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                if (variant.price > 0) {
                                    Text(
                                        text = "+${formatCurrency(variant.price)}",
                                        fontSize = 14.sp,
                                        color = Color(0xFF1976D2),
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                                // Delete topping button
                                if (onRemoveVariant != null) {
                                    IconButton(
                                        onClick = { onRemoveVariant(item.id, variant.groupId, variant.optionId) },
                                        modifier = Modifier.size(24.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Close,
                                            contentDescription = "Xóa ${variant.name}",
                                            tint = Color(0xFFF44336).copy(alpha = 0.7f),
                                            modifier = Modifier.size(14.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Row 4: Action buttons (Note + Add Topping)
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Note button
                OutlinedButton(
                    onClick = onEditNote,
                    modifier = Modifier.height(32.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = if (item.note.isNullOrEmpty()) Color.Gray else MaterialTheme.colorScheme.primary
                    )
                ) {
                    Icon(
                        imageVector = if (item.note.isNullOrEmpty()) Icons.Default.NoteAdd else Icons.Default.Edit,
                        contentDescription = "Ghi chú",
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (item.note.isNullOrEmpty()) "Ghi chú" else item.note!!,
                        fontSize = 12.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                // Add topping button (only show if product has variants)
                if (onAddTopping != null && item.product.hasVariants) {
                    OutlinedButton(
                        onClick = onAddTopping,
                        modifier = Modifier.height(32.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = Color(0xFF1976D2)
                        )
                    ) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = "Thêm topping",
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Topping",
                            fontSize = 12.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Row 5: Quantity controls + Total Price
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
                            .background(MaterialTheme.colorScheme.primary, CircleShape)
                    ) {
                        Icon(
                            Icons.Default.Add,
                            contentDescription = "Tang",
                            modifier = Modifier.size(18.dp),
                            tint = Color.White
                        )
                    }
                }

                // Total Price
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

/**
 * Order item row (for existing orders) - Grab style layout with prices
 * Layout:
 * [Product Name]               [x1] [Price]
 * [Base Price]
 *   • Topping 1                +10.000đ
 *   • Topping 2                +20.000đ
 */
@Composable
fun OrderItemRow(
    item: OrderItemEntity,
    comboChildren: List<OrderItemEntity> = emptyList(),
    onRemoveItem: ((String) -> Unit)? = null,
    onRemoveTopping: ((String, String) -> Unit)? = null,
    onReprint: ((String) -> Unit)? = null, // Callback for reprint
    forceExpanded: Boolean? = null, // null = use local state, true/false = force state
    onToppingsToggle: (() -> Unit)? = null // Callback to toggle per-item expanded state
) {
    val isCancelled = item.status == "cancelled"

    Card(
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isCancelled) {
                Color(0xFFFFEBEE) // Light red background for cancelled items
            } else {
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            }
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp)
        ) {
            // Cancelled badge
            if (isCancelled) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Badge(
                        containerColor = Color(0xFFF44336)
                    ) {
                        Text(
                            text = "ĐÃ HUỶ",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 10.sp
                        )
                    }
                    item.cancelReason?.let { reason ->
                        Text(
                            text = " - $reason",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFFF44336),
                            fontStyle = FontStyle.Italic,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            // Row 1: Product name + Quantity badge + Price + Delete button
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Text(
                    text = item.productName,
                    style = MaterialTheme.typography.bodyMedium.copy(
                        textDecoration = if (isCancelled) androidx.compose.ui.text.style.TextDecoration.LineThrough else null
                    ),
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    color = if (isCancelled) Color.Gray else Color.Unspecified,
                    modifier = Modifier.weight(1f)
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Badge(
                        containerColor = if (isCancelled) Color.Gray.copy(alpha = 0.3f)
                            else MaterialTheme.colorScheme.primary.copy(alpha = 0.2f)
                    ) {
                        Text(
                            text = "x${item.quantity}",
                            color = if (isCancelled) Color.Gray else MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Text(
                        text = formatCurrency(item.totalPrice.toLong()),
                        style = MaterialTheme.typography.bodyMedium.copy(
                            textDecoration = if (isCancelled) androidx.compose.ui.text.style.TextDecoration.LineThrough else null
                        ),
                        fontWeight = FontWeight.Bold,
                        color = if (isCancelled) Color.Gray else MaterialTheme.colorScheme.primary
                    )
                    // Reprint item button - hide for cancelled items
                    if (onReprint != null && !isCancelled) {
                        IconButton(
                            onClick = { onReprint(item.id) },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Print,
                                contentDescription = "In lại",
                                tint = Color(0xFF9C27B0),
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                    // Delete item button - hide for cancelled items
                    if (onRemoveItem != null && !isCancelled) {
                        IconButton(
                            onClick = { onRemoveItem(item.id) },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Huỷ món",
                                tint = Color(0xFFF44336),
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }

            // Row 2: Base price
            Text(
                text = formatCurrency(item.unitPrice.toLong()),
                style = MaterialTheme.typography.bodySmall,
                color = Color.Gray
            )

            // Row 3: Combo children (if this is a combo parent)
            if (comboChildren.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFFFFF3E0).copy(alpha = 0.5f))
                        .padding(8.dp)
                ) {
                    Text(
                        text = "Bao gồm:",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFFE65100),
                        modifier = Modifier.padding(bottom = 4.dp)
                    )
                    comboChildren.forEach { child ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "•",
                                fontSize = 14.sp,
                                color = Color(0xFFFF9800),
                                modifier = Modifier.padding(end = 8.dp)
                            )
                            Text(
                                text = child.productName,
                                fontSize = 13.sp,
                                color = Color(0xFF424242),
                                modifier = Modifier.weight(1f)
                            )
                            Badge(
                                containerColor = Color(0xFFFF9800).copy(alpha = 0.2f)
                            ) {
                                Text(
                                    text = "x${child.quantity}",
                                    fontSize = 11.sp,
                                    color = Color(0xFFE65100),
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }

            // Row 3: Variants/Toppings - Grab style with prices (collapsible)
            if (!item.notes.isNullOrEmpty()) {
                // Split by " | " to separate variants from user note
                val parts = item.notes.split(" | ")
                val variantsPart = parts.firstOrNull() ?: ""
                val userNote = parts.getOrNull(1)

                // Parse variants (format: "Kiwi:10000, Size S:10000" or "Kiwi, Size S")
                val variants = variantsPart.split(",").map { it.trim() }.filter { it.isNotEmpty() && !it.startsWith("Ghi chú:") }
                if (variants.isNotEmpty()) {
                    // Use forceExpanded directly - no local state to avoid LazyColumn recycling issues
                    val toppingsExpanded = forceExpanded ?: !isCancelled

                    Spacer(modifier = Modifier.height(6.dp))

                    // Header showing topping count - clickable to toggle
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(4.dp))
                            .clickable(enabled = onToppingsToggle != null && !isCancelled) { onToppingsToggle?.invoke() }
                            .padding(vertical = 4.dp, horizontal = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = if (toppingsExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = Color.Gray
                        )
                        Text(
                            text = if (toppingsExpanded) "Tuỳ chọn (${variants.size})" else "Tuỳ chọn (${variants.size}) - Nhấn để xem",
                            fontSize = 12.sp,
                            color = Color.Gray,
                            modifier = Modifier.padding(start = 4.dp)
                        )
                    }

                    // Variants list - show/hide based on forceExpanded (no animation to prevent scroll jank)
                    if (toppingsExpanded) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(start = 4.dp)
                        ) {
                            variants.forEach { variant ->
                                // Parse variant format:
                                // Options: "Size: L (+10000)" or "Size: L" or "Đường: NHIỀU"
                                // Toppings: "+ Trân châu cam (+10000)" or "+ Trân châu cam"
                                var displayName = variant
                                var price = 0L

                                // Extract price from "(+xxxxx)" suffix
                                val priceMatch = Regex("\\s*\\(\\+?(\\d+)\\)\\s*$").find(variant)
                                if (priceMatch != null) {
                                    price = priceMatch.groupValues[1].toLongOrNull() ?: 0L
                                    displayName = variant.replace(priceMatch.value, "").trim()
                                }

                                // For toppings starting with "+", remove the "+" prefix
                                if (displayName.startsWith("+")) {
                                    displayName = displayName.removePrefix("+").trim()
                                }
                                // For options with "GroupName: Value" format, show only VALUE
                                // e.g., "Size: L" -> "L", "Đường: NHIỀU" -> "NHIỀU"
                                else if (displayName.contains(":")) {
                                    val colonIdx = displayName.indexOf(":")
                                    val value = displayName.substring(colonIdx + 1).trim()
                                    if (value.isNotEmpty()) {
                                        displayName = value
                                    }
                                }

                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 2.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text(
                                            text = "•",
                                            fontSize = 14.sp,
                                            color = Color.Gray,
                                            modifier = Modifier.padding(end = 8.dp)
                                        )
                                        Text(
                                            text = displayName,
                                            fontSize = 14.sp,
                                            color = Color(0xFF424242)
                                        )
                                    }
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        if (price > 0) {
                                            Text(
                                                text = "+${formatCurrency(price)}",
                                                fontSize = 14.sp,
                                                color = Color(0xFF1976D2),
                                                fontWeight = FontWeight.Medium
                                            )
                                        }
                                        // Delete topping button
                                        if (onRemoveTopping != null) {
                                            IconButton(
                                                onClick = { onRemoveTopping(item.id, displayName) },
                                                modifier = Modifier.size(24.dp)
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.Close,
                                                    contentDescription = "Xóa $displayName",
                                                    tint = Color(0xFFF44336).copy(alpha = 0.7f),
                                                    modifier = Modifier.size(14.dp)
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Show user note if exists (always visible)
                if (userNote != null && userNote.isNotEmpty()) {
                    Text(
                        text = userNote,
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.primary,
                        fontStyle = FontStyle.Italic,
                        modifier = Modifier.padding(start = 4.dp, top = 4.dp)
                    )
                }
            }
        }
    }
}

/**
 * Compact row for cancelled items - shows toppings in collapsible format
 * Shows: [Name] x[Qty] [Price] with toppings collapsible
 */
@Composable
fun CancelledItemRowCompact(item: OrderItemEntity) {
    var showDetails by remember { mutableStateOf(false) }

    // Parse toppings from notes
    val toppings = item.notes?.let { notes ->
        val parts = notes.split(" | ")
        val variantsPart = parts.firstOrNull() ?: ""
        variantsPart.split(",").map { it.trim() }.filter { it.isNotEmpty() && !it.startsWith("Ghi chú:") }
    } ?: emptyList()

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 4.dp, vertical = 2.dp)
    ) {
        // Main row - clickable to show details
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(6.dp))
                .background(Color(0xFFFFEBEE).copy(alpha = 0.5f))
                .clickable { showDetails = !showDetails }
                .padding(horizontal = 8.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                modifier = Modifier.weight(1f),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Expand icon if has toppings
                if (toppings.isNotEmpty()) {
                    Icon(
                        imageVector = if (showDetails) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = Color.Gray
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = item.productName,
                        fontSize = 13.sp,
                        color = Color.Gray,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        style = MaterialTheme.typography.bodyMedium.copy(
                            textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough
                        )
                    )
                    // Show toppings count when collapsed
                    if (toppings.isNotEmpty() && !showDetails) {
                        Text(
                            text = "${toppings.size} tuỳ chọn",
                            fontSize = 11.sp,
                            color = Color.Gray
                        )
                    }
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "x${item.quantity}",
                    fontSize = 12.sp,
                    color = Color.Gray,
                    modifier = Modifier.padding(end = 8.dp)
                )
                Text(
                    text = formatCurrency(item.totalPrice.toLong()),
                    fontSize = 13.sp,
                    color = Color.Gray,
                    style = MaterialTheme.typography.bodyMedium.copy(
                        textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough
                    )
                )
            }
        }

        // Expanded details: toppings and cancel reason (use expandVertically for smooth animation)
        AnimatedVisibility(
            visible = showDetails,
            enter = expandVertically() + fadeIn(),
            exit = shrinkVertically() + fadeOut()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 24.dp, end = 8.dp, top = 4.dp, bottom = 4.dp)
            ) {
                // Show toppings
                toppings.forEach { topping ->
                    var displayName = topping
                    var price = 0L

                    // Extract price
                    val priceMatch = Regex("\\s*\\(\\+?(\\d+)\\)\\s*$").find(topping)
                    if (priceMatch != null) {
                        price = priceMatch.groupValues[1].toLongOrNull() ?: 0L
                        displayName = topping.replace(priceMatch.value, "").trim()
                    }

                    // Clean up display name
                    if (displayName.startsWith("+")) {
                        displayName = displayName.removePrefix("+").trim()
                    } else if (displayName.contains(":")) {
                        val colonIdx = displayName.indexOf(":")
                        val value = displayName.substring(colonIdx + 1).trim()
                        if (value.isNotEmpty()) {
                            displayName = value
                        }
                    }

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 1.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "• $displayName",
                            fontSize = 12.sp,
                            color = Color.Gray
                        )
                        if (price > 0) {
                            Text(
                                text = "+${formatCurrency(price)}",
                                fontSize = 12.sp,
                                color = Color.Gray
                            )
                        }
                    }
                }

                // Cancel reason
                item.cancelReason?.let { reason ->
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Lý do: $reason",
                        fontSize = 12.sp,
                        color = Color(0xFFF44336),
                        fontStyle = FontStyle.Italic
                    )
                }
            }
        }
    }
}

// ===== DIALOGS =====

/**
 * Dialog xác nhận huỷ bill
 */
@Composable
fun CancelOrderConfirmationDialog(
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit
) {
    var reason by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        icon = {
            Icon(
                imageVector = Icons.Default.Warning,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.error,
                modifier = Modifier.size(48.dp)
            )
        },
        title = {
            Text(
                text = "Xác nhận huỷ đơn",
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column {
                Text(
                    text = "Bạn có chắc chắn muốn huỷ đơn hàng này?",
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = reason,
                    onValueChange = { reason = it },
                    label = { Text("Lý do huỷ (tùy chọn)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = false,
                    maxLines = 3
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(reason) },
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.error
                )
            ) {
                Text("XÁC NHẬN HUỶ")
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) {
                Text("ĐÓNG")
            }
        }
    )
}

/**
 * Dialog nhập ghi chú tổng bill
 */
@Composable
fun OrderNoteDialog(
    note: String,
    onNoteChanged: (String) -> Unit,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = {
            Icon(
                imageVector = Icons.Default.NoteAlt,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(48.dp)
            )
        },
        title = {
            Text(
                text = "Ghi chú đơn hàng",
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column {
                Text(
                    text = "Ghi chú sẽ được in trên bill (nếu bật hiển thị)",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = note,
                    onValueChange = onNoteChanged,
                    label = { Text("Ghi chú") },
                    placeholder = { Text("VD: Giao trước 12h, gọi trước khi giao...") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = false,
                    maxLines = 4,
                    minLines = 2
                )
            }
        },
        confirmButton = {
            Button(onClick = onConfirm) {
                Text("LƯU")
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) {
                Text("HUỶ")
            }
        }
    )
}

/**
 * Dialog xác nhận huỷ món trong đơn hàng
 * Món sẽ được đánh dấu là "cancelled" thay vì xoá để còn báo cáo
 */
@Composable
fun RemoveOrderItemConfirmationDialog(
    item: OrderItemEntity,
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit // reason parameter
) {
    var reason by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        icon = {
            Icon(
                imageVector = Icons.Default.Cancel,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.error,
                modifier = Modifier.size(48.dp)
            )
        },
        title = {
            Text(
                text = "Xác nhận huỷ món",
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column {
                Text(
                    text = "Món sẽ được đánh dấu huỷ để lưu báo cáo.",
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(modifier = Modifier.height(12.dp))
                // Show item info
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp)
                    ) {
                        Text(
                            text = item.productName,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Số lượng: ${item.quantity}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = reason,
                    onValueChange = { reason = it },
                    label = { Text("Lý do huỷ") },
                    placeholder = { Text("Nhập lý do huỷ món...") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = false,
                    maxLines = 3
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(reason) },
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.error
                )
            ) {
                Text("HUỶ MÓN")
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) {
                Text("ĐÓNG")
            }
        }
    )
}

/**
 * Menu dialog cho in lại tem/món
 */
@Composable
fun ReprintMenuDialog(
    itemId: String?, // null = all items
    onDismiss: () -> Unit,
    onReprintLabels: () -> Unit,
    onReprintKitchenTickets: () -> Unit
) {
    val title = if (itemId != null) "In lại món" else "In lại tất cả"

    AlertDialog(
        onDismissRequest = onDismiss,
        icon = {
            Icon(
                imageVector = Icons.Default.Print,
                contentDescription = null,
                tint = Color(0xFF9C27B0),
                modifier = Modifier.size(48.dp)
            )
        },
        title = {
            Text(
                text = title,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Chọn loại in lại:",
                    style = MaterialTheme.typography.bodyMedium
                )

                // Reprint Labels button
                OutlinedButton(
                    onClick = onReprintLabels,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = Color(0xFF9C27B0)
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.Label,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("IN LẠI TEM", fontWeight = FontWeight.Bold)
                }

                // Reprint Kitchen Tickets button
                OutlinedButton(
                    onClick = onReprintKitchenTickets,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = Color(0xFFFF9800)
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.Restaurant,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("IN LẠI PHIẾU BẾP", fontWeight = FontWeight.Bold)
                }
            }
        },
        confirmButton = {},
        dismissButton = {
            OutlinedButton(onClick = onDismiss) {
                Text("ĐÓNG")
            }
        }
    )
}

// ===== UTILITY FUNCTIONS =====

fun formatCurrency(amount: Long): String {
    val formatter = NumberFormat.getNumberInstance(Locale("vi", "VN"))
    return "${formatter.format(amount)}đ"
}
