package com.techres.ccb.presentation.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// Primary colors
val Primary = Color(0xFFFF6B35)
val PrimaryDark = Color(0xFFE55A24)
val PrimaryLight = Color(0xFFFF8A5C)

// Secondary colors
val Secondary = Color(0xFF2E7D32)
val SecondaryDark = Color(0xFF1B5E20)
val SecondaryLight = Color(0xFF4CAF50)

// Neutral colors
val Gray50 = Color(0xFFFAFAFA)
val Gray100 = Color(0xFFF5F5F5)
val Gray200 = Color(0xFFEEEEEE)
val Gray300 = Color(0xFFE0E0E0)
val Gray600 = Color(0xFF757575)
val Gray900 = Color(0xFF212121)

// Semantic colors
val Success = Color(0xFF4CAF50)
val Warning = Color(0xFFFFC107)
val Error = Color(0xFFF44336)
val Info = Color(0xFF2196F3)

private val LightColorScheme = lightColorScheme(
    primary = Primary,
    onPrimary = Color.White,
    primaryContainer = PrimaryLight,
    onPrimaryContainer = Color.White,
    secondary = Secondary,
    onSecondary = Color.White,
    secondaryContainer = SecondaryLight,
    onSecondaryContainer = Color.White,
    background = Gray50,
    onBackground = Gray900,
    surface = Color.White,
    onSurface = Gray900,
    surfaceVariant = Gray100,
    onSurfaceVariant = Gray600,
    error = Error,
    onError = Color.White
)

private val DarkColorScheme = darkColorScheme(
    primary = PrimaryLight,
    onPrimary = Color.Black,
    primaryContainer = PrimaryDark,
    onPrimaryContainer = Color.White,
    secondary = SecondaryLight,
    onSecondary = Color.Black,
    secondaryContainer = SecondaryDark,
    onSecondaryContainer = Color.White,
    background = Gray900,
    onBackground = Gray50,
    surface = Color(0xFF1C1C1E),
    onSurface = Gray50,
    surfaceVariant = Color(0xFF2C2C2E),
    onSurfaceVariant = Gray300,
    error = Error,
    onError = Color.White
)

@Composable
fun CCBTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current

    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
