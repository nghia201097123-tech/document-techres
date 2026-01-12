package com.techres.ccb.printer.adapter

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.os.Build
import com.techres.ccb.printer.core.*
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import timber.log.Timber
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.net.*
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Network Printer Adapter (WiFi / LAN / Ethernet)
 *
 * Hỗ trợ kết nối với máy in qua TCP/IP socket
 * Tương thích Android 6+ (API 23+)
 *
 * Protocols:
 * - Raw TCP (port 9100) - Phổ biến nhất cho máy in POS
 * - LPR/LPD (port 515) - Một số máy in cũ
 * - IPP (port 631) - Internet Printing Protocol
 *
 * Các hãng máy in hỗ trợ:
 * - Epson TM-T88, TM-T82
 * - Star TSP100, TSP650
 * - Bixolon SRP series
 * - Citizen CT-E651
 * - Xprinter XP-N160II
 * - HPRT TP806L
 * - Rongta RP80
 * - Tất cả máy in hỗ trợ ESC/POS qua mạng
 */
@Singleton
class NetworkPrinterAdapter @Inject constructor(
    @ApplicationContext private val context: Context
) : PrinterConnection {

    companion object {
        private const val TAG = "NetworkPrinter"

        // Standard ports
        const val PORT_RAW = 9100      // Raw printing (phổ biến nhất)
        const val PORT_LPR = 515       // LPR/LPD
        const val PORT_IPP = 631       // IPP
        const val PORT_JETDIRECT = 9100 // HP JetDirect compatible

        // Timeout values
        private const val CONNECT_TIMEOUT_MS = 5000
        private const val READ_TIMEOUT_MS = 3000
        private const val WRITE_TIMEOUT_MS = 5000

        // Discovery
        private const val DISCOVERY_TIMEOUT_MS = 10000L
        private val COMMON_PORTS = listOf(9100, 9101, 9102)
    }

    override val connectionType = ConnectionType.LAN

    private val _connectionState = MutableStateFlow<ConnectionState>(ConnectionState.Disconnected)
    override val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private var _connectedDevice: PrinterDevice? = null
    override val connectedDevice: PrinterDevice? get() = _connectedDevice

    private var socket: Socket? = null
    private var outputStream: OutputStream? = null
    private var inputStream: InputStream? = null

    private var nsdManager: NsdManager? = null
    private var discoveryListener: NsdManager.DiscoveryListener? = null

    override fun isConnected(): Boolean = socket?.isConnected == true &&
            socket?.isClosed == false &&
            _connectionState.value == ConnectionState.Connected

    /**
     * Kết nối đến máy in qua IP và port
     */
    override suspend fun connect(device: PrinterDevice): PrinterResult = withContext(Dispatchers.IO) {
        if (device.connectionType != ConnectionType.LAN && device.connectionType != ConnectionType.WIFI) {
            return@withContext PrinterResult.Error("Invalid connection type for Network adapter")
        }

        _connectionState.value = ConnectionState.Connecting

        try {
            // Parse address (format: ip:port hoặc ip)
            val (ip, port) = parseAddress(device.address)

            Timber.d("$TAG: Connecting to $ip:$port")

            // Đóng kết nối cũ
            closeConnection()

            // Thêm delay nhỏ để máy in giải phóng kết nối cũ
            delay(100)

            // Tạo socket với các options để ổn định kết nối
            socket = Socket().apply {
                // Cho phép reuse address để tránh "Address already in use"
                reuseAddress = true
                // Enable TCP Keep-Alive để detect dead connections
                keepAlive = true
                // Disable Nagle's algorithm cho real-time printing
                tcpNoDelay = true
                // Set linger để đảm bảo data được gửi trước khi đóng
                setSoLinger(true, 2)
                // Read timeout
                soTimeout = READ_TIMEOUT_MS
                // Connect với timeout
                connect(InetSocketAddress(ip, port), CONNECT_TIMEOUT_MS)
            }

            if (socket?.isConnected == true) {
                outputStream = socket?.getOutputStream()
                inputStream = socket?.getInputStream()

                // Initialize printer
                outputStream?.write(EscPosCommands.INIT)
                outputStream?.flush()

                _connectedDevice = device.copy(isConnected = true)
                _connectionState.value = ConnectionState.Connected

                Timber.d("$TAG: Connected successfully to $ip:$port")
                return@withContext PrinterResult.Success
            } else {
                throw IOException("Failed to connect")
            }

        } catch (e: SocketTimeoutException) {
            Timber.e(e, "$TAG: Connection timeout")
            _connectionState.value = ConnectionState.Error("Connection timeout")
            return@withContext PrinterResult.Error("Connection timeout")
        } catch (e: UnknownHostException) {
            Timber.e(e, "$TAG: Unknown host")
            _connectionState.value = ConnectionState.Error("Unknown host: ${device.address}")
            return@withContext PrinterResult.Error("Unknown host")
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Connection failed")
            closeConnection()
            _connectionState.value = ConnectionState.Error(e.message ?: "Connection failed")
            return@withContext PrinterResult.Error(e.message ?: "Connection failed")
        }
    }

    /**
     * Kết nối nhanh bằng IP và port
     */
    suspend fun connect(ip: String, port: Int = PORT_RAW): PrinterResult {
        val device = PrinterDevice.fromNetworkAddress(ip, port)
        return connect(device)
    }

    /**
     * Kết nối với retry logic cho các trường hợp Connection Refused
     * @param maxRetries Số lần thử lại tối đa
     * @param retryDelayMs Thời gian chờ giữa các lần thử (ms)
     */
    suspend fun connectWithRetry(
        device: PrinterDevice,
        maxRetries: Int = 3,
        retryDelayMs: Long = 500
    ): PrinterResult = withContext(Dispatchers.IO) {
        var lastError: String? = null

        for (attempt in 1..maxRetries) {
            Timber.d("$TAG: Connection attempt $attempt/$maxRetries")

            val result = connect(device)
            if (result is PrinterResult.Success) {
                return@withContext result
            }

            lastError = (result as? PrinterResult.Error)?.message

            // Nếu là lỗi Connection Refused, chờ và thử lại
            if (lastError?.contains("ECONNREFUSED", ignoreCase = true) == true ||
                lastError?.contains("Connection refused", ignoreCase = true) == true) {

                if (attempt < maxRetries) {
                    Timber.d("$TAG: Connection refused, waiting ${retryDelayMs}ms before retry...")
                    delay(retryDelayMs)
                    // Tăng delay exponentially
                    delay(retryDelayMs * attempt)
                }
            } else {
                // Các lỗi khác (timeout, unknown host) không cần retry
                return@withContext result
            }
        }

        return@withContext PrinterResult.Error("Failed after $maxRetries attempts: $lastError")
    }

    /**
     * Kết nối với retry bằng IP và port
     */
    suspend fun connectWithRetry(
        ip: String,
        port: Int = PORT_RAW,
        maxRetries: Int = 3,
        retryDelayMs: Long = 500
    ): PrinterResult {
        val device = PrinterDevice.fromNetworkAddress(ip, port)
        return connectWithRetry(device, maxRetries, retryDelayMs)
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
            // Shutdown output stream first to signal end of transmission
            try {
                socket?.shutdownOutput()
            } catch (e: Exception) {
                // Socket may not be connected
            }

            // Close streams
            try {
                outputStream?.flush()
                outputStream?.close()
            } catch (e: Exception) {
                Timber.w(e, "$TAG: Error closing output stream")
            }

            try {
                inputStream?.close()
            } catch (e: Exception) {
                Timber.w(e, "$TAG: Error closing input stream")
            }

            // Close socket
            try {
                socket?.close()
            } catch (e: Exception) {
                Timber.w(e, "$TAG: Error closing socket")
            }
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
            outputStream?.write(data)
            outputStream?.flush()
            return@withContext PrinterResult.Success
        } catch (e: SocketException) {
            Timber.e(e, "$TAG: Socket error during write")
            _connectionState.value = ConnectionState.Error("Connection lost")
            return@withContext PrinterResult.Error("Connection lost: ${e.message}")
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Write failed")
            return@withContext PrinterResult.Error(e.message ?: "Write failed")
        }
    }

    override suspend fun read(timeout: Long): ByteArray? = withContext(Dispatchers.IO) {
        if (!isConnected()) return@withContext null

        try {
            socket?.soTimeout = timeout.toInt()
            val buffer = ByteArray(1024)
            val bytesRead = inputStream?.read(buffer) ?: -1
            if (bytesRead > 0) {
                return@withContext buffer.copyOf(bytesRead)
            }
            return@withContext null
        } catch (e: SocketTimeoutException) {
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

            val response = read(1000)
            if (response != null && response.isNotEmpty()) {
                return@withContext parseStatus(response)
            }

            return@withContext PrinterStatus(isOnline = true)
        } catch (e: Exception) {
            return@withContext PrinterStatus(isOnline = true)
        }
    }

    /**
     * Quét mạng local để tìm máy in
     */
    suspend fun discoverPrinters(
        onDeviceFound: (PrinterDevice) -> Unit,
        subnet: String? = null,
        timeoutMs: Long = DISCOVERY_TIMEOUT_MS
    ) = withContext(Dispatchers.IO) {

        val localSubnet = subnet ?: getLocalSubnet() ?: return@withContext

        Timber.d("$TAG: Scanning subnet $localSubnet")

        val jobs = mutableListOf<Job>()

        // Quét các IP trong subnet
        for (i in 1..254) {
            val ip = "$localSubnet.$i"
            jobs.add(launch {
                for (port in COMMON_PORTS) {
                    if (isPortOpen(ip, port, 500)) {
                        Timber.d("$TAG: Found device at $ip:$port")
                        val device = PrinterDevice.fromNetworkAddress(ip, port)
                        onDeviceFound(device)
                        break
                    }
                }
            })
        }

        // Chờ với timeout
        withTimeoutOrNull(timeoutMs) {
            jobs.joinAll()
        }

        Timber.d("$TAG: Network scan completed")
    }

    /**
     * Discover printers using mDNS/Bonjour (NSD)
     */
    fun discoverPrintersViaNsd(
        onDeviceFound: (PrinterDevice) -> Unit,
        onError: (String) -> Unit = {}
    ) {
        nsdManager = context.getSystemService(Context.NSD_SERVICE) as? NsdManager
            ?: run {
                onError("NSD service not available")
                return
            }

        discoveryListener = object : NsdManager.DiscoveryListener {
            override fun onStartDiscoveryFailed(serviceType: String?, errorCode: Int) {
                Timber.e("$TAG: Discovery failed: $errorCode")
                onError("Discovery failed: $errorCode")
            }

            override fun onStopDiscoveryFailed(serviceType: String?, errorCode: Int) {
                Timber.e("$TAG: Stop discovery failed: $errorCode")
            }

            override fun onDiscoveryStarted(serviceType: String?) {
                Timber.d("$TAG: NSD discovery started")
            }

            override fun onDiscoveryStopped(serviceType: String?) {
                Timber.d("$TAG: NSD discovery stopped")
            }

            override fun onServiceFound(serviceInfo: NsdServiceInfo?) {
                serviceInfo?.let { info ->
                    Timber.d("$TAG: Service found: ${info.serviceName}")
                    resolveService(info, onDeviceFound)
                }
            }

            override fun onServiceLost(serviceInfo: NsdServiceInfo?) {
                Timber.d("$TAG: Service lost: ${serviceInfo?.serviceName}")
            }
        }

        // Tìm kiếm các loại service phổ biến cho máy in
        val serviceTypes = listOf(
            "_ipp._tcp.",           // IPP
            "_pdl-datastream._tcp.", // Raw 9100
            "_printer._tcp.",       // Generic printer
            "_rawprint._tcp."       // Raw printing
        )

        serviceTypes.forEach { type ->
            try {
                nsdManager?.discoverServices(type, NsdManager.PROTOCOL_DNS_SD, discoveryListener)
            } catch (e: Exception) {
                Timber.w(e, "$TAG: Failed to discover $type")
            }
        }
    }

    private fun resolveService(serviceInfo: NsdServiceInfo, onDeviceFound: (PrinterDevice) -> Unit) {
        nsdManager?.resolveService(serviceInfo, object : NsdManager.ResolveListener {
            override fun onResolveFailed(info: NsdServiceInfo?, errorCode: Int) {
                Timber.w("$TAG: Resolve failed: $errorCode")
            }

            override fun onServiceResolved(info: NsdServiceInfo?) {
                info?.let {
                    val ip = it.host?.hostAddress ?: return
                    val port = it.port
                    val device = PrinterDevice(
                        id = "${ip}_$port",
                        name = it.serviceName ?: "Network Printer",
                        connectionType = ConnectionType.LAN,
                        address = "$ip:$port"
                    )
                    onDeviceFound(device)
                }
            }
        })
    }

    /**
     * Dừng discovery
     */
    fun stopDiscovery() {
        try {
            discoveryListener?.let { nsdManager?.stopServiceDiscovery(it) }
        } catch (e: Exception) {
            Timber.w(e, "$TAG: Error stopping discovery")
        }
        discoveryListener = null
    }

    /**
     * Ping một IP để kiểm tra khả dụng
     */
    suspend fun ping(ip: String, timeoutMs: Int = 1000): Boolean = withContext(Dispatchers.IO) {
        try {
            InetAddress.getByName(ip).isReachable(timeoutMs)
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Kiểm tra port có mở không
     */
    suspend fun isPortOpen(ip: String, port: Int, timeoutMs: Int = 500): Boolean = withContext(Dispatchers.IO) {
        try {
            Socket().use { socket ->
                socket.connect(InetSocketAddress(ip, port), timeoutMs)
                true
            }
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Test print để kiểm tra kết nối
     */
    suspend fun testPrint(): PrinterResult {
        if (!isConnected()) {
            return PrinterResult.Error("Not connected")
        }

        val testData = EscPosBuilder()
            .init()
            .alignCenter()
            .line("=== TEST PRINT ===")
            .line("")
            .alignLeft()
            .line("Connection: OK")
            .line("Type: Network (TCP/IP)")
            .line("Address: ${_connectedDevice?.address}")
            .line("")
            .separator()
            .feed(3)
            .cut()
            .build()

        return write(testData)
    }

    private fun parseAddress(address: String): Pair<String, Int> {
        return if (address.contains(":")) {
            val parts = address.split(":")
            Pair(parts[0], parts.getOrNull(1)?.toIntOrNull() ?: PORT_RAW)
        } else {
            Pair(address, PORT_RAW)
        }
    }

    private fun getLocalSubnet(): String? {
        return try {
            val interfaces = NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val networkInterface = interfaces.nextElement()
                if (networkInterface.isLoopback || !networkInterface.isUp) continue

                for (address in networkInterface.inetAddresses) {
                    if (address is Inet4Address && !address.isLoopbackAddress) {
                        val ip = address.hostAddress ?: continue
                        val parts = ip.split(".")
                        if (parts.size == 4) {
                            return "${parts[0]}.${parts[1]}.${parts[2]}"
                        }
                    }
                }
            }
            null
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Failed to get local subnet")
            null
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

    fun cleanup() {
        stopDiscovery()
        closeConnection()
        _connectedDevice = null
        _connectionState.value = ConnectionState.Disconnected
    }
}
