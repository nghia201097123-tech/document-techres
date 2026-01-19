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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties

/**
 * Số lượng thẻ rung hiển thị trong grid chọn nhanh
 */
enum class PagerGridSize(val count: Int, val label: String) {
    SIZE_8(8, "8"),
    SIZE_16(16, "16"),
    SIZE_32(32, "32"),
    SIZE_64(64, "64"),
    SIZE_99(99, "99");

    companion object {
        fun fromCount(count: Int): PagerGridSize {
            return entries.find { it.count == count } ?: SIZE_16
        }
    }
}

/**
 * Dialog for selecting pager/buzzer number (Thẻ rung)
 * - Shows current pager number or allows entering new number
 * - Quick select grid with configurable size (8, 16, 32, 64, 99)
 * - Manual input for any number 1-99
 * - Option to auto-generate next available number
 * - Option to clear (not use pager)
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
                .fillMaxWidth(0.85f)
                .wrapContentHeight(),
            shape = RoundedCornerShape(12.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 8.dp
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header - compact
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
                            modifier = Modifier.size(22.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Thẻ rung",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(Icons.Default.Close, contentDescription = "Đóng", modifier = Modifier.size(20.dp))
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Current number display - compact
                if (currentPagerNumber != null) {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFFFF5722).copy(alpha = 0.1f)
                    ) {
                        Row(
                            modifier = Modifier.padding(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Text(
                                text = "Hiện tại: ",
                                style = MaterialTheme.typography.bodyMedium
                            )
                            Text(
                                text = "$currentPagerNumber",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFFF5722)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                }

                // Manual input - compact
                OutlinedTextField(
                    value = inputText,
                    onValueChange = { value ->
                        if (value.isEmpty() || (value.all { it.isDigit() } && value.length <= 2)) {
                            inputText = value
                            isError = value.isNotEmpty() && (value.toIntOrNull() ?: 0) !in 1..99
                        }
                    },
                    label = { Text("Số thẻ (1-99)", fontSize = 12.sp) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    isError = isError,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    textStyle = LocalTextStyle.current.copy(fontSize = 14.sp)
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Quick select header with grid size selector
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Chọn nhanh:",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    // Grid size selector
                    Box {
                        TextButton(
                            onClick = { showGridSizeMenu = true },
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = "SL: ${selectedGridSize.count}",
                                fontSize = 11.sp,
                                color = Color(0xFFFF5722)
                            )
                            Icon(
                                Icons.Default.ArrowDropDown,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = Color(0xFFFF5722)
                            )
                        }
                        DropdownMenu(
                            expanded = showGridSizeMenu,
                            onDismissRequest = { showGridSizeMenu = false }
                        ) {
                            PagerGridSize.entries.forEach { size ->
                                DropdownMenuItem(
                                    text = { Text("${size.count} thẻ") },
                                    onClick = {
                                        selectedGridSize = size
                                        onGridSizeChanged?.invoke(size)
                                        showGridSizeMenu = false
                                    },
                                    leadingIcon = {
                                        if (size == selectedGridSize) {
                                            Icon(
                                                Icons.Default.Check,
                                                contentDescription = null,
                                                tint = Color(0xFFFF5722),
                                                modifier = Modifier.size(16.dp)
                                            )
                                        }
                                    }
                                )
                            }
                        }
                    }
                }

                // Quick select grid - compact with configurable size
                val numbers = (1..selectedGridSize.count).toList()
                val columns = when {
                    selectedGridSize.count <= 16 -> 4
                    selectedGridSize.count <= 32 -> 8
                    else -> 8
                }
                val gridHeight = when {
                    selectedGridSize.count <= 8 -> 80.dp
                    selectedGridSize.count <= 16 -> 120.dp
                    selectedGridSize.count <= 32 -> 140.dp
                    selectedGridSize.count <= 64 -> 200.dp
                    else -> 280.dp
                }

                LazyVerticalGrid(
                    columns = GridCells.Fixed(columns),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(gridHeight),
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    items(numbers) { number ->
                        val isSelected = inputText == number.toString()
                        Surface(
                            modifier = Modifier
                                .aspectRatio(1f)
                                .clip(RoundedCornerShape(6.dp))
                                .clickable {
                                    inputText = number.toString()
                                    isError = false
                                }
                                .then(
                                    if (isSelected) Modifier.border(
                                        1.5.dp,
                                        Color(0xFFFF5722),
                                        RoundedCornerShape(6.dp)
                                    ) else Modifier
                                ),
                            color = if (isSelected) Color(0xFFFF5722).copy(alpha = 0.2f)
                                   else MaterialTheme.colorScheme.surfaceVariant,
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.fillMaxSize()
                            ) {
                                Text(
                                    text = "$number",
                                    fontSize = if (columns >= 8) 10.sp else 14.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) Color(0xFFFF5722)
                                           else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Action buttons - compact
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    // Auto generate button
                    OutlinedButton(
                        onClick = {
                            onAutoGenerate()
                            onDismiss()
                        },
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = Color(0xFF2196F3)
                        )
                    ) {
                        Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(3.dp))
                        Text("Tự động", fontSize = 11.sp)
                    }

                    // Clear button
                    OutlinedButton(
                        onClick = { onClear() },
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = MaterialTheme.colorScheme.error
                        )
                    ) {
                        Icon(Icons.Default.Clear, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(3.dp))
                        Text("Bỏ qua", fontSize = 11.sp)
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Confirm button - compact
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
                        .height(40.dp),
                    enabled = !isError && (inputText.isEmpty() || inputText.toIntOrNull() in 1..99),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFFFF5722)
                    )
                ) {
                    Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Xác nhận", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
