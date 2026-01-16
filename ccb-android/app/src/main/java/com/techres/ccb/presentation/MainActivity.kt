package com.techres.ccb.presentation

import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.techres.ccb.presentation.navigation.CCBNavHost
import com.techres.ccb.presentation.theme.CCBTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Ẩn navigation bar trên Sunmi POS và các thiết bị tương tự
        hideNavigationBarForPOS()

        enableEdgeToEdge()
        setContent {
            CCBTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    CCBNavHost()
                }
            }
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        // Đảm bảo navigation bar luôn ẩn khi app có focus
        if (hasFocus && isSunmiOrPOSDevice()) {
            hideNavigationBarForPOS()
        }
    }

    /**
     * Kiểm tra có phải thiết bị Sunmi POS hoặc thiết bị POS khác không
     */
    private fun isSunmiOrPOSDevice(): Boolean {
        val manufacturer = Build.MANUFACTURER.lowercase()
        val brand = Build.BRAND.lowercase()
        val model = Build.MODEL.lowercase()

        return manufacturer.contains("sunmi") ||
               brand.contains("sunmi") ||
               manufacturer.contains("sumi") ||
               brand.contains("sumi") ||
               // Các thiết bị POS phổ biến khác
               manufacturer.contains("newland") ||
               manufacturer.contains("pax") ||
               manufacturer.contains("verifone") ||
               model.contains("pos") ||
               model.contains("terminal")
    }

    /**
     * Ẩn navigation bar (3 nút điều hướng) trên thiết bị POS
     * Sử dụng immersive sticky mode để ẩn hoàn toàn
     */
    private fun hideNavigationBarForPOS() {
        if (!isSunmiOrPOSDevice()) return

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                // Android 11+ (API 30+)
                window.insetsController?.let { controller ->
                    controller.hide(WindowInsets.Type.navigationBars())
                    controller.systemBarsBehavior =
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                }
            } else {
                // Android 10 và thấp hơn
                @Suppress("DEPRECATION")
                window.decorView.systemUiVisibility = (
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                )
            }

            // Đảm bảo layout mở rộng ra toàn màn hình
            window.setFlags(
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
            )

            // Thử gọi Sunmi API để ẩn navigation bar (nếu có)
            hideSunmiNavigationBar()
        } catch (e: Exception) {
            // Ignore errors on non-POS devices
        }
    }

    /**
     * Gọi Sunmi API riêng để ẩn navigation bar
     * Sunmi có API: Settings.System.putInt(contentResolver, "navigation_bar_visible", 0)
     */
    private fun hideSunmiNavigationBar() {
        try {
            // Thử dùng Sunmi Settings API
            android.provider.Settings.System.putInt(
                contentResolver,
                "navigation_bar_visible",
                0 // 0 = ẩn, 1 = hiện
            )
        } catch (e: Exception) {
            // Fallback: Sunmi API không có sẵn, dùng immersive mode
        }

        try {
            // Một số Sunmi dùng key khác
            android.provider.Settings.System.putInt(
                contentResolver,
                "hide_navigation_bar",
                1 // 1 = ẩn
            )
        } catch (e: Exception) {
            // Ignore
        }
    }
}
