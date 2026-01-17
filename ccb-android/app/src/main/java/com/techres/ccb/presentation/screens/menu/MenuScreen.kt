package com.techres.ccb.presentation.screens.menu

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.techres.ccb.data.local.entity.CategoryEntity
import com.techres.ccb.data.local.entity.ProductEntity

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MenuScreen(
    orderId: String?,
    onNavigateBack: () -> Unit,
    onNavigateToOrder: (String) -> Unit,
    viewModel: MenuViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(orderId) {
        viewModel.setOrderId(orderId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Thực đơn") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Quay lại")
                    }
                },
                actions = {
                    if (orderId != null && uiState.orderItemCount > 0) {
                        Badge(
                            containerColor = MaterialTheme.colorScheme.error
                        ) {
                            Text("${uiState.orderItemCount}")
                        }
                        IconButton(onClick = { onNavigateToOrder(orderId) }) {
                            Icon(Icons.Default.ShoppingCart, contentDescription = "Giỏ hàng")
                        }
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Search bar
            OutlinedTextField(
                value = uiState.searchQuery,
                onValueChange = { viewModel.search(it) },
                placeholder = { Text("Tìm sản phẩm...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            // Product Type Tabs
            ScrollableTabRow(
                selectedTabIndex = ProductType.entries.indexOf(uiState.selectedProductType),
                modifier = Modifier.fillMaxWidth(),
                edgePadding = 16.dp,
                divider = {}
            ) {
                ProductType.entries.forEach { productType ->
                    val hasItems = uiState.hasCategories(productType)
                    Tab(
                        selected = uiState.selectedProductType == productType,
                        onClick = { viewModel.selectProductType(productType) },
                        enabled = hasItems || productType == ProductType.ALL,
                        text = {
                            Text(
                                text = productType.label,
                                fontWeight = if (uiState.selectedProductType == productType) FontWeight.Bold else FontWeight.Normal
                            )
                        }
                    )
                }
            }

            // Categories for selected product type
            if (uiState.filteredCategories.isNotEmpty()) {
                LazyRow(
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        CategoryChip(
                            name = "Tất cả",
                            isSelected = uiState.selectedCategoryId == null,
                            onClick = { viewModel.selectCategory(null) }
                        )
                    }
                    items(uiState.filteredCategories) { category ->
                        CategoryChip(
                            name = category.name,
                            isSelected = uiState.selectedCategoryId == category.id,
                            onClick = { viewModel.selectCategory(category.id) }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Products grid
            if (uiState.products.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Không có sản phẩm",
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                }
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(3),
                    contentPadding = PaddingValues(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(uiState.products) { product ->
                        ProductCard(
                            product = product,
                            onClick = {
                                if (orderId != null) {
                                    viewModel.addProductToOrder(product)
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CategoryChip(
    name: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    FilterChip(
        selected = isSelected,
        onClick = onClick,
        label = { Text(name) },
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = MaterialTheme.colorScheme.primary,
            selectedLabelColor = MaterialTheme.colorScheme.onPrimary
        )
    )
}

@Composable
private fun ProductCard(
    product: ProductEntity,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth()
        ) {
            // Product image placeholder
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(80.dp)
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Fastfood,
                    contentDescription = null,
                    modifier = Modifier.size(32.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                )
            }

            Column(
                modifier = Modifier.padding(8.dp)
            ) {
                Text(
                    text = product.name,
                    fontWeight = FontWeight.Medium,
                    fontSize = 14.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = formatPrice(product.price),
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
            }
        }
    }
}

private fun formatPrice(amount: Double): String {
    return String.format("%,.0f đ", amount)
}
