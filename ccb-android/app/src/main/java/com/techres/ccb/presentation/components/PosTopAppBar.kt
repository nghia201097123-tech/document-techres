package com.techres.ccb.presentation.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarColors
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * POS-friendly TopAppBar optimized for devices like Sunmi POS.
 *
 * Features:
 * - Extra start padding (16dp) to avoid overlapping with system buttons in top-left corner
 * - Larger back button touch target (48dp) for easier pressing
 * - Consistent styling across all screens
 *
 * Usage:
 * ```
 * PosTopAppBar(
 *     title = { Text("Screen Title") },
 *     onBack = { navController.popBackStack() },
 *     actions = { /* optional action buttons */ }
 * )
 * ```
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PosTopAppBar(
    title: @Composable () -> Unit,
    onBack: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
    actions: @Composable RowScope.() -> Unit = {},
    colors: TopAppBarColors = TopAppBarDefaults.topAppBarColors(
        containerColor = MaterialTheme.colorScheme.primary,
        titleContentColor = MaterialTheme.colorScheme.onPrimary,
        navigationIconContentColor = MaterialTheme.colorScheme.onPrimary,
        actionIconContentColor = MaterialTheme.colorScheme.onPrimary
    )
) {
    TopAppBar(
        title = title,
        modifier = modifier,
        navigationIcon = {
            if (onBack != null) {
                // Add extra start padding to move back button away from system buttons
                // This is especially important for POS devices like Sunmi
                Box(modifier = Modifier.padding(start = 8.dp)) {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier.size(48.dp) // Larger touch target for POS devices
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Quay lại",
                            modifier = Modifier.size(28.dp) // Slightly larger icon
                        )
                    }
                }
            }
        },
        actions = actions,
        colors = colors
    )
}
