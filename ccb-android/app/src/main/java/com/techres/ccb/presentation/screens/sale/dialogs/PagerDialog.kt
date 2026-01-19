package com.techres.ccb.presentation.screens.sale.dialogs

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties

/**
 * Số lượng thẻ rung hiển thị trong grid chọn nhanh
 */
enum class PagerGridSize(val count: Int, val columns: Int) {
    SIZE_8(8, 4),
    SIZE_16(16, 4),
    SIZE_32(32, 8),
    SIZE_64(64, 8),
    SIZE_99(99, 10);

    companion object {
        fun fromCount(count: Int): PagerGridSize {
            return entries.find { it.count == count } ?: SIZE_16
        }
    }
}

/**
 * Dialog for selecting pager/buzzer number (Thẻ rung)
 * Optimized for easy selection with large touch targets
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PagerDialog(
    currentPagerNumber: Int? = null,
    gridSize: PagerGridSize = PagerGridSize.SIZE_16,
    onDismiss: () -> Unit,
    onConfirm: (Int?) -> Unit,
    onClear: () -> Unit,
    onAutoGenerate: () -> Unit,
    onGridSizeChanged: ((PagerGridSize) -> Unit)? = null
) {
    var inputText by remember(currentPagerNumber) {
        mutableStateOf(currentPagerNumber?.toString() ?: "")
    }
    var isError by remember { mutableStateOf(false) }
    var selectedGridSize by remember { mutableStateOf(gridSize) }
    var showGridSizeMenu by remember { mutableStateOf(false) }

    val configuration = LocalConfiguration.current
    val screenHeight = configuration.screenHeightDp.dp

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
                .fillMaxWidth(0.95f)
                .fillMaxHeight(0.85f),
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 8.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Vibration,
                            contentDescription = null,
                            tint = Color(0xFFFF5722),
                            modifier = Modifier.size(28.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Chọn thẻ rung",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Đóng")
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Input row with current number and text field
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Current number display
                    if (currentPagerNumber != null) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFFFF5722).copy(alpha = 0.15f)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Hiện tại:",
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "$currentPagerNumber",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFFF5722)
                                )
                            }
                        }
                    }

                    // Manual input
                    OutlinedTextField(
                        value = inputText,
                        onValueChange = { value ->
                            if (value.isEmpty() || (value.all { it.isDigit() } && value.length <= 2)) {
                                inputText = value
                                isError = value.isNotEmpty() && (value.toIntOrNull() ?: 0) !in 1..99
                            }
                        },
                        label = { Text("Nhập số (1-99)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        isError = isError,
                        modifier = Modifier.weight(1f)
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Grid size selector row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Chọn nhanh:",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Medium
                    )

                    // Grid size chips
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        PagerGridSize.entries.forEach { size ->
                            FilterChip(
                                selected = selectedGridSize == size,
                                onClick = {
                                    selectedGridSize = size
                                    onGridSizeChanged?.invoke(size)
                                },
                                label = { Text("${size.count}", fontSize = 12.sp) },
                                modifier = Modifier.height(28.dp),
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = Color(0xFFFF5722),
                                    selectedLabelColor = Color.White
                                )
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Main grid - takes remaining space
                val numbers = (1..selectedGridSize.count).toList()

                LazyVerticalGrid(
                    columns = GridCells.Fixed(selectedGridSize.columns),
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    contentPadding = PaddingValues(vertical = 4.dp)
                ) {
                    items(numbers) { number ->
                        val isSelected = inputText == number.toString()
                        Surface(
                            modifier = Modifier
                                .aspectRatio(1f)
                                .clip(RoundedCornerShape(8.dp))
                                .clickable {
                                    inputText = number.toString()
                                    isError = false
                                }
                                .then(
                                    if (isSelected) Modifier.border(
                                        2.dp,
                                        Color(0xFFFF5722),
                                        RoundedCornerShape(8.dp)
                                    ) else Modifier
                                ),
                            color = if (isSelected) Color(0xFFFF5722).copy(alpha = 0.25f)
                                   else MaterialTheme.colorScheme.surfaceVariant,
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.fillMaxSize()
                            ) {
                                Text(
                                    text = "$number",
                                    fontSize = when {
                                        selectedGridSize.columns <= 4 -> 20.sp
                                        selectedGridSize.columns <= 8 -> 16.sp
                                        else -> 14.sp
                                    },
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) Color(0xFFFF5722)
                                           else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Bottom action buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Auto generate button
                    OutlinedButton(
                        onClick = {
                            onAutoGenerate()
                            onDismiss()
                        },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = Color(0xFF2196F3)
                        )
                    ) {
                        Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Tự động")
                    }

                    // Clear button
                    OutlinedButton(
                        onClick = { onClear() },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = MaterialTheme.colorScheme.error
                        )
                    ) {
                        Icon(Icons.Default.Clear, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Bỏ qua")
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Confirm button
                Button(
                    onClick = {
                        val number = inputText.toIntOrNull()
                        if (number != null && number in 1..99) {
                            onConfirm(number)
                        } else if (inputText.isEmpty()) {
                            onClear()
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    enabled = !isError && (inputText.isEmpty() || inputText.toIntOrNull() in 1..99),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFFFF5722)
                    )
                ) {
                    Icon(Icons.Default.Check, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Xác nhận", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
