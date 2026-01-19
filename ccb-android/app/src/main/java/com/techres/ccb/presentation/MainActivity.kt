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

        // Ẩn navigation bar cho tất cả thiết bị (đặc biệt quan trọng với máy POS)
        hideNavigationBar()

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
        if (hasFocus) {
            hideNavigationBar()
        }
    }

    override fun onResume() {
        super.onResume()
        // Đảm bảo navigation bar ẩn khi quay lại app
        hideNavigationBar()
    }

    /**
     * Kiểm tra có phải thiết bị Sunmi POS hoặc thiết bị POS khác không
     * Dùng để áp dụng các API đặc biệt của từng hãng
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
               manufacturer.contains("telpo") ||
               manufacturer.contains("urovo") ||
               manufacturer.contains("aisino") ||
               manufacturer.contains("wintec") ||
               manufacturer.contains("bixolon") ||
               manufacturer.contains("imin") ||
               manufacturer.contains("商米") ||  // Sunmi Chinese name
               model.contains("pos") ||
               model.contains("terminal") ||
               model.contains("kiosk")
    }

    /**
     * Ẩn navigation bar (3 nút điều hướng) - áp dụng cho TẤT CẢ thiết bị
     * Sử dụng immersive sticky mode để ẩn hoàn toàn
     * Navigation bar sẽ hiện lại tạm thời khi user vuốt từ cạnh màn hình
     */
    private fun hideNavigationBar() {
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
                    or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                )
            }

            // Đảm bảo layout mở rộng ra toàn màn hình
            window.setFlags(
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
            )

            // Thử gọi API đặc biệt của các hãng POS (nếu có)
            if (isSunmiOrPOSDevice()) {
                hidePOSNavigationBar()
            }
        } catch (e: Exception) {
            // Ignore errors
        }
    }

    /**
     * Gọi API đặc biệt của các hãng POS để ẩn navigation bar
     * Mỗi hãng có thể có API riêng
     */
    private fun hidePOSNavigationBar() {
        // Sunmi API
        try {
            android.provider.Settings.System.putInt(
                contentResolver,
                "navigation_bar_visible",
                0 // 0 = ẩn, 1 = hiện
            )
        } catch (e: Exception) {
            // Sunmi API không có sẵn
        }

        try {
            android.provider.Settings.System.putInt(
                contentResolver,
                "hide_navigation_bar",
                1 // 1 = ẩn
            )
        } catch (e: Exception) {
            // Ignore
        }

        // iMin POS API
        try {
            android.provider.Settings.System.putInt(
                contentResolver,
                "imin_navigation_bar",
                0 // 0 = ẩn
            )
        } catch (e: Exception) {
            // iMin API không có sẵn
        }
    }
}
