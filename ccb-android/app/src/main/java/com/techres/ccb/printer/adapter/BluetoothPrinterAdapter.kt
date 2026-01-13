package com.techres.ccb.printer.adapter

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import com.techres.ccb.printer.core.*
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import timber.log.Timber
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Bluetooth Printer Adapter
 *
 * Hỗ trợ kết nối với máy in qua Bluetooth Classic (SPP Profile)
 * Tương thích Android 6+ (API 23+)
 *
 * Các hãng máy in hỗ trợ:
 * - Epson TM series
 * - Bixolon SPP series
 * - Star Micronics SM series
 * - Citizen CT series
 * - Xprinter XP series
 * - HPRT
 * - Rongta
 * - ZJ/Zjiang
 * - MUNBYN
 * - Goojprt
 */
@Singleton
class BluetoothPrinterAdapter @Inject constructor(
    @ApplicationContext private val context: Context
) : PrinterConnection {

    companion object {
        private const val TAG = "BluetoothPrinter"

        // Serial Port Profile (SPP) UUID - Standard cho máy in Bluetooth
        private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

        // Timeout values
        private const val CONNECT_TIMEOUT_MS = 10000L
        private const val READ_TIMEOUT_MS = 3000L
        private const val WRITE_TIMEOUT_MS = 5000L

        // Retry config
        private const val MAX_CONNECT_RETRIES = 3
        private const val RETRY_DELAY_MS = 500L
    }

    override val connectionType = ConnectionType.BLUETOOTH

    private val _connectionState = MutableStateFlow<ConnectionState>(ConnectionState.Disconnected)
    override val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private var _connectedDevice: PrinterDevice? = null
    override val connectedDevice: PrinterDevice? get() = _connectedDevice

    private val bluetoothAdapter: BluetoothAdapter? by lazy {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            context.getSystemService(BluetoothManager::class.java)?.adapter
        } else {
            @Suppress("DEPRECATION")
            BluetoothAdapter.getDefaultAdapter()
        }
    }

    private var socket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null
    private var inputStream: InputStream? = null

    // Discovery callback
    private var discoveryCallback: ((PrinterDevice) -> Unit)? = null

    // Broadcast receiver cho discovery
    private val discoveryReceiver = object : BroadcastReceiver() {
        @SuppressLint("MissingPermission")
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                BluetoothDevice.ACTION_FOUND -> {
                    val device: BluetoothDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                    }

                    device?.let {
                        // Chỉ báo cáo thiết bị có khả năng là máy in
                        if (isPotentialPrinter(it)) {
                            val printerDevice = PrinterDevice(
                                id = it.address.replace(":", ""),
                                name = it.name ?: "Unknown Printer",
                                connectionType = ConnectionType.BLUETOOTH,
                                address = it.address,
                                signalStrength = intent.getShortExtra(BluetoothDevice.EXTRA_RSSI, Short.MIN_VALUE).toInt()
                            )
                            discoveryCallback?.invoke(printerDevice)
                        }
                    }
                }

                BluetoothAdapter.ACTION_DISCOVERY_FINISHED -> {
                    Timber.d("$TAG: Discovery finished")
                }
            }
        }
    }

    /**
     * Kiểm tra Bluetooth có sẵn không
     */
    fun isBluetoothAvailable(): Boolean = bluetoothAdapter != null

    /**
     * Kiểm tra Bluetooth đã bật chưa
     */
    fun isBluetoothEnabled(): Boolean = bluetoothAdapter?.isEnabled == true

    override fun isConnected(): Boolean = socket?.isConnected == true && _connectionState.value == ConnectionState.Connected

    /**
     * Lấy danh sách thiết bị đã ghép đôi
     */
    @SuppressLint("MissingPermission")
    fun getPairedDevices(): List<PrinterDevice> {
        if (!isBluetoothEnabled()) return emptyList()

        return bluetoothAdapter?.bondedDevices
            ?.filter { isPotentialPrinter(it) }
            ?.map { device ->
                PrinterDevice(
                    id = device.address.replace(":", ""),
                    name = device.name ?: "Unknown",
                    connectionType = ConnectionType.BLUETOOTH,
                    address = device.address,
                    manufacturer = detectManufacturer(device.name)
                )
            }
            ?: emptyList()
    }

    /**
     * Bắt đầu tìm kiếm thiết bị Bluetooth
     */
    @SuppressLint("MissingPermission")
    fun startDiscovery(onDeviceFound: (PrinterDevice) -> Unit) {
        if (!isBluetoothEnabled()) return

        discoveryCallback = onDeviceFound

        val filter = IntentFilter().apply {
            addAction(BluetoothDevice.ACTION_FOUND)
            addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED)
        }
        context.registerReceiver(discoveryReceiver, filter)

        bluetoothAdapter?.startDiscovery()
        Timber.d("$TAG: Started discovery")
    }

    /**
     * Dừng tìm kiếm thiết bị
     */
    @SuppressLint("MissingPermission")
    fun stopDiscovery() {
        try {
            bluetoothAdapter?.cancelDiscovery()
            context.unregisterReceiver(discoveryReceiver)
        } catch (e: Exception) {
            Timber.w(e, "$TAG: Error stopping discovery")
        }
        discoveryCallback = null
    }

    @SuppressLint("MissingPermission")
    override suspend fun connect(device: PrinterDevice): PrinterResult = withContext(Dispatchers.IO) {
        if (device.connectionType != ConnectionType.BLUETOOTH) {
            return@withContext PrinterResult.Error("Invalid connection type for Bluetooth adapter")
        }

        _connectionState.value = ConnectionState.Connecting

        var lastError: Exception? = null
        repeat(MAX_CONNECT_RETRIES) { attempt ->
            try {
                Timber.d("$TAG: Connecting to ${device.name} (attempt ${attempt + 1})")

                // Đóng kết nối cũ
                closeConnection()

                val btDevice = bluetoothAdapter?.getRemoteDevice(device.address)
                    ?: return@withContext PrinterResult.Error("Bluetooth not available").also {
                        _connectionState.value = ConnectionState.Error("Bluetooth not available")
                    }

                // Hủy discovery để tăng tốc kết nối
                bluetoothAdapter?.cancelDiscovery()

                // Tạo socket và kết nối với timeout
                withTimeout(CONNECT_TIMEOUT_MS) {
                    socket = createSocket(btDevice)
                    socket?.connect()
                }

                if (socket?.isConnected == true) {
                    outputStream = socket?.outputStream
                    inputStream = socket?.inputStream

                    // Initialize printer
                    outputStream?.write(EscPosCommands.INIT)
                    outputStream?.flush()

                    _connectedDevice = device.copy(isConnected = true)
                    _connectionState.value = ConnectionState.Connected

                    Timber.d("$TAG: Connected successfully to ${device.name}")
                    return@withContext PrinterResult.Success
                }

            } catch (e: Exception) {
                Timber.w(e, "$TAG: Connection attempt ${attempt + 1} failed")
                lastError = e
                closeConnection()

                if (attempt < MAX_CONNECT_RETRIES - 1) {
                    delay(RETRY_DELAY_MS * (attempt + 1))
                }
            }
        }

        val errorMsg = lastError?.message ?: "Connection failed after $MAX_CONNECT_RETRIES attempts"
        _connectionState.value = ConnectionState.Error(errorMsg)
        return@withContext PrinterResult.Error(errorMsg)
    }

    @SuppressLint("MissingPermission")
    private fun createSocket(device: BluetoothDevice): BluetoothSocket {
        return try {
            // Thử tạo socket secure trước
            device.createRfcommSocketToServiceRecord(SPP_UUID)
        } catch (e: Exception) {
            Timber.w("$TAG: Falling back to insecure socket")
            // Fallback: sử dụng reflection cho các thiết bị cũ
            try {
                val method = device.javaClass.getMethod("createRfcommSocket", Int::class.java)
                method.invoke(device, 1) as BluetoothSocket
            } catch (e2: Exception) {
                // Thử insecure socket
                device.createInsecureRfcommSocketToServiceRecord(SPP_UUID)
            }
        }
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
            outputStream?.close()
            inputStream?.close()
            socket?.close()
        } catch (e: Exception) {
            Timber.w(e, "$TAG: Error closing connection")
        }
        outputStream = null
        inputStream = null
        socket = null
    }

    override suspend fun write(data: ByteArray): PrinterResult = withContext(Dispatchers.IO) {
        if (!isConnected()) {
            return@withContext PrinterResult.Error("Not connected to printer")
        }

        try {
            withTimeout(WRITE_TIMEOUT_MS) {
                outputStream?.write(data)
                outputStream?.flush()
            }
            return@withContext PrinterResult.Success
        } catch (e: IOException) {
            Timber.e(e, "$TAG: Write failed")
            // Kết nối có thể đã bị mất
            _connectionState.value = ConnectionState.Error("Write failed: ${e.message}")
            return@withContext PrinterResult.Error(e.message ?: "Write failed")
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Write error")
            return@withContext PrinterResult.Error(e.message ?: "Write error")
        }
    }

    override suspend fun read(timeout: Long): ByteArray? = withContext(Dispatchers.IO) {
        if (!isConnected()) return@withContext null

        try {
            withTimeout(timeout) {
                val buffer = ByteArray(1024)
                val bytesRead = inputStream?.read(buffer) ?: -1
                if (bytesRead > 0) {
                    return@withTimeout buffer.copyOf(bytesRead)
                }
                return@withTimeout null
            }
        } catch (e: Exception) {
            Timber.w(e, "$TAG: Read timeout or error")
            return@withContext null
        }
    }

    override suspend fun getStatus(): PrinterStatus = withContext(Dispatchers.IO) {
        if (!isConnected()) {
            return@withContext PrinterStatus(isOnline = false)
        }

        try {
            // Gửi lệnh yêu cầu trạng thái
            outputStream?.write(EscPosCommands.DLE_EOT_PRINTER)
            outputStream?.flush()

            // Đọc phản hồi
            val response = read(1000)
            if (response != null && response.isNotEmpty()) {
                return@withContext parseStatus(response)
            }

            // Nếu không đọc được, giả định máy in OK (nhiều máy in không phản hồi)
            return@withContext PrinterStatus(isOnline = true)
        } catch (e: Exception) {
            Timber.w(e, "$TAG: Failed to get status")
            return@withContext PrinterStatus(isOnline = true) // Assume OK
        }
    }

    private fun parseStatus(response: ByteArray): PrinterStatus {
        if (response.isEmpty()) return PrinterStatus(isOnline = true)

        val status = response[0].toInt()
        return PrinterStatus(
            isOnline = (status and 0x08) == 0,
            hasPaper = (status and 0x20) == 0,
            coverOpen = (status and 0x04) != 0,
            hasError = (status and 0x40) != 0
        )
    }

    @SuppressLint("MissingPermission")
    private fun isPotentialPrinter(device: BluetoothDevice): Boolean {
        val name = device.name?.lowercase() ?: return false
        val printerKeywords = listOf(
            "printer", "print", "pos", "receipt",
            "epson", "tm-", "bixolon", "spp-", "srp-",
            "star", "sm-", "tsp",
            "citizen", "ct-",
            "xprinter", "xp-",
            "hprt",
            "rongta", "rp",
            "zj-", "zjiang",
            "munbyn",
            "goojprt", "pt-",
            "gprinter", "gp-",
            "bluetooth printer"
        )
        return printerKeywords.any { name.contains(it) }
    }

    private fun detectManufacturer(name: String?): String? {
        if (name == null) return null
        val nameLower = name.lowercase()

        return when {
            nameLower.contains("epson") || nameLower.startsWith("tm-") -> "Epson"
            nameLower.contains("bixolon") || nameLower.startsWith("spp-") || nameLower.startsWith("srp-") -> "Bixolon"
            nameLower.contains("star") || nameLower.startsWith("sm-") || nameLower.startsWith("tsp") -> "Star Micronics"
            nameLower.contains("citizen") || nameLower.startsWith("ct-") -> "Citizen"
            nameLower.contains("xprinter") || nameLower.startsWith("xp-") -> "Xprinter"
            nameLower.contains("hprt") -> "HPRT"
            nameLower.contains("rongta") || nameLower.startsWith("rp") -> "Rongta"
            nameLower.contains("zj") || nameLower.contains("zjiang") -> "Zjiang"
            nameLower.contains("munbyn") -> "MUNBYN"
            nameLower.contains("goojprt") || nameLower.startsWith("pt-") -> "Goojprt"
            nameLower.contains("gprinter") || nameLower.startsWith("gp-") -> "Gprinter"
            else -> null
        }
    }

    /**
     * Cleanup resources khi không dùng nữa
     */
    fun cleanup() {
        stopDiscovery()
        closeConnection()
        _connectedDevice = null
        _connectionState.value = ConnectionState.Disconnected
    }
}
