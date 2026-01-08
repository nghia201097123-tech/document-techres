package com.techres.ccb.printer

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.os.Build
import com.techres.ccb.printer.core.ConnectionType
import com.techres.ccb.printer.core.PrinterDevice
import com.techres.ccb.printer.core.PrinterResult
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import timber.log.Timber
import java.io.OutputStream
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Bluetooth Printer Manager compatible with Android 6+
 * Uses Classic Bluetooth API (not Companion Device API)
 *
 * Supported protocols:
 * - ESC/POS (most thermal printers)
 */
@Singleton
class BluetoothPrinterManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private const val TAG = "BluetoothPrinter"

        // UUID for Serial Port Profile (SPP) - standard for printers
        private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

        // ESC/POS commands
        object EscPos {
            val INIT = byteArrayOf(0x1B, 0x40)                      // Initialize printer
            val CUT_PAPER = byteArrayOf(0x1D, 0x56, 0x00)           // Full cut
            val CUT_PAPER_PARTIAL = byteArrayOf(0x1D, 0x56, 0x01)   // Partial cut
            val LINE_FEED = byteArrayOf(0x0A)                        // Line feed
            val ALIGN_LEFT = byteArrayOf(0x1B, 0x61, 0x00)          // Align left
            val ALIGN_CENTER = byteArrayOf(0x1B, 0x61, 0x01)        // Align center
            val ALIGN_RIGHT = byteArrayOf(0x1B, 0x61, 0x02)         // Align right
            val TEXT_NORMAL = byteArrayOf(0x1B, 0x21, 0x00)         // Normal text
            val TEXT_BOLD = byteArrayOf(0x1B, 0x21, 0x08)           // Bold text
            val TEXT_DOUBLE_HEIGHT = byteArrayOf(0x1B, 0x21, 0x10)  // Double height
            val TEXT_DOUBLE_WIDTH = byteArrayOf(0x1B, 0x21, 0x20)   // Double width
            val TEXT_LARGE = byteArrayOf(0x1B, 0x21, 0x30)          // Large text (double height + width)
            val UNDERLINE_ON = byteArrayOf(0x1B, 0x2D, 0x01)        // Underline on
            val UNDERLINE_OFF = byteArrayOf(0x1B, 0x2D, 0x00)       // Underline off
            val FEED_LINES_3 = byteArrayOf(0x1B, 0x64, 0x03)        // Feed 3 lines
            val FEED_LINES_5 = byteArrayOf(0x1B, 0x64, 0x05)        // Feed 5 lines
        }
    }

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
    private var connectedDevice: BluetoothDevice? = null

    /**
     * Check if Bluetooth is available
     */
    fun isBluetoothAvailable(): Boolean = bluetoothAdapter != null

    /**
     * Check if Bluetooth is enabled
     */
    fun isBluetoothEnabled(): Boolean = bluetoothAdapter?.isEnabled == true

    /**
     * Check if connected to a printer
     */
    fun isConnected(): Boolean = socket?.isConnected == true

    /**
     * Get connected device name
     */
    @SuppressLint("MissingPermission")
    fun getConnectedDeviceName(): String? = connectedDevice?.name

    /**
     * Get list of paired Bluetooth devices
     */
    @SuppressLint("MissingPermission")
    fun getPairedDevices(): List<PrinterDevice> {
        if (!isBluetoothEnabled()) return emptyList()

        return bluetoothAdapter?.bondedDevices
            ?.map { device ->
                PrinterDevice(
                    id = device.address.replace(":", ""),
                    name = device.name ?: "Unknown",
                    connectionType = ConnectionType.BLUETOOTH,
                    address = device.address
                )
            }
            ?: emptyList()
    }

    /**
     * Connect to a Bluetooth printer
     */
    @SuppressLint("MissingPermission")
    suspend fun connect(deviceAddress: String): PrinterResult = withContext(Dispatchers.IO) {
        try {
            // Disconnect existing connection
            disconnect()

            val device = bluetoothAdapter?.getRemoteDevice(deviceAddress)
                ?: return@withContext PrinterResult.Error("Bluetooth not available")

            Timber.d("$TAG: Connecting to ${device.name} ($deviceAddress)")

            // Create socket using SPP UUID
            socket = device.createRfcommSocketToServiceRecord(SPP_UUID)

            // Cancel discovery to speed up connection
            bluetoothAdapter?.cancelDiscovery()

            // Connect
            socket?.connect()

            if (socket?.isConnected == true) {
                outputStream = socket?.outputStream
                connectedDevice = device

                // Initialize printer
                outputStream?.write(EscPos.INIT)
                outputStream?.flush()

                Timber.d("$TAG: Connected successfully")
                return@withContext PrinterResult.Success
            } else {
                return@withContext PrinterResult.Error("Failed to connect")
            }

        } catch (e: Exception) {
            Timber.e(e, "$TAG: Connection failed")
            disconnect()
            return@withContext PrinterResult.Error(e.message ?: "Connection failed")
        }
    }

    /**
     * Disconnect from printer
     */
    fun disconnect() {
        try {
            outputStream?.close()
            socket?.close()
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error disconnecting")
        }
        outputStream = null
        socket = null
        connectedDevice = null
    }

    /**
     * Print raw bytes
     */
    suspend fun printRaw(data: ByteArray): PrinterResult = withContext(Dispatchers.IO) {
        if (!isConnected()) {
            return@withContext PrinterResult.Error("Not connected to printer")
        }

        try {
            outputStream?.write(data)
            outputStream?.flush()
            return@withContext PrinterResult.Success
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Print failed")
            return@withContext PrinterResult.Error(e.message ?: "Print failed")
        }
    }

    /**
     * Print text with encoding
     */
    suspend fun printText(text: String, charset: String = "UTF-8"): PrinterResult {
        return printRaw(text.toByteArray(charset(charset)))
    }

    /**
     * Print a line of text
     */
    suspend fun printLine(text: String): PrinterResult {
        return printRaw("$text\n".toByteArray())
    }

    /**
     * Print centered text
     */
    suspend fun printCentered(text: String): PrinterResult {
        val result1 = printRaw(EscPos.ALIGN_CENTER)
        if (result1 is PrinterResult.Error) return result1

        val result2 = printLine(text)
        if (result2 is PrinterResult.Error) return result2

        return printRaw(EscPos.ALIGN_LEFT)
    }

    /**
     * Print bold text
     */
    suspend fun printBold(text: String): PrinterResult {
        val result1 = printRaw(EscPos.TEXT_BOLD)
        if (result1 is PrinterResult.Error) return result1

        val result2 = printLine(text)
        if (result2 is PrinterResult.Error) return result2

        return printRaw(EscPos.TEXT_NORMAL)
    }

    /**
     * Print large text (double height + width)
     */
    suspend fun printLarge(text: String): PrinterResult {
        val result1 = printRaw(EscPos.TEXT_LARGE)
        if (result1 is PrinterResult.Error) return result1

        val result2 = printLine(text)
        if (result2 is PrinterResult.Error) return result2

        return printRaw(EscPos.TEXT_NORMAL)
    }

    /**
     * Print separator line
     */
    suspend fun printSeparator(char: Char = '-', length: Int = 32): PrinterResult {
        return printLine(char.toString().repeat(length))
    }

    /**
     * Print two columns (left and right aligned)
     */
    suspend fun printTwoColumns(left: String, right: String, width: Int = 32): PrinterResult {
        val spaces = width - left.length - right.length
        val line = if (spaces > 0) {
            left + " ".repeat(spaces) + right
        } else {
            "$left  $right"
        }
        return printLine(line)
    }

    /**
     * Feed lines
     */
    suspend fun feedLines(count: Int = 3): PrinterResult {
        return printRaw(byteArrayOf(0x1B, 0x64, count.toByte()))
    }

    /**
     * Cut paper
     */
    suspend fun cutPaper(partial: Boolean = false): PrinterResult {
        return printRaw(if (partial) EscPos.CUT_PAPER_PARTIAL else EscPos.CUT_PAPER)
    }

    /**
     * Print receipt
     */
    suspend fun printReceipt(receipt: BluetoothReceipt): PrinterResult = withContext(Dispatchers.IO) {
        if (!isConnected()) {
            return@withContext PrinterResult.Error("Not connected to printer")
        }

        try {
            // Initialize
            printRaw(EscPos.INIT)

            // Header
            printRaw(EscPos.ALIGN_CENTER)
            printRaw(EscPos.TEXT_LARGE)
            printLine(receipt.storeName)
            printRaw(EscPos.TEXT_NORMAL)
            receipt.storeAddress?.let { printLine(it) }
            receipt.storePhone?.let { printLine("ĐT: $it") }
            printLine("")

            // Order info
            printRaw(EscPos.ALIGN_LEFT)
            printSeparator()
            printTwoColumns("Số HĐ:", receipt.orderNumber)
            printTwoColumns("Ngày:", receipt.dateTime)
            receipt.tableName?.let { printTwoColumns("Bàn:", it) }
            receipt.staffName?.let { printTwoColumns("Thu ngân:", it) }
            printSeparator()

            // Items
            for (item in receipt.items) {
                printLine(item.name)
                printTwoColumns(
                    "  ${item.quantity} x ${formatCurrency(item.unitPrice)}",
                    formatCurrency(item.totalPrice)
                )
            }
            printSeparator()

            // Totals
            printTwoColumns("Tạm tính:", formatCurrency(receipt.subtotal))
            if (receipt.discount > 0) {
                printTwoColumns("Giảm giá:", "-${formatCurrency(receipt.discount)}")
            }
            if (receipt.vat > 0) {
                printTwoColumns("VAT:", formatCurrency(receipt.vat))
            }
            printRaw(EscPos.TEXT_BOLD)
            printTwoColumns("TỔNG CỘNG:", formatCurrency(receipt.total))
            printRaw(EscPos.TEXT_NORMAL)

            // Payment
            printSeparator()
            printTwoColumns("Thanh toán:", receipt.paymentMethod)
            printTwoColumns("Tiền khách:", formatCurrency(receipt.receivedAmount))
            printTwoColumns("Tiền thừa:", formatCurrency(receipt.changeAmount))

            // Footer
            printLine("")
            printRaw(EscPos.ALIGN_CENTER)
            printLine("Cảm ơn quý khách!")
            printLine("Hẹn gặp lại!")

            // Feed and cut
            feedLines(5)
            cutPaper()

            return@withContext PrinterResult.Success

        } catch (e: Exception) {
            Timber.e(e, "$TAG: Print receipt failed")
            return@withContext PrinterResult.Error(e.message ?: "Print failed")
        }
    }

    private fun formatCurrency(amount: Double): String {
        return String.format("%,.0f", amount)
    }
}

/**
 * Receipt data for Bluetooth printing
 */
data class BluetoothReceipt(
    val storeName: String,
    val storeAddress: String?,
    val storePhone: String?,
    val orderNumber: String,
    val dateTime: String,
    val tableName: String?,
    val staffName: String?,
    val items: List<BluetoothReceiptItem>,
    val subtotal: Double,
    val discount: Double,
    val vat: Double,
    val total: Double,
    val paymentMethod: String,
    val receivedAmount: Double,
    val changeAmount: Double
)

/**
 * Receipt item for Bluetooth printing
 */
data class BluetoothReceiptItem(
    val name: String,
    val quantity: Int,
    val unitPrice: Double,
    val totalPrice: Double
)
