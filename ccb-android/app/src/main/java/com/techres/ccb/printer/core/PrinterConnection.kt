package com.techres.ccb.printer.core

import kotlinx.coroutines.flow.StateFlow

/**
 * Định nghĩa các loại kết nối máy in
 */
enum class ConnectionType {
    BLUETOOTH,      // Bluetooth Classic (SPP)
    WIFI,           // WiFi Direct / TCP IP qua WiFi
    LAN,            // Ethernet / LAN (TCP IP)
    USB,            // USB Host
    SUNMI_INNER,    // Máy in tích hợp Sunmi
    SERIAL,         // Serial RS232 / RS485
    UNKNOWN
}

/**
 * Trạng thái kết nối máy in
 */
sealed class ConnectionState {
    object Disconnected : ConnectionState()
    object Connecting : ConnectionState()
    object Connected : ConnectionState()
    data class Error(val message: String) : ConnectionState()
}

/**
 * Kết quả thao tác với máy in
 */
sealed class PrinterResult {
    object Success : PrinterResult()
    data class Error(val message: String, val code: Int = -1) : PrinterResult()
    data class PartialSuccess(val successCount: Int, val failCount: Int) : PrinterResult()
}

/**
 * Thông tin thiết bị máy in
 */
data class PrinterDevice(
    val id: String,                    // ID duy nhất (MAC address, IP, device path...)
    val name: String,                  // Tên hiển thị
    val connectionType: ConnectionType,
    val address: String,               // Địa chỉ kết nối (MAC, IP:port, USB path...)
    val isConnected: Boolean = false,
    val manufacturer: String? = null,  // Hãng sản xuất
    val model: String? = null,         // Model máy in
    val paperWidth: Int = 58,          // Độ rộng giấy (mm): 58, 80, 110
    val supportsCutter: Boolean = true,
    val supportsCashDrawer: Boolean = false,
    val supportsBarcode: Boolean = true,
    val supportsQRCode: Boolean = true,
    val supportsImage: Boolean = true,
    val maxCharsPerLine: Int = 32,     // Số ký tự tối đa 1 dòng (58mm=32, 80mm=48)
    val signalStrength: Int? = null,   // Độ mạnh tín hiệu (Bluetooth/WiFi)
    val extra: Map<String, String> = emptyMap() // Thông tin bổ sung
) {
    companion object {
        fun fromBluetoothAddress(address: String, name: String): PrinterDevice {
            return PrinterDevice(
                id = address.replace(":", ""),
                name = name,
                connectionType = ConnectionType.BLUETOOTH,
                address = address
            )
        }

        fun fromNetworkAddress(ip: String, port: Int, name: String? = null): PrinterDevice {
            return PrinterDevice(
                id = "${ip}_$port",
                name = name ?: "Network Printer ($ip)",
                connectionType = ConnectionType.LAN,
                address = "$ip:$port"
            )
        }

        fun fromUsbDevice(devicePath: String, name: String): PrinterDevice {
            return PrinterDevice(
                id = devicePath.hashCode().toString(),
                name = name,
                connectionType = ConnectionType.USB,
                address = devicePath
            )
        }

        fun sunmiInner(): PrinterDevice {
            return PrinterDevice(
                id = "sunmi_inner",
                name = "Sunmi Built-in Printer",
                connectionType = ConnectionType.SUNMI_INNER,
                address = "inner",
                manufacturer = "Sunmi"
            )
        }
    }
}

/**
 * Interface cơ bản cho tất cả các loại kết nối máy in
 */
interface PrinterConnection {

    /**
     * Loại kết nối
     */
    val connectionType: ConnectionType

    /**
     * Trạng thái kết nối hiện tại
     */
    val connectionState: StateFlow<ConnectionState>

    /**
     * Thiết bị đang kết nối
     */
    val connectedDevice: PrinterDevice?

    /**
     * Kiểm tra kết nối có sẵn sàng không
     */
    fun isConnected(): Boolean

    /**
     * Kết nối đến máy in
     */
    suspend fun connect(device: PrinterDevice): PrinterResult

    /**
     * Ngắt kết nối
     */
    suspend fun disconnect(): PrinterResult

    /**
     * Gửi dữ liệu raw đến máy in
     */
    suspend fun write(data: ByteArray): PrinterResult

    /**
     * Đọc phản hồi từ máy in (nếu hỗ trợ)
     */
    suspend fun read(timeout: Long = 3000): ByteArray?

    /**
     * Lấy trạng thái máy in (giấy, lỗi, ...)
     */
    suspend fun getStatus(): PrinterStatus
}

/**
 * Trạng thái máy in
 */
data class PrinterStatus(
    val isOnline: Boolean = true,
    val hasPaper: Boolean = true,
    val coverOpen: Boolean = false,
    val hasError: Boolean = false,
    val errorMessage: String? = null,
    val temperature: Int? = null,     // Nhiệt độ đầu in (một số máy hỗ trợ)
    val paperLevel: Int? = null       // Mức giấy còn lại (0-100)
)
