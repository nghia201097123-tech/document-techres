package com.techres.ccb.printer.adapter

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.os.Build
import android.os.IBinder
import android.os.Parcel
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

    // Raw IBinder reference for AIDL transact calls when using BinderProxy
    private var rawBinder: IBinder? = null
    private var serviceDescriptor: String? = null

    // AIDL transaction codes for IWoyouService (based on Sunmi AIDL definition order)
    // These are calculated as IBinder.FIRST_CALL_TRANSACTION + method_index
    // Note: Transaction codes may vary between Sunmi firmware versions
    private object TransactionCodes {
        const val TRANSACTION_printerInit = IBinder.FIRST_CALL_TRANSACTION + 0
        const val TRANSACTION_printerSelfChecking = IBinder.FIRST_CALL_TRANSACTION + 1
        const val TRANSACTION_getPrinterSerialNo = IBinder.FIRST_CALL_TRANSACTION + 2
        const val TRANSACTION_getPrinterVersion = IBinder.FIRST_CALL_TRANSACTION + 3
        const val TRANSACTION_getPrinterModal = IBinder.FIRST_CALL_TRANSACTION + 4
        const val TRANSACTION_updatePrinterState = IBinder.FIRST_CALL_TRANSACTION + 5
        const val TRANSACTION_setAlignment = IBinder.FIRST_CALL_TRANSACTION + 14
        const val TRANSACTION_printOriginalText = IBinder.FIRST_CALL_TRANSACTION + 17
        const val TRANSACTION_printBitmap = IBinder.FIRST_CALL_TRANSACTION + 20
        const val TRANSACTION_printBitmapCustom = IBinder.FIRST_CALL_TRANSACTION + 21
        const val TRANSACTION_lineWrap = IBinder.FIRST_CALL_TRANSACTION + 25
        const val TRANSACTION_cutPaper = IBinder.FIRST_CALL_TRANSACTION + 26
        const val TRANSACTION_sendRAWData = IBinder.FIRST_CALL_TRANSACTION + 27
        const val TRANSACTION_openDrawer = IBinder.FIRST_CALL_TRANSACTION + 28
    }

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
                Timber.d("$TAG: Service connected, converting IBinder to interface...")

                // Store raw binder for AIDL transact() calls
                rawBinder = service

                // Try to get interface descriptor for proper AIDL communication
                try {
                    serviceDescriptor = service?.interfaceDescriptor
                    Timber.d("$TAG: Service descriptor: $serviceDescriptor")
                } catch (e: Exception) {
                    Timber.w(e, "$TAG: Failed to get interface descriptor")
                }

                // Convert IBinder to IWoyouService interface using reflection
                val serviceInterface = convertBinderToInterface(service)
                if (serviceInterface != null) {
                    printerService = serviceInterface
                    isBound = true
                    Timber.d("$TAG: Service interface obtained successfully, class: ${serviceInterface.javaClass.name}")
                    if (cont.isActive) {
                        cont.resume(true)
                    }
                } else {
                    Timber.e("$TAG: Failed to convert IBinder to service interface")
                    if (cont.isActive) {
                        cont.resume(false)
                    }
                }
            }

            override fun onServiceDisconnected(name: ComponentName?) {
                Timber.d("$TAG: Service disconnected")
                printerService = null
                rawBinder = null
                serviceDescriptor = null
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

    /**
     * Convert IBinder to IWoyouService interface using reflection
     * Sunmi AIDL: IWoyouService.Stub.asInterface(IBinder)
     */
    private fun convertBinderToInterface(binder: IBinder?): Any? {
        if (binder == null) return null

        Timber.d("$TAG: Converting IBinder to interface")
        Timber.d("$TAG: IBinder class: ${binder.javaClass.name}")
        Timber.d("$TAG: IBinder interfaces: ${binder.javaClass.interfaces.map { it.name }}")

        // Danh sách các class name có thể của Sunmi service
        val possibleClasses = listOf(
            "woyou.aidlservice.jiuiv5.IWoyouService",
            "com.sunmi.peripheral.printer.InnerPrinterService",
            "com.sunmi.peripheral.printer.SunmiPrinterService",
            "com.sunmi.peripheral.printer.IInnerPrinter"
        )

        // Danh sách descriptor có thể của Sunmi AIDL
        val possibleDescriptors = listOf(
            "woyou.aidlservice.jiuiv5.IWoyouService",
            "com.sunmi.peripheral.printer.IInnerPrinter",
            "com.sunmi.peripheral.printer.InnerPrinterService"
        )

        // Approach 1: Thử queryLocalInterface với các descriptors khác nhau
        for (descriptor in possibleDescriptors) {
            try {
                val localInterface = binder.queryLocalInterface(descriptor)
                if (localInterface != null) {
                    Timber.d("$TAG: Got local interface from queryLocalInterface with descriptor: $descriptor")
                    Timber.d("$TAG: Local interface class: ${localInterface.javaClass.name}")
                    return localInterface
                }
            } catch (e: Exception) {
                Timber.d("$TAG: queryLocalInterface($descriptor) failed: ${e.message}")
            }
        }

        // Approach 2: Thử Stub.asInterface với các class khác nhau
        for (className in possibleClasses) {
            try {
                // Thử load class
                val serviceClass = Class.forName(className)
                Timber.d("$TAG: Found class: $className")

                // Tìm inner class Stub
                val stubClass = try {
                    serviceClass.classes.find { it.simpleName == "Stub" }
                        ?: Class.forName("$className\$Stub")
                } catch (e: ClassNotFoundException) {
                    Timber.d("$TAG: Stub class not found for $className")
                    continue
                }

                // Gọi asInterface method
                val asInterfaceMethod = stubClass.getMethod("asInterface", IBinder::class.java)
                val result = asInterfaceMethod.invoke(null, binder)

                if (result != null) {
                    Timber.d("$TAG: Successfully converted IBinder using $className.Stub.asInterface")
                    Timber.d("$TAG: Result class: ${result.javaClass.name}")
                    return result
                }
            } catch (e: ClassNotFoundException) {
                Timber.d("$TAG: Class not found: $className")
            } catch (e: Exception) {
                Timber.d("$TAG: Failed to convert using $className: ${e.message}")
            }
        }

        // Approach 3: Kiểm tra IBinder trực tiếp có method sendRAWData không
        try {
            val methods = binder.javaClass.methods
            val printMethods = methods.filter {
                it.name.contains("print", ignoreCase = true) ||
                it.name.contains("RAW", ignoreCase = true) ||
                it.name.contains("send", ignoreCase = true)
            }
            Timber.d("$TAG: IBinder print-related methods: ${printMethods.map { it.name }}")

            val hasSendRawData = methods.any { it.name == "sendRAWData" }
            if (hasSendRawData) {
                Timber.d("$TAG: IBinder already has sendRAWData method, using directly")
                return binder
            }
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error checking IBinder methods")
        }

        // Approach 4: Check parent classes và interfaces của IBinder
        try {
            var currentClass: Class<*>? = binder.javaClass
            while (currentClass != null) {
                Timber.d("$TAG: Checking class hierarchy: ${currentClass.name}")

                // Check tất cả interfaces của class này
                for (iface in currentClass.interfaces) {
                    Timber.d("$TAG: Interface: ${iface.name}")

                    // Nếu là interface của Sunmi, binder có thể đã implement đúng
                    if (iface.name.contains("IWoyouService") ||
                        iface.name.contains("InnerPrinter") ||
                        iface.name.contains("SunmiPrinter")) {
                        Timber.d("$TAG: Found Sunmi interface, using binder directly")
                        return binder
                    }
                }

                currentClass = currentClass.superclass
            }
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error checking class hierarchy")
        }

        // Approach 5: Nếu là BinderProxy, tạo wrapper để sử dụng transact()
        if (binder.javaClass.name == "android.os.BinderProxy") {
            Timber.d("$TAG: Detected BinderProxy, will use AIDL transact() for communication")
            // Return a marker object that indicates we should use transact()
            return BinderProxyWrapper(binder)
        }

        // Approach 6: Nếu tất cả fail, vẫn return binder để thử
        Timber.w("$TAG: Could not find specific interface, returning raw binder")
        return binder
    }

    /**
     * Wrapper class for BinderProxy to indicate we need to use transact() method
     */
    private class BinderProxyWrapper(val binder: IBinder)

    override suspend fun disconnect(): PrinterResult = withContext(Dispatchers.Main) {
        try {
            serviceConnection?.let { context.unbindService(it) }
        } catch (e: Exception) {
            Timber.w(e, "$TAG: Error unbinding service")
        }
        printerService = null
        serviceConnection = null
        rawBinder = null
        serviceDescriptor = null
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
            val service = printerService ?: return@withContext PrinterResult.Error("Service not available")

            // Check if we're using BinderProxyWrapper (remote service via AIDL)
            if (service is BinderProxyWrapper) {
                Timber.d("$TAG: Using AIDL transact() for BinderProxy")
                return@withContext sendRawDataViaTransact(service.binder, data)
            }

            // Log service type để debug
            Timber.d("$TAG: Service class: ${service.javaClass.name}")
            Timber.d("$TAG: Service interfaces: ${service.javaClass.interfaces.map { it.name }}")

            val methods = service.javaClass.methods
            Timber.d("$TAG: Available methods: ${methods.filter { it.name.contains("RAW", ignoreCase = true) || it.name.contains("print", ignoreCase = true) || it.name.contains("send", ignoreCase = true) }.map { "${it.name}(${it.parameterTypes.map { p -> p.simpleName }.joinToString(", ")})" }}")

            // Approach 1: Tìm sendRAWData với byte[] và callback
            val sendRawMethod = methods.find { method ->
                method.name == "sendRAWData" &&
                method.parameterTypes.isNotEmpty() &&
                method.parameterTypes[0] == ByteArray::class.java
            }

            if (sendRawMethod != null) {
                Timber.d("$TAG: Found sendRAWData: ${sendRawMethod.parameterTypes.map { it.simpleName }}")
                when (sendRawMethod.parameterTypes.size) {
                    1 -> sendRawMethod.invoke(service, data)
                    2 -> sendRawMethod.invoke(service, data, null)
                    else -> sendRawMethod.invoke(service, data, null)
                }
                return@withContext PrinterResult.Success
            }

            // Approach 2: thử printRawData
            val printRawMethod = methods.find { method ->
                method.name == "printRawData" &&
                method.parameterTypes.isNotEmpty() &&
                method.parameterTypes[0] == ByteArray::class.java
            }

            if (printRawMethod != null) {
                Timber.d("$TAG: Found printRawData")
                when (printRawMethod.parameterTypes.size) {
                    1 -> printRawMethod.invoke(service, data)
                    2 -> printRawMethod.invoke(service, data, null)
                    else -> printRawMethod.invoke(service, data, null)
                }
                return@withContext PrinterResult.Success
            }

            // Approach 3: Thử printerInit trước rồi printText
            val initMethod = methods.find { it.name == "printerInit" }
            if (initMethod != null) {
                Timber.d("$TAG: Calling printerInit first")
                try {
                    when (initMethod.parameterTypes.size) {
                        0 -> initMethod.invoke(service)
                        1 -> initMethod.invoke(service, null)
                        else -> initMethod.invoke(service, null)
                    }
                } catch (e: Exception) {
                    Timber.w(e, "$TAG: printerInit failed, continuing anyway")
                }
            }

            // Approach 4: Convert to text và dùng printOriginalText (for ESC/POS)
            val printOriginalMethod = methods.find { method ->
                method.name == "printOriginalText" &&
                method.parameterTypes.isNotEmpty()
            }
            if (printOriginalMethod != null) {
                Timber.d("$TAG: Found printOriginalText, converting data")
                val text = String(data, Charsets.ISO_8859_1)
                when (printOriginalMethod.parameterTypes.size) {
                    1 -> printOriginalMethod.invoke(service, text)
                    2 -> printOriginalMethod.invoke(service, text, null)
                    else -> printOriginalMethod.invoke(service, text, null)
                }
                return@withContext PrinterResult.Success
            }

            // Approach 5: Thử sendRAWData qua declared methods (bao gồm protected/private)
            val declaredMethods = service.javaClass.declaredMethods
            val declaredRawMethod = declaredMethods.find { it.name == "sendRAWData" }
            if (declaredRawMethod != null) {
                Timber.d("$TAG: Found sendRAWData in declared methods")
                declaredRawMethod.isAccessible = true
                when (declaredRawMethod.parameterTypes.size) {
                    1 -> declaredRawMethod.invoke(service, data)
                    2 -> declaredRawMethod.invoke(service, data, null)
                    else -> declaredRawMethod.invoke(service, data, null)
                }
                return@withContext PrinterResult.Success
            }

            // Approach 6: Fallback to AIDL transact if we have raw binder
            val binder = rawBinder
            if (binder != null) {
                Timber.d("$TAG: Falling back to AIDL transact()")
                return@withContext sendRawDataViaTransact(binder, data)
            }

            // Log tất cả methods để debug
            Timber.e("$TAG: Cannot find sendRAWData. All methods: ${methods.map { it.name }.distinct().sorted()}")

            return@withContext PrinterResult.Error("Cannot find sendRAWData method. Service class: ${service.javaClass.name}")
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Write failed")
            return@withContext PrinterResult.Error(e.message ?: "Write failed")
        }
    }

    /**
     * Send raw data via AIDL transact() mechanism for BinderProxy
     * This is used when we can't get a proper service interface
     */
    private fun sendRawDataViaTransact(binder: IBinder, data: ByteArray): PrinterResult {
        val descriptor = serviceDescriptor ?: "woyou.aidlservice.jiuiv5.IWoyouService"

        // Try multiple transaction codes for sendRAWData
        // Different Sunmi firmware versions may use different codes
        val possibleTransactionCodes = listOf(
            TransactionCodes.TRANSACTION_sendRAWData,  // Standard position
            IBinder.FIRST_CALL_TRANSACTION + 26,       // Alternative position
            IBinder.FIRST_CALL_TRANSACTION + 28,       // Alternative position
            IBinder.FIRST_CALL_TRANSACTION + 30,       // Alternative position
            IBinder.FIRST_CALL_TRANSACTION + 32,       // Alternative position
            IBinder.FIRST_CALL_TRANSACTION + 24,       // Alternative position
            IBinder.FIRST_CALL_TRANSACTION + 25        // Alternative position
        )

        var lastError: Exception? = null

        for (transactionCode in possibleTransactionCodes) {
            try {
                Timber.d("$TAG: Trying transact with code $transactionCode")

                val dataParcel = Parcel.obtain()
                val replyParcel = Parcel.obtain()

                try {
                    dataParcel.writeInterfaceToken(descriptor)
                    dataParcel.writeByteArray(data)
                    // Write null for callback (ICallback)
                    dataParcel.writeStrongBinder(null)

                    val success = binder.transact(transactionCode, dataParcel, replyParcel, 0)

                    if (success) {
                        replyParcel.readException()
                        Timber.d("$TAG: transact($transactionCode) succeeded")
                        return PrinterResult.Success
                    } else {
                        Timber.d("$TAG: transact($transactionCode) returned false")
                    }
                } finally {
                    dataParcel.recycle()
                    replyParcel.recycle()
                }
            } catch (e: SecurityException) {
                Timber.d("$TAG: transact($transactionCode) security exception: ${e.message}")
                lastError = e
            } catch (e: RemoteException) {
                Timber.d("$TAG: transact($transactionCode) remote exception: ${e.message}")
                lastError = e
            } catch (e: Exception) {
                Timber.d("$TAG: transact($transactionCode) failed: ${e.message}")
                lastError = e
            }
        }

        // If sendRAWData fails, try printOriginalText as fallback
        Timber.d("$TAG: sendRAWData transact failed, trying printOriginalText")
        try {
            val printOriginalResult = printOriginalTextViaTransact(binder, data)
            if (printOriginalResult is PrinterResult.Success) {
                return printOriginalResult
            }
        } catch (e: Exception) {
            Timber.d("$TAG: printOriginalText fallback also failed: ${e.message}")
        }

        return PrinterResult.Error("AIDL transact failed: ${lastError?.message ?: "unknown error"}")
    }

    /**
     * Fallback method: Print using printOriginalText via transact
     */
    private fun printOriginalTextViaTransact(binder: IBinder, data: ByteArray): PrinterResult {
        val descriptor = serviceDescriptor ?: "woyou.aidlservice.jiuiv5.IWoyouService"

        // Convert bytes to string for printOriginalText
        val text = String(data, Charsets.ISO_8859_1)

        val possibleTransactionCodes = listOf(
            TransactionCodes.TRANSACTION_printOriginalText,
            IBinder.FIRST_CALL_TRANSACTION + 16,
            IBinder.FIRST_CALL_TRANSACTION + 18,
            IBinder.FIRST_CALL_TRANSACTION + 19,
            IBinder.FIRST_CALL_TRANSACTION + 20
        )

        for (transactionCode in possibleTransactionCodes) {
            try {
                Timber.d("$TAG: Trying printOriginalText transact with code $transactionCode")

                val dataParcel = Parcel.obtain()
                val replyParcel = Parcel.obtain()

                try {
                    dataParcel.writeInterfaceToken(descriptor)
                    dataParcel.writeString(text)
                    // Write null for callback
                    dataParcel.writeStrongBinder(null)

                    val success = binder.transact(transactionCode, dataParcel, replyParcel, 0)

                    if (success) {
                        replyParcel.readException()
                        Timber.d("$TAG: printOriginalText transact($transactionCode) succeeded")
                        return PrinterResult.Success
                    }
                } finally {
                    dataParcel.recycle()
                    replyParcel.recycle()
                }
            } catch (e: Exception) {
                Timber.d("$TAG: printOriginalText transact($transactionCode) failed: ${e.message}")
            }
        }

        return PrinterResult.Error("printOriginalText transact failed")
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
     * In hình ảnh - Hỗ trợ cả reflection và AIDL transact cho BinderProxy
     */
    suspend fun printBitmap(bitmap: Bitmap): PrinterResult = withContext(Dispatchers.IO) {
        if (!isConnected()) return@withContext PrinterResult.Error("Not connected")

        try {
            val service = printerService ?: return@withContext PrinterResult.Error("Service not available")

            // Check if we're using BinderProxyWrapper (remote service via AIDL)
            if (service is BinderProxyWrapper) {
                Timber.d("$TAG: Using AIDL transact() for printBitmap")
                return@withContext printBitmapViaTransact(service.binder, bitmap)
            }

            // Try reflection for local service
            val method = service.javaClass.methods.find {
                it.name == "printBitmap" && it.parameterTypes.isNotEmpty() &&
                it.parameterTypes[0] == Bitmap::class.java
            }

            if (method != null) {
                when (method.parameterTypes.size) {
                    1 -> method.invoke(service, bitmap)
                    2 -> method.invoke(service, bitmap, null)
                    else -> method.invoke(service, bitmap, null)
                }
                return@withContext PrinterResult.Success
            }

            // Fallback to AIDL transact if reflection fails
            val binder = rawBinder
            if (binder != null) {
                Timber.d("$TAG: Reflection failed, falling back to AIDL transact for printBitmap")
                return@withContext printBitmapViaTransact(binder, bitmap)
            }

            return@withContext PrinterResult.Error("Cannot find printBitmap method")
        } catch (e: Exception) {
            Timber.e(e, "$TAG: printBitmap failed")
            return@withContext PrinterResult.Error(e.message ?: "Print bitmap failed")
        }
    }

    /**
     * Print bitmap via AIDL transact() for BinderProxy
     * Sunmi printBitmap(Bitmap bitmap, ICallback callback)
     */
    private fun printBitmapViaTransact(binder: IBinder, bitmap: Bitmap): PrinterResult {
        val descriptor = serviceDescriptor ?: "woyou.aidlservice.jiuiv5.IWoyouService"

        // First, initialize printer
        initPrinterViaTransact(binder)

        // Try multiple transaction codes for printBitmap
        val possibleTransactionCodes = listOf(
            TransactionCodes.TRANSACTION_printBitmap,     // Standard position (20)
            TransactionCodes.TRANSACTION_printBitmapCustom, // Custom position (21)
            IBinder.FIRST_CALL_TRANSACTION + 19,          // Alternative
            IBinder.FIRST_CALL_TRANSACTION + 22,          // Alternative
            IBinder.FIRST_CALL_TRANSACTION + 23           // Alternative
        )

        var lastError: Exception? = null

        for (transactionCode in possibleTransactionCodes) {
            try {
                Timber.d("$TAG: Trying printBitmap transact with code $transactionCode")

                val dataParcel = Parcel.obtain()
                val replyParcel = Parcel.obtain()

                try {
                    dataParcel.writeInterfaceToken(descriptor)
                    // Write bitmap to parcel
                    bitmap.writeToParcel(dataParcel, 0)
                    // Write null for callback (ICallback)
                    dataParcel.writeStrongBinder(null)

                    val success = binder.transact(transactionCode, dataParcel, replyParcel, 0)

                    if (success) {
                        replyParcel.readException()
                        Timber.d("$TAG: printBitmap transact($transactionCode) succeeded")

                        // Add line wrap after printing
                        lineWrapViaTransact(binder, 3)

                        return PrinterResult.Success
                    } else {
                        Timber.d("$TAG: printBitmap transact($transactionCode) returned false")
                    }
                } finally {
                    dataParcel.recycle()
                    replyParcel.recycle()
                }
            } catch (e: SecurityException) {
                Timber.d("$TAG: printBitmap transact($transactionCode) security exception: ${e.message}")
                lastError = e
            } catch (e: RemoteException) {
                Timber.d("$TAG: printBitmap transact($transactionCode) remote exception: ${e.message}")
                lastError = e
            } catch (e: Exception) {
                Timber.d("$TAG: printBitmap transact($transactionCode) failed: ${e.message}")
                lastError = e
            }
        }

        return PrinterResult.Error("printBitmap transact failed: ${lastError?.message ?: "unknown error"}")
    }

    /**
     * Initialize printer via AIDL transact
     */
    private fun initPrinterViaTransact(binder: IBinder) {
        val descriptor = serviceDescriptor ?: "woyou.aidlservice.jiuiv5.IWoyouService"

        try {
            val dataParcel = Parcel.obtain()
            val replyParcel = Parcel.obtain()

            try {
                dataParcel.writeInterfaceToken(descriptor)
                dataParcel.writeStrongBinder(null) // callback

                val success = binder.transact(TransactionCodes.TRANSACTION_printerInit, dataParcel, replyParcel, 0)
                if (success) {
                    replyParcel.readException()
                    Timber.d("$TAG: printerInit transact succeeded")
                }
            } finally {
                dataParcel.recycle()
                replyParcel.recycle()
            }
        } catch (e: Exception) {
            Timber.w(e, "$TAG: printerInit transact failed, continuing anyway")
        }
    }

    /**
     * Line wrap via AIDL transact
     */
    private fun lineWrapViaTransact(binder: IBinder, lines: Int) {
        val descriptor = serviceDescriptor ?: "woyou.aidlservice.jiuiv5.IWoyouService"

        try {
            val dataParcel = Parcel.obtain()
            val replyParcel = Parcel.obtain()

            try {
                dataParcel.writeInterfaceToken(descriptor)
                dataParcel.writeInt(lines)
                dataParcel.writeStrongBinder(null) // callback

                val success = binder.transact(TransactionCodes.TRANSACTION_lineWrap, dataParcel, replyParcel, 0)
                if (success) {
                    replyParcel.readException()
                    Timber.d("$TAG: lineWrap transact succeeded")
                }
            } finally {
                dataParcel.recycle()
                replyParcel.recycle()
            }
        } catch (e: Exception) {
            Timber.w(e, "$TAG: lineWrap transact failed")
        }
    }

    /**
     * Check if using BinderProxy (remote AIDL service)
     */
    fun isUsingBinderProxy(): Boolean {
        return printerService is BinderProxyWrapper
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
        rawBinder = null
        serviceDescriptor = null
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
