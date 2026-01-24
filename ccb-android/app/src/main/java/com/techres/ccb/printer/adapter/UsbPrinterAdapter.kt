package com.techres.ccb.printer.adapter

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.*
import android.os.Build
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

/**
 * USB Printer Adapter
 *
 * Hỗ trợ kết nối với máy in qua USB Host Mode
 * Tương thích Android 6+ (API 23+)
 *
 * USB Class:
 * - Printer Class (0x07) - Standard USB Printer
 * - Vendor Specific - Một số máy in POS
 *
 * Các hãng máy in hỗ trợ:
 * - Epson TM-T88VI, TM-T82III
 * - Star TSP143, TSP654
 * - Bixolon SRP-350, SRP-380
 * - Citizen CT-S310II
 * - Xprinter XP-N160II
 * - Tất cả máy in USB hỗ trợ ESC/POS
 */
@Singleton
class UsbPrinterAdapter @Inject constructor(
    @ApplicationContext private val context: Context
) : PrinterConnection {

    companion object {
        private const val TAG = "UsbPrinter"
        private const val ACTION_USB_PERMISSION = "com.techres.ccb.USB_PERMISSION"

        // USB Printer Class
        private const val USB_CLASS_PRINTER = 7

        // USB Subclass/Protocol for printers
        private const val USB_SUBCLASS_PRINTER = 1
        private const val USB_PROTOCOL_UNIDIRECTIONAL = 1
        private const val USB_PROTOCOL_BIDIRECTIONAL = 2

        // Timeout
        private const val USB_TIMEOUT_MS = 5000

        // Vendor IDs phổ biến cho máy in POS
        private val KNOWN_PRINTER_VENDORS = mapOf(
            0x04B8 to "Epson",
            0x0519 to "Star Micronics",
            0x1504 to "Bixolon",
            0x2730 to "Citizen",
            0x0483 to "STMicroelectronics", // Nhiều máy in Trung Quốc dùng chip này
            0x0416 to "Winbond", // XPrinter, Rongta
            0x6868 to "ZJ/Zjiang",
            0x0456 to "HPRT",
            0x0DD4 to "Custom",
            0x154F to "Seiko",
            0x0B00 to "Goojprt",
            // Thêm vendor IDs cho máy in Trung Quốc phổ biến
            0x1FC9 to "NXP", // Nhiều máy in dùng chip NXP
            0x0525 to "PLX/Netchip", // USB-Serial bridges
            0x067B to "Prolific", // PL2303 USB-Serial
            0x10C4 to "Silicon Labs", // CP210x
            0x1A86 to "QinHeng", // CH340/CH341
            0x2341 to "Arduino",
            0x1D50 to "OpenMoko",
            0x28E9 to "GD32", // GigaDevice
            0x0FE6 to "ICS", // Kontron
            0x20D1 to "Simcom",
            0x4348 to "WCH", // CH9326
            0x1234 to "Generic Printer",
            0x0FFF to "Generic"
        )
    }

    override val connectionType = ConnectionType.USB

    private val _connectionState = MutableStateFlow<ConnectionState>(ConnectionState.Disconnected)
    override val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private var _connectedDevice: PrinterDevice? = null
    override val connectedDevice: PrinterDevice? get() = _connectedDevice

    private val usbManager: UsbManager by lazy {
        context.getSystemService(Context.USB_SERVICE) as UsbManager
    }

    private var usbDevice: UsbDevice? = null
    private var usbConnection: UsbDeviceConnection? = null
    private var usbInterface: UsbInterface? = null
    private var endpointIn: UsbEndpoint? = null
    private var endpointOut: UsbEndpoint? = null

    // Permission callback
    private var permissionCallback: ((Boolean) -> Unit)? = null

    private val usbReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                ACTION_USB_PERMISSION -> {
                    synchronized(this) {
                        val device: UsbDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                        } else {
                            @Suppress("DEPRECATION")
                            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                        }

                        val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
                        Timber.d("$TAG: USB Permission ${if (granted) "granted" else "denied"} for ${device?.deviceName}")
                        permissionCallback?.invoke(granted)
                        permissionCallback = null
                    }
                }

                UsbManager.ACTION_USB_DEVICE_ATTACHED -> {
                    Timber.d("$TAG: USB device attached")
                }

                UsbManager.ACTION_USB_DEVICE_DETACHED -> {
                    val device: UsbDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                    }

                    if (device?.deviceId == usbDevice?.deviceId) {
                        Timber.d("$TAG: Connected device detached")
                        closeConnection()
                        _connectionState.value = ConnectionState.Disconnected
                        _connectedDevice = null
                    }
                }
            }
        }
    }

    private var isReceiverRegistered = false

    override fun isConnected(): Boolean = usbConnection != null && _connectionState.value == ConnectionState.Connected

    /**
     * Đăng ký receiver để nhận sự kiện USB
     */
    fun registerReceiver() {
        if (!isReceiverRegistered) {
            val filter = IntentFilter().apply {
                addAction(ACTION_USB_PERMISSION)
                addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
                addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(usbReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                context.registerReceiver(usbReceiver, filter)
            }
            isReceiverRegistered = true
        }
    }

    /**
     * Hủy đăng ký receiver
     */
    fun unregisterReceiver() {
        if (isReceiverRegistered) {
            try {
                context.unregisterReceiver(usbReceiver)
            } catch (e: Exception) {
                Timber.w(e, "$TAG: Error unregistering receiver")
            }
            isReceiverRegistered = false
        }
    }

    /**
     * Lấy danh sách máy in USB đang kết nối
     * Nếu không tìm thấy máy in theo tiêu chí chuẩn, sẽ fallback lấy tất cả USB devices có bulk endpoint
     */
    fun getConnectedPrinters(): List<PrinterDevice> {
        // Log tất cả USB devices để debug
        logAllUsbDevices()

        val printers = usbManager.deviceList.values
            .filter { isPrinter(it) }
            .map { device ->
                PrinterDevice(
                    id = device.deviceId.toString(),
                    name = getDeviceName(device),
                    connectionType = ConnectionType.USB,
                    address = device.deviceName,
                    manufacturer = KNOWN_PRINTER_VENDORS[device.vendorId],
                    model = device.productName,
                    extra = mapOf(
                        "vendorId" to device.vendorId.toString(),
                        "productId" to device.productId.toString()
                    )
                )
            }

        // Nếu không tìm thấy máy in, thử lấy tất cả USB devices có bulk OUT endpoint
        if (printers.isEmpty()) {
            Timber.d("$TAG: No printers found by standard detection, trying fallback...")
            return getAllPrintableDevices()
        }

        return printers
    }

    /**
     * Fallback: Lấy tất cả USB devices có bulk OUT endpoint (có thể in được)
     */
    private fun getAllPrintableDevices(): List<PrinterDevice> {
        return usbManager.deviceList.values
            .filter { hasBulkOutEndpoint(it) }
            .map { device ->
                PrinterDevice(
                    id = device.deviceId.toString(),
                    name = getDeviceName(device),
                    connectionType = ConnectionType.USB,
                    address = device.deviceName,
                    manufacturer = KNOWN_PRINTER_VENDORS[device.vendorId],
                    model = device.productName,
                    extra = mapOf(
                        "vendorId" to device.vendorId.toString(),
                        "productId" to device.productId.toString()
                    )
                )
            }
    }

    /**
     * Log tất cả USB devices để debug
     */
    private fun logAllUsbDevices() {
        val devices = usbManager.deviceList
        Timber.d("$TAG: ===== ALL USB DEVICES =====")
        Timber.d("$TAG: Total devices: ${devices.size}")

        if (devices.isEmpty()) {
            Timber.d("$TAG: No USB devices connected!")
            Timber.d("$TAG: Please check:")
            Timber.d("$TAG:   1. USB cable is properly connected")
            Timber.d("$TAG:   2. Device supports USB Host Mode (OTG)")
            Timber.d("$TAG:   3. Printer is powered on")
        }

        devices.values.forEachIndexed { index, device ->
            Timber.d("$TAG: --- Device $index ---")
            Timber.d("$TAG:   Name: ${device.deviceName}")
            Timber.d("$TAG:   Product: ${device.productName}")
            Timber.d("$TAG:   Manufacturer: ${device.manufacturerName}")
            Timber.d("$TAG:   Vendor ID: ${String.format("0x%04X", device.vendorId)}")
            Timber.d("$TAG:   Product ID: ${String.format("0x%04X", device.productId)}")
            Timber.d("$TAG:   Device Class: ${device.deviceClass}")
            Timber.d("$TAG:   Interface Count: ${device.interfaceCount}")

            for (i in 0 until device.interfaceCount) {
                val intf = device.getInterface(i)
                Timber.d("$TAG:     Interface $i: class=${intf.interfaceClass}, subclass=${intf.interfaceSubclass}")
                for (j in 0 until intf.endpointCount) {
                    val ep = intf.getEndpoint(j)
                    val direction = if (ep.direction == UsbConstants.USB_DIR_OUT) "OUT" else "IN"
                    val type = when (ep.type) {
                        UsbConstants.USB_ENDPOINT_XFER_BULK -> "BULK"
                        UsbConstants.USB_ENDPOINT_XFER_INT -> "INT"
                        UsbConstants.USB_ENDPOINT_XFER_ISOC -> "ISOC"
                        else -> "CTRL"
                    }
                    Timber.d("$TAG:       Endpoint $j: $direction $type")
                }
            }

            val isPrinterDevice = isPrinter(device)
            Timber.d("$TAG:   Is Printer: $isPrinterDevice")
        }
        Timber.d("$TAG: ===========================")
    }

    /**
     * Kiểm tra device có bulk OUT endpoint không
     */
    private fun hasBulkOutEndpoint(device: UsbDevice): Boolean {
        for (i in 0 until device.interfaceCount) {
            val intf = device.getInterface(i)
            for (j in 0 until intf.endpointCount) {
                val ep = intf.getEndpoint(j)
                if (ep.direction == UsbConstants.USB_DIR_OUT &&
                    ep.type == UsbConstants.USB_ENDPOINT_XFER_BULK) {
                    return true
                }
            }
        }
        return false
    }

    override suspend fun connect(device: PrinterDevice): PrinterResult = withContext(Dispatchers.IO) {
        if (device.connectionType != ConnectionType.USB) {
            return@withContext PrinterResult.Error("Invalid connection type for USB adapter")
        }

        _connectionState.value = ConnectionState.Connecting

        // Tìm USB device
        val usbDev = usbManager.deviceList.values.find {
            it.deviceName == device.address || it.deviceId.toString() == device.id
        }

        if (usbDev == null) {
            _connectionState.value = ConnectionState.Error("USB device not found")
            return@withContext PrinterResult.Error("USB device not found. Make sure the printer is connected.")
        }

        // Kiểm tra và yêu cầu permission
        if (!usbManager.hasPermission(usbDev)) {
            val granted = requestPermission(usbDev)
            if (!granted) {
                _connectionState.value = ConnectionState.Error("USB permission denied")
                return@withContext PrinterResult.Error("USB permission denied")
            }
        }

        try {
            // Đóng kết nối cũ
            closeConnection()

            // Tìm printer interface
            val printerInterface = findPrinterInterface(usbDev)
                ?: return@withContext PrinterResult.Error("Printer interface not found").also {
                    _connectionState.value = ConnectionState.Error("Printer interface not found")
                }

            // Mở connection
            val connection = usbManager.openDevice(usbDev)
                ?: return@withContext PrinterResult.Error("Cannot open USB device").also {
                    _connectionState.value = ConnectionState.Error("Cannot open USB device")
                }

            // Claim interface
            if (!connection.claimInterface(printerInterface, true)) {
                connection.close()
                _connectionState.value = ConnectionState.Error("Cannot claim USB interface")
                return@withContext PrinterResult.Error("Cannot claim USB interface")
            }

            // Tìm endpoints
            for (i in 0 until printerInterface.endpointCount) {
                val endpoint = printerInterface.getEndpoint(i)
                when (endpoint.direction) {
                    UsbConstants.USB_DIR_OUT -> endpointOut = endpoint
                    UsbConstants.USB_DIR_IN -> endpointIn = endpoint
                }
            }

            if (endpointOut == null) {
                connection.releaseInterface(printerInterface)
                connection.close()
                _connectionState.value = ConnectionState.Error("Output endpoint not found")
                return@withContext PrinterResult.Error("Output endpoint not found")
            }

            // Lưu trạng thái
            usbDevice = usbDev
            usbConnection = connection
            usbInterface = printerInterface

            // Initialize printer
            write(EscPosCommands.INIT)

            _connectedDevice = device.copy(isConnected = true)
            _connectionState.value = ConnectionState.Connected

            Timber.d("$TAG: Connected to ${device.name}")
            return@withContext PrinterResult.Success

        } catch (e: Exception) {
            Timber.e(e, "$TAG: Connection failed")
            closeConnection()
            _connectionState.value = ConnectionState.Error(e.message ?: "Connection failed")
            return@withContext PrinterResult.Error(e.message ?: "Connection failed")
        }
    }

    private suspend fun requestPermission(device: UsbDevice): Boolean = suspendCancellableCoroutine { cont ->
        registerReceiver()

        permissionCallback = { granted ->
            cont.resume(granted)
        }

        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_MUTABLE
        } else {
            0
        }

        val permissionIntent = PendingIntent.getBroadcast(
            context,
            0,
            Intent(ACTION_USB_PERMISSION),
            flags
        )

        usbManager.requestPermission(device, permissionIntent)
    }

    override suspend fun disconnect(): PrinterResult = withContext(Dispatchers.IO) {
        closeConnection()
        _connectedDevice = null
        _connectionState.value = ConnectionState.Disconnected
        Timber.d("$TAG: Disconnected")
        return@withContext PrinterResult.Success
    }

    private fun closeConnection() {
        try {
            usbInterface?.let { usbConnection?.releaseInterface(it) }
            usbConnection?.close()
        } catch (e: Exception) {
            Timber.w(e, "$TAG: Error closing connection")
        }
        usbDevice = null
        usbConnection = null
        usbInterface = null
        endpointIn = null
        endpointOut = null
    }

    override suspend fun write(data: ByteArray): PrinterResult = withContext(Dispatchers.IO) {
        val connection = usbConnection ?: return@withContext PrinterResult.Error("Not connected")
        val endpoint = endpointOut ?: return@withContext PrinterResult.Error("No output endpoint")

        try {
            // Chia nhỏ dữ liệu nếu quá lớn
            val maxPacketSize = endpoint.maxPacketSize
            var offset = 0

            while (offset < data.size) {
                val length = minOf(maxPacketSize, data.size - offset)
                val chunk = data.copyOfRange(offset, offset + length)

                val result = connection.bulkTransfer(endpoint, chunk, length, USB_TIMEOUT_MS)

                if (result < 0) {
                    Timber.e("$TAG: Bulk transfer failed: $result")
                    return@withContext PrinterResult.Error("USB write failed: $result")
                }

                offset += length
            }

            return@withContext PrinterResult.Success

        } catch (e: Exception) {
            Timber.e(e, "$TAG: Write failed")
            return@withContext PrinterResult.Error(e.message ?: "Write failed")
        }
    }

    override suspend fun read(timeout: Long): ByteArray? = withContext(Dispatchers.IO) {
        val connection = usbConnection ?: return@withContext null
        val endpoint = endpointIn ?: return@withContext null

        try {
            val buffer = ByteArray(endpoint.maxPacketSize)
            val result = connection.bulkTransfer(endpoint, buffer, buffer.size, timeout.toInt())

            if (result > 0) {
                return@withContext buffer.copyOf(result)
            }
            return@withContext null

        } catch (e: Exception) {
            Timber.w(e, "$TAG: Read error")
            return@withContext null
        }
    }

    override suspend fun getStatus(): PrinterStatus = withContext(Dispatchers.IO) {
        if (!isConnected()) {
            return@withContext PrinterStatus(isOnline = false)
        }

        // Một số máy in USB hỗ trợ lấy status qua Control Transfer
        try {
            val connection = usbConnection ?: return@withContext PrinterStatus(isOnline = false)

            // USB Printer Class specific request: GET_PORT_STATUS
            val status = ByteArray(1)
            val result = connection.controlTransfer(
                UsbConstants.USB_TYPE_CLASS or UsbConstants.USB_DIR_IN or 0x01, // bmRequestType
                0x01, // GET_PORT_STATUS
                0,
                0,
                status,
                1,
                USB_TIMEOUT_MS
            )

            if (result > 0) {
                val s = status[0].toInt()
                return@withContext PrinterStatus(
                    isOnline = (s and 0x10) == 0,  // Not offline
                    hasPaper = (s and 0x20) == 0,  // Paper not empty
                    hasError = (s and 0x08) != 0   // Error
                )
            }

        } catch (e: Exception) {
            Timber.w(e, "$TAG: Failed to get status")
        }

        return@withContext PrinterStatus(isOnline = true)
    }

    private fun isPrinter(device: UsbDevice): Boolean {
        // Kiểm tra USB Printer Class
        if (device.deviceClass == USB_CLASS_PRINTER) return true

        // Kiểm tra từng interface
        for (i in 0 until device.interfaceCount) {
            val intf = device.getInterface(i)
            if (intf.interfaceClass == USB_CLASS_PRINTER) return true
        }

        // Kiểm tra vendor ID đã biết
        if (KNOWN_PRINTER_VENDORS.containsKey(device.vendorId)) return true

        return false
    }

    private fun findPrinterInterface(device: UsbDevice): UsbInterface? {
        // Ưu tiên tìm printer class interface
        for (i in 0 until device.interfaceCount) {
            val intf = device.getInterface(i)
            if (intf.interfaceClass == USB_CLASS_PRINTER) {
                return intf
            }
        }

        // Fallback: tìm interface có bulk endpoints
        for (i in 0 until device.interfaceCount) {
            val intf = device.getInterface(i)
            var hasOut = false
            for (j in 0 until intf.endpointCount) {
                if (intf.getEndpoint(j).direction == UsbConstants.USB_DIR_OUT &&
                    intf.getEndpoint(j).type == UsbConstants.USB_ENDPOINT_XFER_BULK) {
                    hasOut = true
                    break
                }
            }
            if (hasOut) return intf
        }

        return null
    }

    private fun getDeviceName(device: UsbDevice): String {
        val productName = device.productName
        if (!productName.isNullOrBlank()) return productName

        val manufacturer = KNOWN_PRINTER_VENDORS[device.vendorId]
        if (manufacturer != null) return "$manufacturer Printer"

        return "USB Printer (${String.format("%04X", device.vendorId)}:${String.format("%04X", device.productId)})"
    }

    fun cleanup() {
        unregisterReceiver()
        closeConnection()
        _connectedDevice = null
        _connectionState.value = ConnectionState.Disconnected
    }
}
