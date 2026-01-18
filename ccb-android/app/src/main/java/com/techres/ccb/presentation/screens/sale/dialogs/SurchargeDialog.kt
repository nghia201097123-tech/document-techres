package com.techres.ccb.presentation.screens.sale.dialogs

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.techres.ccb.data.local.entity.SurchargeEntity
import java.text.NumberFormat
import java.util.Locale

/**
 * Data class to track selected surcharges with quantity
 */
data class SelectedSurcharge(
    val surcharge: SurchargeEntity,
    val quantity: Int = 1
) {
    val totalAmount: Double get() = surcharge.amount * quantity
}

/**
 * Dialog để chọn phụ thu cho đơn hàng
 * Cho phép chọn nhiều loại phụ thu với số lượng khác nhau
 */
@Composable
fun SurchargeDialog(
    surcharges: List<SurchargeEntity>,
    currentlySelectedSurcharges: List<SelectedSurcharge> = emptyList(),
    onDismiss: () -> Unit,
    onConfirm: (List<SelectedSurcharge>) -> Unit
) {
    // Track selected surcharges with quantity
    var selectedSurcharges by remember {
        mutableStateOf(currentlySelectedSurcharges.associateBy { it.surcharge.id })
    }

    // Calculate total
    val totalSurcharge = selectedSurcharges.values.sumOf { it.totalAmount }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .fillMaxHeight(0.8f),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            )
        ) {
            Column(
                modifier = Modifier.fillMaxSize()
            ) {
                // Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Chọn phụ thu",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Đóng")
                    }
                }

                HorizontalDivider()

                if (surcharges.isEmpty()) {
                    // Empty state
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "Chưa có phụ thu",
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.outline
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Vui lòng thêm phụ thu trên Dashboard",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.outline
                            )
                        }
                    }
                } else {
                    // Surcharge list
                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(surcharges, key = { it.id }) { surcharge ->
                            val selected = selectedSurcharges[surcharge.id]
                            val isSelected = selected != null

                            SurchargeItem(
                                surcharge = surcharge,
                                selectedQuantity = selected?.quantity ?: 0,
                                onSelect = {
                                    selectedSurcharges = if (isSelected) {
                                        selectedSurcharges - surcharge.id
                                    } else {
                                        selectedSurcharges + (surcharge.id to SelectedSurcharge(surcharge, 1))
                                    }
                                },
                                onQuantityChange = { newQty ->
                                    if (newQty <= 0) {
                                        selectedSurcharges = selectedSurcharges - surcharge.id
                                    } else {
                                        selectedSurcharges = selectedSurcharges + (surcharge.id to SelectedSurcharge(surcharge, newQty))
                                    }
                                }
                            )
                        }
                    }
                }

                HorizontalDivider()

                // Total and buttons
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    // Total surcharge
                    if (totalSurcharge > 0) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.primaryContainer
                            )
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = "Tổng phụ thu:",
                                        style = MaterialTheme.typography.bodyMedium
                                    )
                                    Text(
                                        text = "${selectedSurcharges.size} khoản",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.outline
                                    )
                                }
                                Text(
                                    text = formatCurrency(totalSurcharge.toLong()),
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                    }

                    // Buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedButton(
                            onClick = onDismiss,
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Huỷ")
                        }

                        Button(
                            onClick = {
                                onConfirm(selectedSurcharges.values.toList())
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF4CAF50)
                            )
                        ) {
                            Text(
                                text = if (selectedSurcharges.isEmpty()) "Xoá phụ thu" else "Áp dụng",
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SurchargeItem(
    surcharge: SurchargeEntity,
    selectedQuantity: Int,
    onSelect: () -> Unit,
    onQuantityChange: (Int) -> Unit
) {
    val isSelected = selectedQuantity > 0

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onSelect() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) {
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
            } else {
                MaterialTheme.colorScheme.surfaceVariant
            }
        ),
        border = if (isSelected) {
            CardDefaults.outlinedCardBorder().copy(
                brush = androidx.compose.ui.graphics.SolidColor(MaterialTheme.colorScheme.primary)
            )
        } else null
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Checkbox
            Checkbox(
                checked = isSelected,
                onCheckedChange = { onSelect() }
            )

            Spacer(modifier = Modifier.width(8.dp))

            // Info
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = surcharge.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                if (!surcharge.description.isNullOrBlank()) {
                    Text(
                        text = surcharge.description,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.outline,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = formatCurrency(surcharge.amount.toLong()),
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    if (surcharge.vatRate > 0) {
                        Text(
                            text = " (gồm VAT ${surcharge.vatRate.toInt()}%)",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.outline
                        )
                    }
                }
            }

            // Quantity controls (show when selected)
            if (isSelected) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = { onQuantityChange(selectedQuantity - 1) },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            Icons.Default.Remove,
                            contentDescription = "Giảm",
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    Text(
                        text = selectedQuantity.toString(),
                        modifier = Modifier.padding(horizontal = 8.dp),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )

                    IconButton(
                        onClick = { onQuantityChange(selectedQuantity + 1) },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            Icons.Default.Add,
                            contentDescription = "Tăng",
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }
    }
}

private fun formatCurrency(amount: Long): String {
    val formatter = NumberFormat.getInstance(Locale("vi", "VN"))
    return "${formatter.format(amount)}đ"
}
