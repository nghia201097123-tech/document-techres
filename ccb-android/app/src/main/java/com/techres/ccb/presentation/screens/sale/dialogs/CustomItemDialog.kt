package com.techres.ccb.presentation.screens.sale.dialogs

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import java.text.DecimalFormat
import java.text.NumberFormat
import java.util.Locale

/**
 * Dialog để thêm món ngoài menu vào đơn hàng
 * Cho phép nhập tên món, giá tiền và số lượng
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomItemDialog(
    onDismiss: () -> Unit,
    onConfirm: (name: String, price: Double, quantity: Int, note: String?) -> Unit
) {
    var itemName by remember { mutableStateOf("") }
    var priceText by remember { mutableStateOf("") }
    var quantity by remember { mutableIntStateOf(1) }
    var note by remember { mutableStateOf("") }
    var priceError by remember { mutableStateOf<String?>(null) }
    var nameError by remember { mutableStateOf<String?>(null) }

    // Parse price from text
    val price = priceText.replace(".", "").replace(",", "").toDoubleOrNull() ?: 0.0

    // Validation
    val isValid = itemName.isNotBlank() && price > 0 && quantity > 0

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .wrapContentHeight(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            )
        ) {
            Column(
                modifier = Modifier.padding(20.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Thêm món ngoài menu",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Đóng")
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Item Name
                OutlinedTextField(
                    value = itemName,
                    onValueChange = {
                        itemName = it
                        nameError = if (it.isBlank()) "Vui lòng nhập tên món" else null
                    },
                    label = { Text("Tên món *") },
                    placeholder = { Text("VD: Bánh sinh nhật, Nước suối...") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    isError = nameError != null,
                    supportingText = if (nameError != null) {
                        { Text(nameError!!, color = MaterialTheme.colorScheme.error) }
                    } else null
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Price Input
                OutlinedTextField(
                    value = priceText,
                    onValueChange = { input ->
                        // Only allow numeric input
                        val filtered = input.filter { it.isDigit() }
                        priceText = filtered
                        priceError = if (filtered.isEmpty() || filtered.toDoubleOrNull() == 0.0) {
                            "Vui lòng nhập giá tiền"
                        } else null
                    },
                    label = { Text("Giá tiền (VNĐ) *") },
                    placeholder = { Text("VD: 50000") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    isError = priceError != null,
                    supportingText = {
                        if (priceError != null) {
                            Text(priceError!!, color = MaterialTheme.colorScheme.error)
                        } else if (price > 0) {
                            Text(
                                text = "= ${formatCurrency(price.toLong())}",
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Quantity
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Số lượng:",
                        style = MaterialTheme.typography.bodyLarge
                    )
                    Spacer(modifier = Modifier.width(16.dp))

                    // Decrease button
                    FilledTonalButton(
                        onClick = { if (quantity > 1) quantity-- },
                        modifier = Modifier.size(40.dp),
                        contentPadding = PaddingValues(0.dp),
                        enabled = quantity > 1
                    ) {
                        Text("-", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }

                    // Quantity display
                    Text(
                        text = quantity.toString(),
                        modifier = Modifier.padding(horizontal = 20.dp),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )

                    // Increase button
                    FilledTonalButton(
                        onClick = { quantity++ },
                        modifier = Modifier.size(40.dp),
                        contentPadding = PaddingValues(0.dp)
                    ) {
                        Text("+", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Note (optional)
                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    label = { Text("Ghi chú (tùy chọn)") },
                    placeholder = { Text("VD: Không đường, ít đá...") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 2
                )

                Spacer(modifier = Modifier.height(20.dp))

                // Total preview
                if (price > 0) {
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
                            Text(
                                text = "Thành tiền:",
                                style = MaterialTheme.typography.bodyLarge
                            )
                            Text(
                                text = formatCurrency((price * quantity).toLong()),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

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
                            if (isValid) {
                                onConfirm(
                                    itemName.trim(),
                                    price,
                                    quantity,
                                    note.trim().ifBlank { null }
                                )
                            }
                        },
                        modifier = Modifier.weight(1f),
                        enabled = isValid,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF4CAF50)
                        )
                    ) {
                        Text("Thêm món", fontWeight = FontWeight.Bold)
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
