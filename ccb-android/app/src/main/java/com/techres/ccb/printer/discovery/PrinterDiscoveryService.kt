package com.techres.ccb.printer.discovery

import android.content.Context
import com.techres.ccb.printer.adapter.*
import com.techres.ccb.printer.core.ConnectionType
import com.techres.ccb.printer.core.PrinterDevice
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Printer Discovery Service
 *
 * Dịch vụ tìm kiếm và phát hiện tất cả các loại máy in có sẵn:
 * - Bluetooth (paired + discovery)
 * - WiFi/LAN (network scan + mDNS/Bonjour)
 * - USB (connected devices)
 * - Sunmi (built-in)
 * - Serial (available ports)
 */
@Singleton
class PrinterDiscoveryService @Inject constructor(
    @ApplicationContext private val context: Context,
    private val bluetoothAdapter: BluetoothPrinterAdapter,
    private val networkAdapter: NetworkPrinterAdapter,
    private val usbAdapter: UsbPrinterAdapter,
    private val sunmiAdapter: SunmiPrinterAdapter,
    private val serialAdapter: SerialPrinterAdapter
) {
    companion object {
        private const val TAG = "PrinterDiscovery"
        private const val DEFAULT_SCAN_TIMEOUT_MS = 15000L
    }

    private val _discoveredDevices = MutableStateFlow<List<PrinterDevice>>(emptyList())
    val discoveredDevices: StateFlow<List<PrinterDevice>> = _discoveredDevices.asStateFlow()

    private val _isScanning = MutableStateFlow(false)
    val isScanning: StateFlow<Boolean> = _isScanning.asStateFlow()

    private val _scanProgress = MutableStateFlow(0f)
    val scanProgress: StateFlow<Float> = _scanProgress.asStateFlow()

    private var scanJob: Job? = null
    private val deviceMap = mutableMapOf<String, PrinterDevice>()

    /**
     * Bắt đầu quét tất cả các loại kết nối
     */
    suspend fun startDiscovery(
        connectionTypes: Set<ConnectionType> = ConnectionType.values().toSet(),
        timeoutMs: Long = DEFAULT_SCAN_TIMEOUT_MS
    ) {
        if (_isScanning.value) {
            Timber.w("$TAG: Discovery already in progress")
            return
        }

        _isScanning.value = true
        _scanProgress.value = 0f
        deviceMap.clear()
        _discoveredDevices.value = emptyList()

        Timber.d("$TAG: Starting discovery for types: $connectionTypes")

        scanJob = CoroutineScope(Dispatchers.IO).launch {
            try {
                val jobs = mutableListOf<Job>()
                val totalTypes = connectionTypes.size
                var completedTypes = 0

                // Sunmi built-in (nhanh nhất, check trước)
                if (ConnectionType.SUNMI_INNER in connectionTypes) {
                    jobs.add(launch {
                        discoverSunmi()
                        completedTypes++
                        updateProgress(completedTypes, totalTypes)
                    })
                }

                // Bluetooth paired devices
                if (ConnectionType.BLUETOOTH in connectionTypes) {
                    jobs.add(launch {
                        discoverBluetoothPaired()
                        completedTypes++
                        updateProgress(completedTypes, totalTypes)
                    })
                }

                // USB devices
                if (ConnectionType.USB in connectionTypes) {
                    jobs.add(launch {
                        discoverUsb()
                        completedTypes++
                        updateProgress(completedTypes, totalTypes)
                    })
                }

                // Serial ports
                if (ConnectionType.SERIAL in connectionTypes) {
                    jobs.add(launch {
                        discoverSerial()
                        completedTypes++
                        updateProgress(completedTypes, totalTypes)
                    })
                }

                // Network (takes longest)
                if (ConnectionType.LAN in connectionTypes || ConnectionType.WIFI in connectionTypes) {
                    jobs.add(launch {
                        discoverNetwork()
                        completedTypes++
                        updateProgress(completedTypes, totalTypes)
                    })
                }

                // Bluetooth discovery (cần thời gian)
                if (ConnectionType.BLUETOOTH in connectionTypes) {
                    jobs.add(launch {
                        discoverBluetoothNew()
                    })
                }

                // Wait for all with timeout
                withTimeoutOrNull(timeoutMs) {
                    jobs.joinAll()
                }

            } catch (e: Exception) {
                Timber.e(e, "$TAG: Discovery error")
            } finally {
                _isScanning.value = false
                _scanProgress.value = 1f
                Timber.d("$TAG: Discovery completed. Found ${deviceMap.size} devices")
            }
        }
    }

    /**
     * Dừng quét
     */
    fun stopDiscovery() {
        scanJob?.cancel()
        scanJob = null

        bluetoothAdapter.stopDiscovery()
        networkAdapter.stopDiscovery()

        _isScanning.value = false
        Timber.d("$TAG: Discovery stopped")
    }

    /**
     * Quét nhanh các thiết bị đã kết nối trước đó
     */
    suspend fun quickScan(): List<PrinterDevice> = withContext(Dispatchers.IO) {
        val devices = mutableListOf<PrinterDevice>()

        // Sunmi
        if (sunmiAdapter.isSunmiDevice()) {
            devices.add(PrinterDevice.sunmiInner().copy(name = sunmiAdapter.getSunmiModel()))
        }

        // Bluetooth paired
        devices.addAll(bluetoothAdapter.getPairedDevices())

        // USB connected
        devices.addAll(usbAdapter.getConnectedPrinters())

        // Serial ports
        serialAdapter.getAvailablePorts().forEach { port ->
            devices.add(PrinterDevice(
                id = port.hashCode().toString(),
                name = "Serial ($port)",
                connectionType = ConnectionType.SERIAL,
                address = port
            ))
        }

        return@withContext devices
    }

    private suspend fun discoverSunmi() {
        if (sunmiAdapter.isSunmiDevice()) {
            val device = PrinterDevice.sunmiInner().copy(name = sunmiAdapter.getSunmiModel())
            addDevice(device)
            Timber.d("$TAG: Found Sunmi built-in printer")
        }
    }

    private suspend fun discoverBluetoothPaired() {
        if (!bluetoothAdapter.isBluetoothAvailable() || !bluetoothAdapter.isBluetoothEnabled()) {
            Timber.d("$TAG: Bluetooth not available or disabled")
            return
        }

        val pairedDevices = bluetoothAdapter.getPairedDevices()
        pairedDevices.forEach { device ->
            addDevice(device)
        }
        Timber.d("$TAG: Found ${pairedDevices.size} paired Bluetooth printers")
    }

    private suspend fun discoverBluetoothNew() {
        if (!bluetoothAdapter.isBluetoothAvailable() || !bluetoothAdapter.isBluetoothEnabled()) {
            return
        }

        bluetoothAdapter.startDiscovery { device ->
            addDevice(device)
        }

        // Discovery tự dừng sau khoảng 12 giây
        delay(12000)
        bluetoothAdapter.stopDiscovery()
    }

    private suspend fun discoverUsb() {
        usbAdapter.registerReceiver()
        val usbPrinters = usbAdapter.getConnectedPrinters()
        usbPrinters.forEach { device ->
            addDevice(device)
        }
        Timber.d("$TAG: Found ${usbPrinters.size} USB printers")
    }

    private suspend fun discoverSerial() {
        val ports = serialAdapter.getAvailablePorts()
        ports.forEach { port ->
            val device = PrinterDevice(
                id = port.hashCode().toString(),
                name = "Serial Printer ($port)",
                connectionType = ConnectionType.SERIAL,
                address = port
            )
            addDevice(device)
        }
        Timber.d("$TAG: Found ${ports.size} serial ports")
    }

    private suspend fun discoverNetwork() {
        // mDNS/Bonjour discovery
        networkAdapter.discoverPrintersViaNsd(
            onDeviceFound = { device -> addDevice(device) },
            onError = { error -> Timber.w("$TAG: NSD error: $error") }
        )

        // Network scan (slow, but comprehensive)
        networkAdapter.discoverPrinters(
            onDeviceFound = { device -> addDevice(device) },
            timeoutMs = 10000L
        )

        networkAdapter.stopDiscovery()
    }

    private fun addDevice(device: PrinterDevice) {
        synchronized(deviceMap) {
            if (!deviceMap.containsKey(device.id)) {
                deviceMap[device.id] = device
                _discoveredDevices.value = deviceMap.values.toList().sortedBy { it.connectionType.ordinal }
                Timber.d("$TAG: Added device: ${device.name} (${device.connectionType})")
            }
        }
    }

    private fun updateProgress(completed: Int, total: Int) {
        _scanProgress.value = completed.toFloat() / total
    }

    /**
     * Lấy thiết bị theo ID
     */
    fun getDevice(id: String): PrinterDevice? = deviceMap[id]

    /**
     * Lọc thiết bị theo loại kết nối
     */
    fun getDevicesByType(type: ConnectionType): List<PrinterDevice> {
        return _discoveredDevices.value.filter { it.connectionType == type }
    }

    /**
     * Cleanup resources
     */
    fun cleanup() {
        stopDiscovery()
        deviceMap.clear()
        _discoveredDevices.value = emptyList()
    }
}

/**
 * Discovery options
 */
data class DiscoveryOptions(
    val connectionTypes: Set<ConnectionType> = ConnectionType.values().toSet(),
    val timeoutMs: Long = 15000L,
    val scanNetwork: Boolean = true,
    val scanBluetoothNew: Boolean = true
)
