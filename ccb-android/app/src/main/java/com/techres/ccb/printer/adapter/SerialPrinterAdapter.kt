package com.techres.ccb.printer.adapter

import android.content.Context
import com.techres.ccb.printer.core.*
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import timber.log.Timber
import java.io.*
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Serial Port Printer Adapter (RS232 / RS485)
 *
 * Hỗ trợ kết nối với máy in qua cổng Serial
 * Phổ biến trên các máy POS công nghiệp
 *
 * Cần:
 * - USB to Serial adapter (nếu không có cổng Serial)
 * - Hoặc thiết bị Android có cổng Serial (một số máy công nghiệp)
 *
 * Thư viện bên ngoài cần thiết:
 * - android-serialport-api
 * - usb-serial-for-android
 *
 * Các máy in hỗ trợ:
 * - Epson TM-U220 (RS232)
 * - Star SP700
 * - Citizen CD-S500
 * - Một số máy in công nghiệp khác
 */
@Singleton
class SerialPrinterAdapter @Inject constructor(
    @ApplicationContext private val context: Context
) : PrinterConnection {

    companion object {
        private const val TAG = "SerialPrinter"

        // Common baud rates
        const val BAUD_9600 = 9600
        const val BAUD_19200 = 19200
        const val BAUD_38400 = 38400
        const val BAUD_57600 = 57600
        const val BAUD_115200 = 115200

        // Default serial port path trên Android
        private const val DEFAULT_SERIAL_PORT = "/dev/ttyS0"

        // Common serial ports
        private val SERIAL_PORTS = listOf(
            "/dev/ttyS0",
            "/dev/ttyS1",
            "/dev/ttyS2",
            "/dev/ttyS3",
            "/dev/ttyUSB0",
            "/dev/ttyUSB1",
            "/dev/ttyACM0",
            "/dev/ttyACM1"
        )
    }

    override val connectionType = ConnectionType.SERIAL

    private val _connectionState = MutableStateFlow<ConnectionState>(ConnectionState.Disconnected)
    override val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private var _connectedDevice: PrinterDevice? = null
    override val connectedDevice: PrinterDevice? get() = _connectedDevice

    private var serialPort: FileDescriptor? = null
    private var inputStream: FileInputStream? = null
    private var outputStream: FileOutputStream? = null
    private var currentPortPath: String? = null

    override fun isConnected(): Boolean = serialPort != null && _connectionState.value == ConnectionState.Connected

    /**
     * Lấy danh sách cổng Serial có sẵn
     */
    fun getAvailablePorts(): List<String> {
        return SERIAL_PORTS.filter { path ->
            val file = File(path)
            file.exists() && file.canRead() && file.canWrite()
        }
    }

    /**
     * Kiểm tra cổng Serial có khả dụng không
     */
    fun isPortAvailable(path: String): Boolean {
        val file = File(path)
        return file.exists() && file.canRead() && file.canWrite()
    }

    override suspend fun connect(device: PrinterDevice): PrinterResult = withContext(Dispatchers.IO) {
        if (device.connectionType != ConnectionType.SERIAL) {
            return@withContext PrinterResult.Error("Invalid connection type for Serial adapter")
        }

        _connectionState.value = ConnectionState.Connecting

        val portPath = device.address
        val baudRate = device.extra["baudRate"]?.toIntOrNull() ?: BAUD_9600

        Timber.d("$TAG: Connecting to $portPath at $baudRate baud")

        try {
            // Kiểm tra port tồn tại
            val portFile = File(portPath)
            if (!portFile.exists()) {
                _connectionState.value = ConnectionState.Error("Serial port not found")
                return@withContext PrinterResult.Error("Serial port not found: $portPath")
            }

            // Kiểm tra quyền truy cập
            if (!portFile.canRead() || !portFile.canWrite()) {
                _connectionState.value = ConnectionState.Error("No permission to access serial port")
                return@withContext PrinterResult.Error("No permission to access serial port. Try: chmod 666 $portPath")
            }

            // Đóng kết nối cũ
            closeConnection()

            // Mở serial port sử dụng file descriptor
            // Note: Cần native code hoặc thư viện bên ngoài để cấu hình baud rate thực sự
            // Đây là implementation đơn giản sử dụng file I/O
            val fileDescriptor = openSerialPort(portPath, baudRate)

            if (fileDescriptor != null) {
                serialPort = fileDescriptor
                currentPortPath = portPath

                // Tạo streams
                inputStream = FileInputStream(fileDescriptor)
                outputStream = FileOutputStream(fileDescriptor)

                // Initialize printer
                write(EscPosCommands.INIT)

                _connectedDevice = device.copy(isConnected = true)
                _connectionState.value = ConnectionState.Connected

                Timber.d("$TAG: Connected to $portPath")
                return@withContext PrinterResult.Success
            } else {
                _connectionState.value = ConnectionState.Error("Failed to open serial port")
                return@withContext PrinterResult.Error("Failed to open serial port")
            }

        } catch (e: Exception) {
            Timber.e(e, "$TAG: Connection failed")
            closeConnection()
            _connectionState.value = ConnectionState.Error(e.message ?: "Connection failed")
            return@withContext PrinterResult.Error(e.message ?: "Connection failed")
        }
    }

    /**
     * Kết nối nhanh bằng port path
     */
    suspend fun connect(portPath: String, baudRate: Int = BAUD_9600): PrinterResult {
        val device = PrinterDevice(
            id = portPath.hashCode().toString(),
            name = "Serial Printer",
            connectionType = ConnectionType.SERIAL,
            address = portPath,
            extra = mapOf("baudRate" to baudRate.toString())
        )
        return connect(device)
    }

    /**
     * Mở serial port
     *
     * Note: Đây là implementation cơ bản sử dụng file I/O.
     * Để có đầy đủ tính năng (baud rate, parity, stop bits...),
     * cần sử dụng:
     * - JNI + termios API
     * - Thư viện: usb-serial-for-android hoặc android-serialport-api
     */
    private fun openSerialPort(path: String, baudRate: Int): FileDescriptor? {
        return try {
            // Sử dụng su để cấp quyền nếu cần
            try {
                Runtime.getRuntime().exec("chmod 666 $path").waitFor()
            } catch (e: Exception) {
                Timber.w(e, "$TAG: chmod failed, trying anyway")
            }

            // Cấu hình serial port bằng stty (nếu có)
            try {
                Runtime.getRuntime().exec("stty -F $path $baudRate cs8 -cstopb -parenb raw").waitFor()
            } catch (e: Exception) {
                Timber.w(e, "$TAG: stty configuration failed")
            }

            // Mở file descriptor
            val raf = RandomAccessFile(path, "rw")
            raf.fd

        } catch (e: Exception) {
            Timber.e(e, "$TAG: Failed to open serial port $path")
            null
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
            inputStream?.close()
            outputStream?.close()
        } catch (e: Exception) {
            Timber.w(e, "$TAG: Error closing connection")
        }
        inputStream = null
        outputStream = null
        serialPort = null
        currentPortPath = null
    }

    override suspend fun write(data: ByteArray): PrinterResult = withContext(Dispatchers.IO) {
        val stream = outputStream ?: return@withContext PrinterResult.Error("Not connected")

        try {
            stream.write(data)
            stream.flush()
            return@withContext PrinterResult.Success
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Write failed")
            _connectionState.value = ConnectionState.Error("Write failed: ${e.message}")
            return@withContext PrinterResult.Error(e.message ?: "Write failed")
        }
    }

    override suspend fun read(timeout: Long): ByteArray? = withContext(Dispatchers.IO) {
        val stream = inputStream ?: return@withContext null

        try {
            if (stream.available() > 0) {
                val buffer = ByteArray(1024)
                val bytesRead = stream.read(buffer)
                if (bytesRead > 0) {
                    return@withContext buffer.copyOf(bytesRead)
                }
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

        try {
            // Gửi lệnh status
            outputStream?.write(EscPosCommands.DLE_EOT_PRINTER)
            outputStream?.flush()

            // Đọc response
            Thread.sleep(100) // Đợi response
            val response = read(1000)

            if (response != null && response.isNotEmpty()) {
                val status = response[0].toInt()
                return@withContext PrinterStatus(
                    isOnline = (status and 0x08) == 0,
                    hasPaper = (status and 0x20) == 0,
                    coverOpen = (status and 0x04) != 0,
                    hasError = (status and 0x40) != 0
                )
            }

            return@withContext PrinterStatus(isOnline = true)
        } catch (e: Exception) {
            Timber.w(e, "$TAG: Failed to get status")
            return@withContext PrinterStatus(isOnline = true)
        }
    }

    /**
     * Test print
     */
    suspend fun testPrint(): PrinterResult {
        if (!isConnected()) {
            return PrinterResult.Error("Not connected")
        }

        val testData = EscPosBuilder()
            .init()
            .alignCenter()
            .line("=== SERIAL TEST PRINT ===")
            .line("")
            .alignLeft()
            .line("Connection: OK")
            .line("Type: Serial (RS232)")
            .line("Port: $currentPortPath")
            .line("")
            .separator()
            .feed(3)
            .cut()
            .build()

        return write(testData)
    }

    fun cleanup() {
        closeConnection()
        _connectedDevice = null
        _connectionState.value = ConnectionState.Disconnected
    }
}

/**
 * Serial Port Configuration
 */
data class SerialConfig(
    val path: String,
    val baudRate: Int = 9600,
    val dataBits: Int = 8,      // 5, 6, 7, 8
    val stopBits: Int = 1,      // 1, 2
    val parity: Parity = Parity.NONE,
    val flowControl: FlowControl = FlowControl.NONE
) {
    enum class Parity { NONE, ODD, EVEN, MARK, SPACE }
    enum class FlowControl { NONE, HARDWARE, SOFTWARE }
}
