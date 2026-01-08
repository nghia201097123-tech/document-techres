package com.techres.ccb.printer

import android.content.Context
import android.content.SharedPreferences
import android.graphics.Bitmap
import com.techres.ccb.printer.adapter.*
import com.techres.ccb.printer.core.*
import com.techres.ccb.printer.discovery.PrinterDiscoveryService
import com.techres.ccb.printer.template.Receipt
import com.techres.ccb.printer.template.ReceiptTemplate
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.withContext
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Printer Manager - Quản lý tất cả các loại máy in
 *
 * Đây là entry point chính để sử dụng chức năng in trong ứng dụng.
 * Hỗ trợ:
 * - Bluetooth printer
 * - WiFi/LAN printer
 * - USB printer
 * - Sunmi built-in printer
 * - Serial printer (RS232)
 *
 * Features:
 * - Auto-discovery tất cả các loại máy in
 * - Lưu cấu hình máy in mặc định
 * - Print queue với retry
 * - Hỗ trợ nhiều máy in cùng lúc
 * - ESC/POS commands
 * - Receipt templates
 */
@Singleton
class PrinterManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val bluetoothAdapter: BluetoothPrinterAdapter,
    private val networkAdapter: NetworkPrinterAdapter,
    private val usbAdapter: UsbPrinterAdapter,
    private val sunmiAdapter: SunmiPrinterAdapter,
    private val serialAdapter: SerialPrinterAdapter,
    private val discoveryService: PrinterDiscoveryService
) {
    companion object {
        private const val TAG = "PrinterManager"
        private const val PREFS_NAME = "printer_prefs"
        private const val KEY_DEFAULT_PRINTER = "default_printer"
        private const val KEY_DEFAULT_TYPE = "default_type"
        private const val KEY_PAPER_WIDTH = "paper_width"
    }

    private val prefs: SharedPreferences by lazy {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    // Current connection state
    private val _connectionState = MutableStateFlow<ConnectionState>(ConnectionState.Disconnected)
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    // Current connected device
    private val _connectedDevice = MutableStateFlow<PrinterDevice?>(null)
    val connectedDevice: StateFlow<PrinterDevice?> = _connectedDevice.asStateFlow()

    // Active adapter
    private var activeConnection: PrinterConnection? = null

    // Paper width setting
    private val _paperWidth = MutableStateFlow(loadPaperWidth())
    val paperWidth: StateFlow<Int> = _paperWidth.asStateFlow()

    // Print queue
    private val printQueue = mutableListOf<PrintJob>()
    private var isPrinting = false

    init {
        // Observe connection states từ các adapter
        observeAdapterStates()
    }

    private fun observeAdapterStates() {
        // Mỗi adapter có connectionState riêng
        // Khi một adapter thay đổi trạng thái, cập nhật trạng thái chung
    }

    // ==================== DISCOVERY ====================

    /**
     * Discovered devices from all adapters
     */
    val discoveredDevices: StateFlow<List<PrinterDevice>> = discoveryService.discoveredDevices

    /**
     * Is currently scanning
     */
    val isScanning: StateFlow<Boolean> = discoveryService.isScanning

    /**
     * Scan progress (0.0 - 1.0)
     */
    val scanProgress: StateFlow<Float> = discoveryService.scanProgress

    /**
     * Bắt đầu quét tìm máy in
     */
    suspend fun startDiscovery(
        connectionTypes: Set<ConnectionType> = ConnectionType.values().toSet()
    ) {
        discoveryService.startDiscovery(connectionTypes)
    }

    /**
     * Dừng quét
     */
    fun stopDiscovery() {
        discoveryService.stopDiscovery()
    }

    /**
     * Quét nhanh thiết bị đã biết
     */
    suspend fun quickScan(): List<PrinterDevice> {
        return discoveryService.quickScan()
    }

    // ==================== CONNECTION ====================

    /**
     * Kết nối đến máy in
     */
    suspend fun connect(device: PrinterDevice): PrinterResult = withContext(Dispatchers.IO) {
        Timber.d("$TAG: Connecting to ${device.name} (${device.connectionType})")

        _connectionState.value = ConnectionState.Connecting

        // Ngắt kết nối cũ
        disconnect()

        // Chọn adapter phù hợp
        val adapter = getAdapter(device.connectionType)
        if (adapter == null) {
            _connectionState.value = ConnectionState.Error("Unsupported connection type: ${device.connectionType}")
            return@withContext PrinterResult.Error("Unsupported connection type")
        }

        // Kết nối
        val result = adapter.connect(device)

        when (result) {
            is PrinterResult.Success -> {
                activeConnection = adapter
                _connectedDevice.value = device.copy(isConnected = true)
                _connectionState.value = ConnectionState.Connected

                // Lưu làm máy in mặc định
                saveDefaultPrinter(device)

                Timber.d("$TAG: Connected successfully")
            }
            is PrinterResult.Error -> {
                _connectionState.value = ConnectionState.Error(result.message)
                Timber.e("$TAG: Connection failed: ${result.message}")
            }
            else -> {}
        }

        return@withContext result
    }

    /**
     * Kết nối đến máy in mặc định đã lưu
     */
    suspend fun connectToDefault(): PrinterResult {
        val savedDevice = getDefaultPrinter()
        return if (savedDevice != null) {
            connect(savedDevice)
        } else {
            // Thử kết nối Sunmi nếu có
            if (sunmiAdapter.isSunmiDevice()) {
                connect(PrinterDevice.sunmiInner())
            } else {
                PrinterResult.Error("No default printer configured")
            }
        }
    }

    /**
     * Kết nối nhanh bằng địa chỉ
     */
    suspend fun connectByAddress(
        address: String,
        connectionType: ConnectionType,
        name: String? = null
    ): PrinterResult {
        val device = when (connectionType) {
            ConnectionType.BLUETOOTH -> PrinterDevice.fromBluetoothAddress(address, name ?: "Bluetooth Printer")
            ConnectionType.LAN, ConnectionType.WIFI -> {
                val parts = address.split(":")
                val ip = parts[0]
                val port = parts.getOrNull(1)?.toIntOrNull() ?: 9100
                PrinterDevice.fromNetworkAddress(ip, port, name)
            }
            ConnectionType.USB -> PrinterDevice.fromUsbDevice(address, name ?: "USB Printer")
            ConnectionType.SUNMI_INNER -> PrinterDevice.sunmiInner()
            ConnectionType.SERIAL -> PrinterDevice(
                id = address.hashCode().toString(),
                name = name ?: "Serial Printer",
                connectionType = ConnectionType.SERIAL,
                address = address
            )
            else -> return PrinterResult.Error("Unknown connection type")
        }
        return connect(device)
    }

    /**
     * Ngắt kết nối
     */
    suspend fun disconnect(): PrinterResult {
        activeConnection?.disconnect()
        activeConnection = null
        _connectedDevice.value = null
        _connectionState.value = ConnectionState.Disconnected
        return PrinterResult.Success
    }

    /**
     * Kiểm tra đã kết nối chưa
     */
    fun isConnected(): Boolean = activeConnection?.isConnected() == true

    // ==================== PRINTING ====================

    /**
     * In raw data
     */
    suspend fun printRaw(data: ByteArray): PrinterResult {
        val connection = activeConnection
            ?: return PrinterResult.Error("Not connected to any printer")

        return connection.write(data)
    }

    /**
     * In text
     */
    suspend fun printText(text: String): PrinterResult {
        return printRaw(text.toByteArray(Charsets.UTF_8))
    }

    /**
     * In receipt từ data
     */
    suspend fun printReceipt(receipt: Receipt): PrinterResult {
        val data = receipt.toEscPos(_paperWidth.value)
        return printRaw(data)
    }

    /**
     * In receipt từ template builder
     */
    suspend fun printReceipt(builder: ReceiptTemplate.Builder): PrinterResult {
        return printRaw(builder.build())
    }

    /**
     * In hình ảnh
     */
    suspend fun printImage(bitmap: Bitmap): PrinterResult {
        val data = EscPosBuilder()
            .alignCenter()
            .image(bitmap)
            .newLine(2)
            .build()
        return printRaw(data)
    }

    /**
     * In QR Code
     */
    suspend fun printQRCode(data: String, size: Int = 4): PrinterResult {
        val bytes = EscPosBuilder()
            .alignCenter()
            .qrCode(data, size)
            .newLine(2)
            .build()
        return printRaw(bytes)
    }

    /**
     * In Barcode
     */
    suspend fun printBarcode(data: String, type: Int = EscPosCommands.BarcodeType.CODE128): PrinterResult {
        val bytes = EscPosBuilder()
            .alignCenter()
            .barcode(type, data)
            .newLine(2)
            .build()
        return printRaw(bytes)
    }

    /**
     * Feed giấy
     */
    suspend fun feedPaper(lines: Int = 3): PrinterResult {
        return printRaw(EscPosCommands.feedLines(lines))
    }

    /**
     * Cắt giấy
     */
    suspend fun cutPaper(partial: Boolean = false): PrinterResult {
        return printRaw(if (partial) EscPosCommands.CUT_PARTIAL else EscPosCommands.CUT_FULL)
    }

    /**
     * Mở ngăn kéo tiền
     */
    suspend fun openCashDrawer(pin: Int = 0): PrinterResult {
        // Nếu là Sunmi, dùng API riêng
        if (activeConnection is SunmiPrinterAdapter) {
            return (activeConnection as SunmiPrinterAdapter).openCashDrawer()
        }

        return printRaw(EscPosCommands.openCashDrawer(pin))
    }

    /**
     * Beep
     */
    suspend fun beep(times: Int = 1): PrinterResult {
        return printRaw(EscPosCommands.beep(times, 2))
    }

    /**
     * Test print
     */
    suspend fun testPrint(): PrinterResult {
        val device = _connectedDevice.value ?: return PrinterResult.Error("Not connected")

        val testData = EscPosBuilder()
            .init()
            .alignCenter()
            .doubleSeparator(charsPerLine())
            .line("")
            .doubleSize()
            .bold(true)
            .line("TEST PRINT")
            .normal()
            .bold(false)
            .line("")
            .doubleSeparator(charsPerLine())
            .line("")
            .alignLeft()
            .line("Connection: OK")
            .line("Type: ${device.connectionType}")
            .line("Device: ${device.name}")
            .line("Address: ${device.address}")
            .line("Paper: ${_paperWidth.value}mm")
            .line("")
            .alignCenter()
            .qrCode("https://techres.vn", 4)
            .line("")
            .line("CCB POS System")
            .line("TechRes Vietnam")
            .separator('-', charsPerLine())
            .feed(3)
            .cut()
            .build()

        return printRaw(testData)
    }

    // ==================== STATUS ====================

    /**
     * Lấy trạng thái máy in
     */
    suspend fun getPrinterStatus(): PrinterStatus {
        return activeConnection?.getStatus() ?: PrinterStatus(isOnline = false)
    }

    // ==================== SETTINGS ====================

    /**
     * Set độ rộng giấy
     */
    fun setPaperWidth(width: Int) {
        _paperWidth.value = width
        prefs.edit().putInt(KEY_PAPER_WIDTH, width).apply()
    }

    /**
     * Lấy số ký tự trên một dòng
     */
    fun charsPerLine(): Int = ReceiptTemplate.charsPerLine(_paperWidth.value)

    /**
     * Lấy máy in mặc định đã lưu
     */
    fun getDefaultPrinter(): PrinterDevice? {
        val address = prefs.getString(KEY_DEFAULT_PRINTER, null) ?: return null
        val typeStr = prefs.getString(KEY_DEFAULT_TYPE, null) ?: return null
        val type = try {
            ConnectionType.valueOf(typeStr)
        } catch (e: Exception) {
            return null
        }

        return when (type) {
            ConnectionType.BLUETOOTH -> PrinterDevice.fromBluetoothAddress(address, "Saved Printer")
            ConnectionType.LAN, ConnectionType.WIFI -> {
                val parts = address.split(":")
                PrinterDevice.fromNetworkAddress(parts[0], parts.getOrNull(1)?.toIntOrNull() ?: 9100)
            }
            ConnectionType.USB -> PrinterDevice.fromUsbDevice(address, "Saved Printer")
            ConnectionType.SUNMI_INNER -> PrinterDevice.sunmiInner()
            ConnectionType.SERIAL -> PrinterDevice(
                id = address.hashCode().toString(),
                name = "Saved Printer",
                connectionType = ConnectionType.SERIAL,
                address = address
            )
            else -> null
        }
    }

    /**
     * Lưu máy in mặc định
     */
    fun saveDefaultPrinter(device: PrinterDevice) {
        prefs.edit()
            .putString(KEY_DEFAULT_PRINTER, device.address)
            .putString(KEY_DEFAULT_TYPE, device.connectionType.name)
            .apply()
    }

    /**
     * Xóa máy in mặc định
     */
    fun clearDefaultPrinter() {
        prefs.edit()
            .remove(KEY_DEFAULT_PRINTER)
            .remove(KEY_DEFAULT_TYPE)
            .apply()
    }

    private fun loadPaperWidth(): Int {
        return prefs.getInt(KEY_PAPER_WIDTH, ReceiptTemplate.PAPER_58MM)
    }

    private fun getAdapter(type: ConnectionType): PrinterConnection? {
        return when (type) {
            ConnectionType.BLUETOOTH -> bluetoothAdapter
            ConnectionType.WIFI, ConnectionType.LAN -> networkAdapter
            ConnectionType.USB -> usbAdapter
            ConnectionType.SUNMI_INNER -> sunmiAdapter
            ConnectionType.SERIAL -> serialAdapter
            else -> null
        }
    }

    // ==================== CLEANUP ====================

    /**
     * Cleanup tất cả resources
     */
    fun cleanup() {
        discoveryService.cleanup()
        bluetoothAdapter.cleanup()
        networkAdapter.cleanup()
        usbAdapter.cleanup()
        sunmiAdapter.cleanup()
        serialAdapter.cleanup()
        activeConnection = null
        _connectedDevice.value = null
        _connectionState.value = ConnectionState.Disconnected
    }
}

/**
 * Print Job for queue
 */
data class PrintJob(
    val id: String,
    val data: ByteArray,
    val retryCount: Int = 0,
    val maxRetries: Int = 3,
    val createdAt: Long = System.currentTimeMillis()
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as PrintJob
        if (id != other.id) return false
        return true
    }

    override fun hashCode(): Int = id.hashCode()
}
