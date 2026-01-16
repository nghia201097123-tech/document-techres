package com.techres.ccb.printer.adapter

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.os.Build
import android.os.IBinder
import android.os.RemoteException
import com.techres.ccb.printer.core.*
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Sunmi Built-in Printer Adapter
 *
 * Hỗ trợ máy in tích hợp trong các thiết bị Sunmi POS
 * Sử dụng AIDL interface của Sunmi
 *
 * Thiết bị hỗ trợ:
 * - Sunmi V1, V1s
 * - Sunmi V2, V2 Pro, V2s
 * - Sunmi T1, T1 mini
 * - Sunmi T2, T2 mini, T2s
 * - Sunmi P1, P2, P2 Lite
 * - Sunmi M2, M2 Max
 * - Sunmi D2, D2 mini, D2s
 * - Sunmi K1, K2
 * - Sunmi L2, L2k, L2s
 *
 * Tính năng:
 * - In text với nhiều style
 * - In hình ảnh/logo
 * - In barcode (1D, 2D)
 * - In QR code
 * - Cắt giấy (auto cutter)
 * - Mở ngăn kéo tiền
 * - Trạng thái máy in real-time
 */
@Singleton
class SunmiPrinterAdapter @Inject constructor(
    @ApplicationContext private val context: Context
) : PrinterConnection {

    companion object {
        private const val TAG = "SunmiPrinter"

        // Sunmi printer service
        private const val SUNMI_PACKAGE = "woyou.aidlservice.jiuiv5"
        private const val SUNMI_SERVICE = "woyou.aidlservice.jiuiv5.IWoyouService"
        private const val SUNMI_SERVICE_ACTION = "woyou.aidlservice.jiuiv5.IWoyouService"

        // Alternative package names (different Sunmi versions)
        private val SUNMI_PACKAGES = listOf(
            "woyou.aidlservice.jiuiv5",
            "com.sunmi.peripheral.printer"
        )
    }

    override val connectionType = ConnectionType.SUNMI_INNER

    private val _connectionState = MutableStateFlow<ConnectionState>(ConnectionState.Disconnected)
    override val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private var _connectedDevice: PrinterDevice? = null
    override val connectedDevice: PrinterDevice? get() = _connectedDevice

    // Sunmi printer service binder (sử dụng reflection do không có AIDL file)
    private var printerService: Any? = null
    private var serviceConnection: ServiceConnection? = null
    private var isBound = false

    override fun isConnected(): Boolean = printerService != null && _connectionState.value == ConnectionState.Connected

    /**
     * Kiểm tra thiết bị có phải Sunmi không
     */
    fun isSunmiDevice(): Boolean {
        return Build.MANUFACTURER.equals("SUNMI", ignoreCase = true) ||
               Build.BRAND.equals("SUNMI", ignoreCase = true) ||
               isSunmiServiceAvailable()
    }

    /**
     * Kiểm tra Sunmi printer service có sẵn không
     */
    fun isSunmiServiceAvailable(): Boolean {
        val pm = context.packageManager
        return SUNMI_PACKAGES.any { pkg ->
            try {
                pm.getPackageInfo(pkg, 0)
                true
            } catch (e: PackageManager.NameNotFoundException) {
                false
            }
        }
    }

    /**
     * Lấy model thiết bị Sunmi
     */
    fun getSunmiModel(): String {
        return when {
            Build.MODEL.contains("V1", ignoreCase = true) -> "Sunmi V1"
            Build.MODEL.contains("V2", ignoreCase = true) -> {
                when {
                    Build.MODEL.contains("Pro", ignoreCase = true) -> "Sunmi V2 Pro"
                    Build.MODEL.contains("s", ignoreCase = true) -> "Sunmi V2s"
                    else -> "Sunmi V2"
                }
            }
            Build.MODEL.contains("T1", ignoreCase = true) -> "Sunmi T1"
            Build.MODEL.contains("T2", ignoreCase = true) -> {
                when {
                    Build.MODEL.contains("mini", ignoreCase = true) -> "Sunmi T2 mini"
                    Build.MODEL.contains("s", ignoreCase = true) -> "Sunmi T2s"
                    else -> "Sunmi T2"
                }
            }
            Build.MODEL.contains("P1", ignoreCase = true) -> "Sunmi P1"
            Build.MODEL.contains("P2", ignoreCase = true) -> {
                if (Build.MODEL.contains("Lite", ignoreCase = true)) "Sunmi P2 Lite"
                else "Sunmi P2"
            }
            Build.MODEL.contains("M2", ignoreCase = true) -> {
                if (Build.MODEL.contains("Max", ignoreCase = true)) "Sunmi M2 Max"
                else "Sunmi M2"
            }
            Build.MODEL.contains("D2", ignoreCase = true) -> {
                when {
                    Build.MODEL.contains("mini", ignoreCase = true) -> "Sunmi D2 mini"
                    Build.MODEL.contains("s", ignoreCase = true) -> "Sunmi D2s"
                    else -> "Sunmi D2"
                }
            }
            Build.MODEL.contains("K1", ignoreCase = true) -> "Sunmi K1"
            Build.MODEL.contains("K2", ignoreCase = true) -> "Sunmi K2"
            Build.MODEL.contains("L2", ignoreCase = true) -> "Sunmi L2"
            else -> "Sunmi Device (${Build.MODEL})"
        }
    }

    override suspend fun connect(device: PrinterDevice): PrinterResult = withContext(Dispatchers.Main) {
        if (!isSunmiDevice() && !isSunmiServiceAvailable()) {
            _connectionState.value = ConnectionState.Error("Not a Sunmi device")
            return@withContext PrinterResult.Error("This is not a Sunmi device")
        }

        _connectionState.value = ConnectionState.Connecting

        try {
            val connected = bindService()
            if (connected) {
                _connectedDevice = PrinterDevice.sunmiInner().copy(
                    name = getSunmiModel(),
                    isConnected = true
                )
                _connectionState.value = ConnectionState.Connected
                Timber.d("$TAG: Connected to Sunmi inner printer")
                return@withContext PrinterResult.Success
            } else {
                _connectionState.value = ConnectionState.Error("Cannot bind to Sunmi service")
                return@withContext PrinterResult.Error("Cannot bind to Sunmi printer service")
            }
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Connection failed")
            _connectionState.value = ConnectionState.Error(e.message ?: "Connection failed")
            return@withContext PrinterResult.Error(e.message ?: "Connection failed")
        }
    }

    /**
     * Kết nối tự động (không cần device parameter)
     */
    suspend fun connect(): PrinterResult {
        return connect(PrinterDevice.sunmiInner())
    }

    private suspend fun bindService(): Boolean = suspendCancellableCoroutine { cont ->
        serviceConnection = object : ServiceConnection {
            override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
                Timber.d("$TAG: Service connected")
                printerService = service
                isBound = true
                if (cont.isActive) {
                    cont.resume(true)
                }
            }

            override fun onServiceDisconnected(name: ComponentName?) {
                Timber.d("$TAG: Service disconnected")
                printerService = null
                isBound = false
                _connectionState.value = ConnectionState.Disconnected
            }
        }

        val intent = Intent().apply {
            setPackage(SUNMI_PACKAGE)
            action = SUNMI_SERVICE_ACTION
        }

        val bound = try {
            context.bindService(intent, serviceConnection!!, Context.BIND_AUTO_CREATE)
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Failed to bind service")
            false
        }

        if (!bound && cont.isActive) {
            cont.resume(false)
        }
    }

    override suspend fun disconnect(): PrinterResult = withContext(Dispatchers.Main) {
        try {
            serviceConnection?.let { context.unbindService(it) }
        } catch (e: Exception) {
            Timber.w(e, "$TAG: Error unbinding service")
        }
        printerService = null
        serviceConnection = null
        isBound = false
        _connectedDevice = null
        _connectionState.value = ConnectionState.Disconnected
        Timber.d("$TAG: Disconnected")
        return@withContext PrinterResult.Success
    }

    /**
     * Gửi ESC/POS commands trực tiếp
     * Sunmi cũng hỗ trợ ESC/POS commands
     */
    override suspend fun write(data: ByteArray): PrinterResult = withContext(Dispatchers.IO) {
        if (!isConnected()) {
            return@withContext PrinterResult.Error("Not connected")
        }

        try {
            // Tìm method sendRAWData bằng cách duyệt qua tất cả methods
            // vì callback interface có thể khác nhau giữa các version Sunmi SDK
            val service = printerService ?: return@withContext PrinterResult.Error("Service not available")

            val methods = service.javaClass.methods
            val sendRawMethod = methods.find { method ->
                method.name == "sendRAWData" && method.parameterTypes.size == 2
            }

            if (sendRawMethod != null) {
                sendRawMethod.invoke(service, data, null)
                return@withContext PrinterResult.Success
            }

            // Fallback: thử method printRawData
            val printRawMethod = methods.find { method ->
                method.name == "printRawData" && method.parameterTypes.size == 2
            }

            if (printRawMethod != null) {
                printRawMethod.invoke(service, data, null)
                return@withContext PrinterResult.Success
            }

            // Fallback 2: thử printerInit + sendRAWData không callback
            val initMethod = methods.find { it.name == "printerInit" }
            initMethod?.invoke(service, null)

            val rawMethodNoCallback = methods.find { method ->
                method.name == "sendRAWData" && method.parameterTypes.size == 1
            }
            if (rawMethodNoCallback != null) {
                rawMethodNoCallback.invoke(service, data)
                return@withContext PrinterResult.Success
            }

            return@withContext PrinterResult.Error("Cannot find sendRAWData method")
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Write failed")
            return@withContext PrinterResult.Error(e.message ?: "Write failed")
        }
    }

    override suspend fun read(timeout: Long): ByteArray? {
        // Sunmi printer không hỗ trợ đọc response
        return null
    }

    override suspend fun getStatus(): PrinterStatus = withContext(Dispatchers.IO) {
        if (!isConnected()) {
            return@withContext PrinterStatus(isOnline = false)
        }

        try {
            // Gọi updatePrinterState
            val method = printerService?.javaClass?.getMethod("updatePrinterState")
            val state = method?.invoke(printerService) as? Int ?: -1

            return@withContext when (state) {
                1 -> PrinterStatus(isOnline = true)  // Normal
                2 -> PrinterStatus(isOnline = true, hasError = true, errorMessage = "Preparing")
                3 -> PrinterStatus(isOnline = true, hasError = true, errorMessage = "Abnormal communication")
                4 -> PrinterStatus(isOnline = false, hasError = true, errorMessage = "Out of paper")
                5 -> PrinterStatus(isOnline = true, hasError = true, errorMessage = "Overheated")
                6 -> PrinterStatus(isOnline = true, coverOpen = true, errorMessage = "Cover open")
                7 -> PrinterStatus(isOnline = true, hasError = true, errorMessage = "Paper cutter abnormal")
                8 -> PrinterStatus(isOnline = true, hasError = true, errorMessage = "Paper cutter recovered")
                9 -> PrinterStatus(isOnline = false, hasError = true, errorMessage = "No black mark detected")
                505 -> PrinterStatus(isOnline = false, hasError = true, errorMessage = "No printer found")
                else -> PrinterStatus(isOnline = true)
            }
        } catch (e: Exception) {
            Timber.w(e, "$TAG: Failed to get status")
            return@withContext PrinterStatus(isOnline = true)
        }
    }

    // ==================== SUNMI SPECIFIC METHODS ====================

    /**
     * In text với style
     */
    suspend fun printText(text: String): PrinterResult = withContext(Dispatchers.IO) {
        if (!isConnected()) return@withContext PrinterResult.Error("Not connected")

        try {
            val method = printerService?.javaClass?.getMethod("printText", String::class.java, Any::class.java)
            method?.invoke(printerService, text, null)
            return@withContext PrinterResult.Success
        } catch (e: Exception) {
            return@withContext PrinterResult.Error(e.message ?: "Print failed")
        }
    }

    /**
     * In text với font size và style
     */
    suspend fun printTextWithFont(text: String, typeface: String?, fontSize: Float): PrinterResult = withContext(Dispatchers.IO) {
        if (!isConnected()) return@withContext PrinterResult.Error("Not connected")

        try {
            val method = printerService?.javaClass?.getMethod(
                "printTextWithFont",
                String::class.java,
                String::class.java,
                Float::class.java,
                Any::class.java
            )
            method?.invoke(printerService, text, typeface, fontSize, null)
            return@withContext PrinterResult.Success
        } catch (e: Exception) {
            return@withContext PrinterResult.Error(e.message ?: "Print failed")
        }
    }

    /**
     * In text với căn chỉnh
     */
    suspend fun setAlignment(alignment: Int): PrinterResult = withContext(Dispatchers.IO) {
        if (!isConnected()) return@withContext PrinterResult.Error("Not connected")

        try {
            // 0: left, 1: center, 2: right
            val method = printerService?.javaClass?.getMethod("setAlignment", Int::class.java, Any::class.java)
            method?.invoke(printerService, alignment, null)
            return@withContext PrinterResult.Success
        } catch (e: Exception) {
            return@withContext PrinterResult.Error(e.message ?: "Set alignment failed")
        }
    }

    /**
     * In hình ảnh
     */
    suspend fun printBitmap(bitmap: Bitmap): PrinterResult = withContext(Dispatchers.IO) {
        if (!isConnected()) return@withContext PrinterResult.Error("Not connected")

        try {
            val method = printerService?.javaClass?.getMethod("printBitmap", Bitmap::class.java, Any::class.java)
            method?.invoke(printerService, bitmap, null)
            return@withContext PrinterResult.Success
        } catch (e: Exception) {
            return@withContext PrinterResult.Error(e.message ?: "Print bitmap failed")
        }
    }

    /**
     * In barcode
     */
    suspend fun printBarcode(data: String, symbology: Int, height: Int, width: Int, textPosition: Int): PrinterResult = withContext(Dispatchers.IO) {
        if (!isConnected()) return@withContext PrinterResult.Error("Not connected")

        try {
            val method = printerService?.javaClass?.getMethod(
                "printBarCode",
                String::class.java,
                Int::class.java,
                Int::class.java,
                Int::class.java,
                Int::class.java,
                Any::class.java
            )
            method?.invoke(printerService, data, symbology, height, width, textPosition, null)
            return@withContext PrinterResult.Success
        } catch (e: Exception) {
            return@withContext PrinterResult.Error(e.message ?: "Print barcode failed")
        }
    }

    /**
     * In QR Code
     */
    suspend fun printQRCode(data: String, size: Int = 4, errorLevel: Int = 3): PrinterResult = withContext(Dispatchers.IO) {
        if (!isConnected()) return@withContext PrinterResult.Error("Not connected")

        try {
            val method = printerService?.javaClass?.getMethod(
                "printQRCode",
                String::class.java,
                Int::class.java,
                Int::class.java,
                Any::class.java
            )
            method?.invoke(printerService, data, size, errorLevel, null)
            return@withContext PrinterResult.Success
        } catch (e: Exception) {
            return@withContext PrinterResult.Error(e.message ?: "Print QR code failed")
        }
    }

    /**
     * Feed paper
     */
    suspend fun feedPaper(lines: Int = 3): PrinterResult = withContext(Dispatchers.IO) {
        if (!isConnected()) return@withContext PrinterResult.Error("Not connected")

        try {
            val service = printerService ?: return@withContext PrinterResult.Error("Service not available")
            val methods = service.javaClass.methods

            // Tìm method lineWrap
            val lineWrapMethod = methods.find { it.name == "lineWrap" && it.parameterTypes.isNotEmpty() }
            if (lineWrapMethod != null) {
                when (lineWrapMethod.parameterTypes.size) {
                    1 -> lineWrapMethod.invoke(service, lines)
                    2 -> lineWrapMethod.invoke(service, lines, null)
                    else -> lineWrapMethod.invoke(service, lines, null)
                }
                return@withContext PrinterResult.Success
            }

            // Fallback: gửi multiple line feeds
            val lfCommand = ByteArray(lines) { 0x0A } // LF characters
            return@withContext write(lfCommand)
        } catch (e: Exception) {
            return@withContext PrinterResult.Error(e.message ?: "Feed paper failed")
        }
    }

    /**
     * Cắt giấy
     */
    suspend fun cutPaper(): PrinterResult = withContext(Dispatchers.IO) {
        if (!isConnected()) return@withContext PrinterResult.Error("Not connected")

        try {
            val service = printerService ?: return@withContext PrinterResult.Error("Service not available")
            val methods = service.javaClass.methods

            // Tìm method cutPaper với callback
            val cutMethod = methods.find { it.name == "cutPaper" }
            if (cutMethod != null) {
                when (cutMethod.parameterTypes.size) {
                    0 -> cutMethod.invoke(service)
                    1 -> cutMethod.invoke(service, null)
                    else -> cutMethod.invoke(service, null)
                }
                return@withContext PrinterResult.Success
            }

            // Fallback: gửi ESC/POS cut command
            val cutCommand = byteArrayOf(0x1D, 0x56, 0x00) // GS V 0 - Full cut
            return@withContext write(cutCommand)
        } catch (e: Exception) {
            return@withContext PrinterResult.Error(e.message ?: "Cut paper failed")
        }
    }

    /**
     * Mở ngăn kéo tiền
     */
    suspend fun openCashDrawer(): PrinterResult = withContext(Dispatchers.IO) {
        if (!isConnected()) return@withContext PrinterResult.Error("Not connected")

        try {
            val service = printerService ?: return@withContext PrinterResult.Error("Service not available")
            val methods = service.javaClass.methods

            // Tìm method openDrawer
            val drawerMethod = methods.find { it.name == "openDrawer" }
            if (drawerMethod != null) {
                when (drawerMethod.parameterTypes.size) {
                    0 -> drawerMethod.invoke(service)
                    1 -> drawerMethod.invoke(service, null)
                    else -> drawerMethod.invoke(service, null)
                }
                return@withContext PrinterResult.Success
            }

            // Fallback: gửi ESC/POS cash drawer command
            val drawerCommand = byteArrayOf(0x1B, 0x70, 0x00, 0x19, 0xFA.toByte()) // ESC p 0 25 250
            return@withContext write(drawerCommand)
        } catch (e: Exception) {
            return@withContext PrinterResult.Error(e.message ?: "Open cash drawer failed")
        }
    }

    /**
     * Set bold
     */
    suspend fun setBold(bold: Boolean): PrinterResult = withContext(Dispatchers.IO) {
        if (!isConnected()) return@withContext PrinterResult.Error("Not connected")

        try {
            val boldBytes = if (bold) byteArrayOf(0x1B, 0x45, 0x01) else byteArrayOf(0x1B, 0x45, 0x00)
            return@withContext write(boldBytes)
        } catch (e: Exception) {
            return@withContext PrinterResult.Error(e.message ?: "Set bold failed")
        }
    }

    /**
     * Set font size
     */
    suspend fun setFontSize(size: Int): PrinterResult = withContext(Dispatchers.IO) {
        if (!isConnected()) return@withContext PrinterResult.Error("Not connected")

        try {
            val method = printerService?.javaClass?.getMethod("setFontSize", Float::class.java, Any::class.java)
            method?.invoke(printerService, size.toFloat(), null)
            return@withContext PrinterResult.Success
        } catch (e: Exception) {
            return@withContext PrinterResult.Error(e.message ?: "Set font size failed")
        }
    }

    /**
     * Lấy số serial của máy
     */
    suspend fun getSerialNumber(): String? = withContext(Dispatchers.IO) {
        if (!isConnected()) return@withContext null

        try {
            val method = printerService?.javaClass?.getMethod("getPrinterSerialNo")
            return@withContext method?.invoke(printerService) as? String
        } catch (e: Exception) {
            return@withContext null
        }
    }

    /**
     * Lấy model máy in
     */
    suspend fun getPrinterModel(): String? = withContext(Dispatchers.IO) {
        if (!isConnected()) return@withContext null

        try {
            val method = printerService?.javaClass?.getMethod("getPrinterModal")
            return@withContext method?.invoke(printerService) as? String
        } catch (e: Exception) {
            return@withContext null
        }
    }

    /**
     * Lấy phiên bản firmware
     */
    suspend fun getFirmwareVersion(): String? = withContext(Dispatchers.IO) {
        if (!isConnected()) return@withContext null

        try {
            val method = printerService?.javaClass?.getMethod("getPrinterVersion")
            return@withContext method?.invoke(printerService) as? String
        } catch (e: Exception) {
            return@withContext null
        }
    }

    /**
     * Lấy độ rộng giấy (mm)
     */
    suspend fun getPaperWidth(): Int = withContext(Dispatchers.IO) {
        if (!isConnected()) return@withContext 58

        try {
            val method = printerService?.javaClass?.getMethod("getPrinterPaper")
            val paper = method?.invoke(printerService) as? Int ?: 1
            return@withContext when (paper) {
                1 -> 58
                2 -> 80
                else -> 58
            }
        } catch (e: Exception) {
            return@withContext 58
        }
    }

    /**
     * In bảng (table)
     */
    suspend fun printTable(
        columns: Array<String>,
        weights: IntArray,
        aligns: IntArray
    ): PrinterResult = withContext(Dispatchers.IO) {
        if (!isConnected()) return@withContext PrinterResult.Error("Not connected")

        try {
            val method = printerService?.javaClass?.getMethod(
                "printColumnsString",
                Array<String>::class.java,
                IntArray::class.java,
                IntArray::class.java,
                Any::class.java
            )
            method?.invoke(printerService, columns, weights, aligns, null)
            return@withContext PrinterResult.Success
        } catch (e: Exception) {
            return@withContext PrinterResult.Error(e.message ?: "Print table failed")
        }
    }

    fun cleanup() {
        try {
            serviceConnection?.let { context.unbindService(it) }
        } catch (e: Exception) {
            Timber.w(e, "$TAG: Error cleanup")
        }
        printerService = null
        serviceConnection = null
        isBound = false
        _connectedDevice = null
        _connectionState.value = ConnectionState.Disconnected
    }

    // Sunmi barcode types
    object BarcodeType {
        const val UPC_A = 0
        const val UPC_E = 1
        const val EAN13 = 2
        const val EAN8 = 3
        const val CODE39 = 4
        const val ITF = 5
        const val CODABAR = 6
        const val CODE93 = 7
        const val CODE128 = 8
    }

    // Text positions for barcode
    object TextPosition {
        const val NO_PRINT = 0
        const val ABOVE = 1
        const val BELOW = 2
        const val ABOVE_AND_BELOW = 3
    }

    // Alignment
    object Alignment {
        const val LEFT = 0
        const val CENTER = 1
        const val RIGHT = 2
    }
}
