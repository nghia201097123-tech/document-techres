package com.techres.ccb.presentation.screens.sale.dialogs

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties

/**
 * Dialog for selecting pager/buzzer number (Thẻ rung)
 * - Shows current pager number or allows entering new number
 * - Quick select buttons for common numbers (1-12)
 * - Manual input for any number 1-99
 * - Option to auto-generate next available number
 * - Option to clear (not use pager)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PagerDialog(
    currentPagerNumber: Int? = null,
    onDismiss: () -> Unit,
    onConfirm: (Int?) -> Unit,
    onClear: () -> Unit,
    onAutoGenerate: () -> Unit
) {
    var inputText by remember(currentPagerNumber) {
        mutableStateOf(currentPagerNumber?.toString() ?: "")
    }
    var isError by remember { mutableStateOf(false) }

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
                .fillMaxWidth(0.9f)
                .wrapContentHeight(),
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 8.dp
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
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
                            text = "Thẻ rung",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Đóng")
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Current number display
                if (currentPagerNumber != null) {
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 16.dp),
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFFFF5722).copy(alpha = 0.1f)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                Icons.Default.Vibration,
                                contentDescription = null,
                                tint = Color(0xFFFF5722)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Số thẻ hiện tại: ",
                                style = MaterialTheme.typography.bodyLarge
                            )
                            Text(
                                text = "$currentPagerNumber",
                                style = MaterialTheme.typography.headlineMedium,
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
                        // Only allow numbers 1-99
                        if (value.isEmpty() || (value.all { it.isDigit() } && value.length <= 2)) {
                            inputText = value
                            isError = value.isNotEmpty() && (value.toIntOrNull() ?: 0) !in 1..99
                        }
                    },
                    label = { Text("Nhập số thẻ (1-99)") },
                    placeholder = { Text("VD: 15") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    isError = isError,
                    supportingText = if (isError) {
                        { Text("Số thẻ phải từ 1 đến 99") }
                    } else null,
                    leadingIcon = {
                        Icon(Icons.Default.Dialpad, contentDescription = null)
                    },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Quick select grid (1-12)
                Text(
                    text = "Chọn nhanh:",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 8.dp)
                )

                // Quick select buttons in 4x3 grid
                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    for (row in 0..2) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            for (col in 1..4) {
                                val number = row * 4 + col
                                val isSelected = inputText == number.toString()
                                Surface(
                                    modifier = Modifier
                                        .weight(1f)
                                        .aspectRatio(1.2f)
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
                                    color = if (isSelected) Color(0xFFFF5722).copy(alpha = 0.2f)
                                           else MaterialTheme.colorScheme.surfaceVariant,
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Box(
                                        contentAlignment = Alignment.Center,
                                        modifier = Modifier.fillMaxSize()
                                    ) {
                                        Text(
                                            text = "$number",
                                            fontSize = 18.sp,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                            color = if (isSelected) Color(0xFFFF5722)
                                                   else MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Action buttons
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
                        Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Tự động", fontSize = 12.sp)
                    }

                    // Clear button
                    OutlinedButton(
                        onClick = {
                            onClear()
                        },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = MaterialTheme.colorScheme.error
                        )
                    ) {
                        Icon(Icons.Default.Clear, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Bỏ qua", fontSize = 12.sp)
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

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
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !isError && (inputText.isEmpty() || inputText.toIntOrNull() in 1..99),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFFFF5722)
                    )
                ) {
                    Icon(Icons.Default.Check, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Xác nhận", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
