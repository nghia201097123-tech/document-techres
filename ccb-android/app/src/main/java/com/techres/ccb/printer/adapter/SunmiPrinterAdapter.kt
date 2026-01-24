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

    // AIDL transaction codes for IWoyouService (woyou.aidlservice.jiuiv5)
    // Based on the actual AIDL method ordering for Sunmi T1/V1/V2 devices
    // Transaction code = IBinder.FIRST_CALL_TRANSACTION + method_index
    private object TransactionCodes {
        // Basic printer methods
        const val TRANSACTION_printerInit = IBinder.FIRST_CALL_TRANSACTION + 0           // printerInit(ICallback)
        const val TRANSACTION_printerSelfChecking = IBinder.FIRST_CALL_TRANSACTION + 1   // printerSelfChecking(ICallback)
        const val TRANSACTION_getPrinterSerialNo = IBinder.FIRST_CALL_TRANSACTION + 2    // getPrinterSerialNo()
        const val TRANSACTION_getPrinterVersion = IBinder.FIRST_CALL_TRANSACTION + 3     // getPrinterVersion()
        const val TRANSACTION_getPrinterModal = IBinder.FIRST_CALL_TRANSACTION + 4       // getPrinterModal()
        const val TRANSACTION_updatePrinterState = IBinder.FIRST_CALL_TRANSACTION + 5    // updatePrinterState()
        const val TRANSACTION_getPrinterPaper = IBinder.FIRST_CALL_TRANSACTION + 6       // getPrinterPaper()

        // Print methods
        const val TRANSACTION_sendRAWData = IBinder.FIRST_CALL_TRANSACTION + 7           // sendRAWData(byte[], ICallback)
        const val TRANSACTION_setFontName = IBinder.FIRST_CALL_TRANSACTION + 8           // setFontName(String, ICallback)
        const val TRANSACTION_setFontSize = IBinder.FIRST_CALL_TRANSACTION + 9           // setFontSize(float, ICallback)
        const val TRANSACTION_printText = IBinder.FIRST_CALL_TRANSACTION + 10            // printText(String, ICallback)
        const val TRANSACTION_printTextWithFont = IBinder.FIRST_CALL_TRANSACTION + 11    // printTextWithFont(...)
        const val TRANSACTION_setAlignment = IBinder.FIRST_CALL_TRANSACTION + 12         // setAlignment(int, ICallback)
        const val TRANSACTION_printBarCode = IBinder.FIRST_CALL_TRANSACTION + 13         // printBarCode(...)
        const val TRANSACTION_printQRCode = IBinder.FIRST_CALL_TRANSACTION + 14          // printQRCode(...)
        const val TRANSACTION_printOriginalText = IBinder.FIRST_CALL_TRANSACTION + 15    // printOriginalText(String, ICallback)
        const val TRANSACTION_printBitmap = IBinder.FIRST_CALL_TRANSACTION + 16          // printBitmap(Bitmap, ICallback)
        const val TRANSACTION_printBitmapCustom = IBinder.FIRST_CALL_TRANSACTION + 17    // printBitmapCustom(Bitmap, int, ICallback)
        const val TRANSACTION_printColumnsText = IBinder.FIRST_CALL_TRANSACTION + 18     // printColumnsText(...)
        const val TRANSACTION_printColumnsString = IBinder.FIRST_CALL_TRANSACTION + 19   // printColumnsString(...)

        // Paper control methods
        const val TRANSACTION_lineWrap = IBinder.FIRST_CALL_TRANSACTION + 22             // lineWrap(int, ICallback)
        const val TRANSACTION_feedPaper = IBinder.FIRST_CALL_TRANSACTION + 23            // feedPaper(int, ICallback)
        const val TRANSACTION_cutPaper = IBinder.FIRST_CALL_TRANSACTION + 24             // cutPaper(ICallback)
        const val TRANSACTION_getCutPaperTimes = IBinder.FIRST_CALL_TRANSACTION + 25     // getCutPaperTimes()
        const val TRANSACTION_openDrawer = IBinder.FIRST_CALL_TRANSACTION + 26           // openDrawer(ICallback)

        // Extended print methods
        const val TRANSACTION_printText2 = IBinder.FIRST_CALL_TRANSACTION + 27           // printText2(...)
        const val TRANSACTION_printBarCode2 = IBinder.FIRST_CALL_TRANSACTION + 28        // printBarCode2(...)
        const val TRANSACTION_printQRCode2 = IBinder.FIRST_CALL_TRANSACTION + 29         // printQRCode2(...)
        const val TRANSACTION_printBitmap2 = IBinder.FIRST_CALL_TRANSACTION + 30         // printBitmap2(...)

        // Buffer control
        const val TRANSACTION_enterPrinterBuffer = IBinder.FIRST_CALL_TRANSACTION + 31   // enterPrinterBuffer(boolean)
        const val TRANSACTION_exitPrinterBuffer = IBinder.FIRST_CALL_TRANSACTION + 32    // exitPrinterBuffer(boolean)
        const val TRANSACTION_commitPrinterBuffer = IBinder.FIRST_CALL_TRANSACTION + 33  // commitPrinterBuffer()
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
        // Kiểm tra nếu đã kết nối rồi thì không cần kết nối lại
        if (isConnected()) {
            Timber.d("$TAG: Already connected, skipping reconnection")
            return@withContext PrinterResult.Success
        }

        if (!isSunmiDevice() && !isSunmiServiceAvailable()) {
            _connectionState.value = ConnectionState.Error("Not a Sunmi device")
            return@withContext PrinterResult.Error("This is not a Sunmi device")
        }

        // Reset trạng thái trước khi kết nối mới (quan trọng khi app restart)
        printerService = null
        rawBinder = null
        serviceDescriptor = null
        isBound = false

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

                // Đợi một chút để service ổn định sau khi bind
                kotlinx.coroutines.delay(100)

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

    private suspend fun bindService(): Boolean {
        // Sử dụng withTimeout để tránh treo vô thời hạn
        return try {
            kotlinx.coroutines.withTimeout(5000L) { // 5 giây timeout
                suspendCancellableCoroutine { cont ->
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
            }
        } catch (e: kotlinx.coroutines.TimeoutCancellationException) {
            Timber.e("$TAG: Service bind timeout after 5 seconds")
            false
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
     * Initialize printer - gọi 1 lần trước khi bắt đầu gửi data
     * Dùng cho chunked printing để tránh reset buffer mỗi chunk
     */
    suspend fun initPrinter(): PrinterResult = withContext(Dispatchers.IO) {
        val service = printerService
        if (service is BinderProxyWrapper) {
            initPrinterViaTransact(service.binder)
            return@withContext PrinterResult.Success
        }
        // For local service, no need to init
        PrinterResult.Success
    }

    /**
     * Write raw data WITHOUT init and commit
     * Dùng cho chunked printing - gửi nhiều chunks liên tiếp
     * Phải gọi initPrinter() trước và commitBuffer() sau
     */
    suspend fun writeRawOnly(data: ByteArray): PrinterResult = withContext(Dispatchers.IO) {
        if (!isConnected()) {
            return@withContext PrinterResult.Error("Not connected")
        }

        try {
            val service = printerService ?: return@withContext PrinterResult.Error("Service not available")

            if (service is BinderProxyWrapper) {
                Timber.d("$TAG: writeRawOnly via AIDL transact()")
                return@withContext sendRawDataOnlyViaTransact(service.binder, data)
            }

            // For local service, use regular write
            return@withContext write(data)
        } catch (e: Exception) {
            Timber.e(e, "$TAG: writeRawOnly failed")
            return@withContext PrinterResult.Error(e.message ?: "Write failed")
        }
    }

    /**
     * Commit printer buffer - gọi 1 lần sau khi gửi xong tất cả data
     * Dùng cho chunked printing
     */
    suspend fun commitBuffer(): PrinterResult = withContext(Dispatchers.IO) {
        val service = printerService
        if (service is BinderProxyWrapper) {
            commitPrinterBufferViaTransact(service.binder)
            return@withContext PrinterResult.Success
        }
        // For local service, no need to commit
        PrinterResult.Success
    }

    /**
     * Feed paper by number of lines
     * Dùng để đẩy giấy sau khi in xong
     */
    suspend fun feedLines(lines: Int): PrinterResult = withContext(Dispatchers.IO) {
        val service = printerService
        if (service is BinderProxyWrapper) {
            lineWrapViaTransact(service.binder, lines)
            return@withContext PrinterResult.Success
        }
        // For local service, use feedPaper
        feedPaper(lines)
    }

    /**
     * Send raw data via AIDL transact() WITHOUT init and commit
     * Dùng cho chunked printing
     */
    private fun sendRawDataOnlyViaTransact(binder: IBinder, data: ByteArray): PrinterResult {
        val descriptor = serviceDescriptor ?: "woyou.aidlservice.jiuiv5.IWoyouService"

        val possibleTransactionCodes = listOf(
            TransactionCodes.TRANSACTION_sendRAWData,  // Standard position (7)
            IBinder.FIRST_CALL_TRANSACTION + 8,        // Alternative
            IBinder.FIRST_CALL_TRANSACTION + 6         // Alternative
        )

        var lastError: Exception? = null

        for (transactionCode in possibleTransactionCodes) {
            try {
                val dataParcel = Parcel.obtain()
                val replyParcel = Parcel.obtain()

                try {
                    dataParcel.writeInterfaceToken(descriptor)
                    dataParcel.writeByteArray(data)
                    dataParcel.writeStrongBinder(null) // callback

                    val success = binder.transact(transactionCode, dataParcel, replyParcel, 0)

                    if (success) {
                        replyParcel.readException()
                        Timber.d("$TAG: sendRawDataOnly transact($transactionCode) succeeded, ${data.size} bytes")
                        return PrinterResult.Success
                    }
                } finally {
                    dataParcel.recycle()
                    replyParcel.recycle()
                }
            } catch (e: Exception) {
                lastError = e
            }
        }

        return PrinterResult.Error("sendRawDataOnly failed: ${lastError?.message ?: "unknown error"}")
    }

    /**
     * TEST: Print simple text via AIDL transact to verify printing works
     * This bypasses ESC/POS and uses Sunmi's native printText method
     */
    suspend fun printTextTest(text: String): PrinterResult = withContext(Dispatchers.IO) {
        val service = printerService
        if (service !is BinderProxyWrapper) {
            return@withContext PrinterResult.Error("Not using BinderProxy")
        }

        val binder = service.binder
        val descriptor = serviceDescriptor ?: "woyou.aidlservice.jiuiv5.IWoyouService"

        try {
            // Init printer
            initPrinterViaTransact(binder)

            // Print text using printText transaction
            val dataParcel = Parcel.obtain()
            val replyParcel = Parcel.obtain()

            try {
                dataParcel.writeInterfaceToken(descriptor)
                dataParcel.writeString(text)
                dataParcel.writeStrongBinder(null) // callback

                val success = binder.transact(TransactionCodes.TRANSACTION_printText, dataParcel, replyParcel, 0)
                if (success) {
                    replyParcel.readException()
                    Timber.d("$TAG: printText transact succeeded")

                    // Line wrap and commit
                    lineWrapViaTransact(binder, 3)
                    commitPrinterBufferViaTransact(binder)

                    return@withContext PrinterResult.Success
                }
            } finally {
                dataParcel.recycle()
                replyParcel.recycle()
            }

            PrinterResult.Error("printText transact failed")
        } catch (e: Exception) {
            Timber.e(e, "$TAG: printTextTest failed")
            PrinterResult.Error(e.message ?: "Unknown error")
        }
    }

    /**
     * Send raw data via AIDL transact() mechanism for BinderProxy
     * This is used when we can't get a proper service interface
     */
    private fun sendRawDataViaTransact(binder: IBinder, data: ByteArray): PrinterResult {
        val descriptor = serviceDescriptor ?: "woyou.aidlservice.jiuiv5.IWoyouService"

        // Step 1: Initialize printer first
        Timber.d("$TAG: Initializing printer before sendRAWData")
        initPrinterViaTransact(binder)

        // Try multiple transaction codes for sendRAWData
        // Position 7 in IWoyouService.aidl (jiuiv5)
        val possibleTransactionCodes = listOf(
            TransactionCodes.TRANSACTION_sendRAWData,  // Standard position (7)
            IBinder.FIRST_CALL_TRANSACTION + 8,        // Alternative
            IBinder.FIRST_CALL_TRANSACTION + 6         // Alternative
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

                        // Chỉ commit buffer, không cần lineWrap (tránh đẩy giấy thừa)
                        commitPrinterBufferViaTransact(binder)

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

    /**
     * Đợi máy in xử lý xong buffer và trở về trạng thái idle
     *
     * QUAN TRỌNG: Gọi hàm này TRƯỚC khi cắt giấy để đảm bảo:
     * 1. Tất cả bitmap/text đã được in xong
     * 2. Buffer đã được flush hoàn toàn
     * 3. Tránh tình trạng footer bị cắt và in sang bill kế tiếp
     *
     * @param timeoutMs Thời gian tối đa đợi (mặc định 5 giây)
     * @param pollIntervalMs Khoảng cách giữa các lần kiểm tra (mặc định 150ms)
     * @return true nếu máy in đã idle, false nếu timeout
     */
    suspend fun waitForPrinterIdle(
        timeoutMs: Long = 5000,
        pollIntervalMs: Long = 150
    ): Boolean = withContext(Dispatchers.IO) {
        if (!isConnected()) {
            Timber.w("$TAG: waitForPrinterIdle - not connected")
            return@withContext false
        }

        val startTime = System.currentTimeMillis()
        var lastState = -1

        Timber.d("$TAG: waitForPrinterIdle started (timeout=${timeoutMs}ms)")

        while (System.currentTimeMillis() - startTime < timeoutMs) {
            try {
                // Gọi updatePrinterState để lấy trạng thái hiện tại
                val service = printerService
                val state = if (service is BinderProxyWrapper) {
                    // BinderProxy: sử dụng transact
                    getPrinterStateViaTransact(service.binder)
                } else {
                    // Local service: sử dụng reflection
                    val method = service?.javaClass?.getMethod("updatePrinterState")
                    method?.invoke(service) as? Int ?: -1
                }

                if (state != lastState) {
                    Timber.d("$TAG: Printer state changed: $lastState -> $state")
                    lastState = state
                }

                // State 1 = Normal/Idle - máy in đã sẵn sàng
                if (state == 1) {
                    val elapsed = System.currentTimeMillis() - startTime
                    Timber.d("$TAG: Printer is idle after ${elapsed}ms")
                    return@withContext true
                }

                // State 2 = Preparing (đang in) - tiếp tục đợi
                // Các state khác có thể là lỗi, nhưng vẫn tiếp tục đợi trong timeout

                kotlinx.coroutines.delay(pollIntervalMs)
            } catch (e: Exception) {
                Timber.w(e, "$TAG: Error checking printer state")
                kotlinx.coroutines.delay(pollIntervalMs)
            }
        }

        val elapsed = System.currentTimeMillis() - startTime
        Timber.w("$TAG: waitForPrinterIdle timeout after ${elapsed}ms (last state: $lastState)")
        return@withContext false
    }

    /**
     * Get printer state via AIDL transact for BinderProxy
     * Returns: 1=Normal, 2=Preparing, 3=Abnormal, 4=OutOfPaper, etc.
     */
    private fun getPrinterStateViaTransact(binder: IBinder): Int {
        val descriptor = serviceDescriptor ?: "woyou.aidlservice.jiuiv5.IWoyouService"

        try {
            val dataParcel = Parcel.obtain()
            val replyParcel = Parcel.obtain()

            try {
                dataParcel.writeInterfaceToken(descriptor)

                // updatePrinterState is typically FIRST_CALL_TRANSACTION + 1
                val success = binder.transact(IBinder.FIRST_CALL_TRANSACTION + 1, dataParcel, replyParcel, 0)

                if (success) {
                    replyParcel.readException()
                    return replyParcel.readInt()
                }
            } finally {
                dataParcel.recycle()
                replyParcel.recycle()
            }
        } catch (e: Exception) {
            Timber.w(e, "$TAG: getPrinterStateViaTransact failed")
        }

        return -1 // Unknown state
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
     *
     * LƯU Ý: Không gọi initPrinterViaTransact ở đây vì:
     * 1. Có thể gây ra khoảng trắng ở đầu mỗi bitmap
     * 2. Printer đã được init khi connect
     */
    private fun printBitmapViaTransact(binder: IBinder, bitmap: Bitmap): PrinterResult {
        val descriptor = serviceDescriptor ?: "woyou.aidlservice.jiuiv5.IWoyouService"

        // Không cần initPrinterViaTransact - đã init khi connect, tránh khoảng trắng đầu trang

        // Convert to grayscale for better thermal printing compatibility
        val grayscaleBitmap = convertToGrayscale(bitmap)
        Timber.d("$TAG: Converted bitmap to grayscale: ${grayscaleBitmap.width}x${grayscaleBitmap.height}")

        // Try printBitmapCustom with type=1 (binary mode) first - better for thermal printers
        // Then fall back to regular printBitmap
        val transactionAttempts = listOf(
            Pair(TransactionCodes.TRANSACTION_printBitmapCustom, 1), // type=1 binary mode
            Pair(TransactionCodes.TRANSACTION_printBitmapCustom, 0), // type=0 grayscale mode
            Pair(TransactionCodes.TRANSACTION_printBitmap, -1),      // regular printBitmap (no type)
        )

        var lastError: Exception? = null

        for ((transactionCode, bitmapType) in transactionAttempts) {
            try {
                val isCustom = bitmapType >= 0
                Timber.d("$TAG: Trying ${if (isCustom) "printBitmapCustom(type=$bitmapType)" else "printBitmap"} transact($transactionCode)")

                val dataParcel = Parcel.obtain()
                val replyParcel = Parcel.obtain()

                try {
                    dataParcel.writeInterfaceToken(descriptor)
                    // AIDL format: write "not null" flag (1) before Parcelable object
                    dataParcel.writeInt(1) // bitmap is not null
                    grayscaleBitmap.writeToParcel(dataParcel, 0)

                    if (isCustom) {
                        // printBitmapCustom has additional type parameter
                        dataParcel.writeInt(bitmapType)
                    }

                    // Write null for callback (ICallback)
                    dataParcel.writeStrongBinder(null)

                    val success = binder.transact(transactionCode, dataParcel, replyParcel, 0)

                    if (success) {
                        replyParcel.readException()
                        Timber.d("$TAG: printBitmap transact($transactionCode) succeeded")

                        // Commit buffer to execute printing (không cần lineWrap - gây đẩy giấy thừa)
                        commitPrinterBufferViaTransact(binder)

                        // Recycle grayscale bitmap if it's a new one
                        if (grayscaleBitmap != bitmap) {
                            grayscaleBitmap.recycle()
                        }

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

        // Recycle grayscale bitmap if it's a new one
        if (grayscaleBitmap != bitmap) {
            grayscaleBitmap.recycle()
        }

        return PrinterResult.Error("printBitmap transact failed: ${lastError?.message ?: "unknown error"}")
    }

    /**
     * Convert bitmap to grayscale for better thermal printer compatibility
     */
    private fun convertToGrayscale(src: Bitmap): Bitmap {
        val width = src.width
        val height = src.height

        val grayscale = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = android.graphics.Canvas(grayscale)

        val paint = android.graphics.Paint()
        val colorMatrix = android.graphics.ColorMatrix()
        colorMatrix.setSaturation(0f) // Convert to grayscale
        paint.colorFilter = android.graphics.ColorMatrixColorFilter(colorMatrix)

        canvas.drawBitmap(src, 0f, 0f, paint)

        return grayscale
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
     * Commit printer buffer via AIDL transact - Actually execute buffered print commands
     */
    private fun commitPrinterBufferViaTransact(binder: IBinder) {
        val descriptor = serviceDescriptor ?: "woyou.aidlservice.jiuiv5.IWoyouService"

        // Try multiple possible transaction codes for commitPrinterBuffer
        // Position 33 in IWoyouService.aidl (jiuiv5)
        val possibleCodes = listOf(
            TransactionCodes.TRANSACTION_commitPrinterBuffer,  // Position 33
            TransactionCodes.TRANSACTION_exitPrinterBuffer,    // Position 32
            IBinder.FIRST_CALL_TRANSACTION + 34,               // Alternative
            IBinder.FIRST_CALL_TRANSACTION + 35                // Alternative
        )

        for (code in possibleCodes) {
            try {
                val dataParcel = Parcel.obtain()
                val replyParcel = Parcel.obtain()

                try {
                    dataParcel.writeInterfaceToken(descriptor)
                    dataParcel.writeStrongBinder(null) // callback

                    val success = binder.transact(code, dataParcel, replyParcel, 0)
                    if (success) {
                        replyParcel.readException()
                        Timber.d("$TAG: commitPrinterBuffer transact($code) succeeded")
                        return
                    }
                } finally {
                    dataParcel.recycle()
                    replyParcel.recycle()
                }
            } catch (e: Exception) {
                Timber.d("$TAG: commitPrinterBuffer transact($code) failed: ${e.message}")
            }
        }
        Timber.w("$TAG: commitPrinterBuffer - all transaction codes failed")
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

            // Nếu dùng BinderProxy, dùng AIDL transact
            if (service is BinderProxyWrapper) {
                Timber.d("$TAG: Using AIDL transact for cutPaper")
                return@withContext cutPaperViaTransact(service.binder)
            }

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
     * Cắt giấy với nhiều phương pháp fallback
     * Được thiết kế đặc biệt cho Sunmi T1 với BinderProxy
     *
     * QUAN TRỌNG: Sunmi T1 có thể không hỗ trợ AIDL cutPaper transact,
     * nên sử dụng ESC/POS command qua sendRawDataViaTransact (có init/commit đầy đủ)
     */
    suspend fun cutPaperWithFallback(): PrinterResult = withContext(Dispatchers.IO) {
        if (!isConnected()) return@withContext PrinterResult.Error("Not connected")

        try {
            val service = printerService ?: return@withContext PrinterResult.Error("Service not available")

            if (service is BinderProxyWrapper) {
                val binder = service.binder
                Timber.d("$TAG: cutPaperWithFallback - using ESC/POS commands via sendRawData")

                // Feed thêm giấy trước khi cắt (5 dòng = ~10mm)
                // Để đảm bảo giấy đã qua vị trí dao cắt
                lineWrapViaTransact(binder, 5)

                // Tạo lệnh cắt ESC/POS với nhiều variant
                // GS V 66 n - Cut with feed (phổ biến nhất cho thermal printer)
                val cutWithFeedCmd = byteArrayOf(
                    0x1D, 0x56, 0x42, 0x03  // GS V 66 3 - Partial cut với feed 3 lines
                )

                // Gửi lệnh cắt qua sendRawDataViaTransact (có init/commit đầy đủ)
                Timber.d("$TAG: cutPaperWithFallback - sending GS V 66 3 via sendRawDataViaTransact")
                val result1 = sendRawDataViaTransact(binder, cutWithFeedCmd)
                if (result1 is PrinterResult.Success) {
                    Timber.d("$TAG: cutPaperWithFallback - GS V 66 succeeded")
                    return@withContext result1
                }

                // Thử GS V 0 - Full cut
                Timber.d("$TAG: cutPaperWithFallback - trying GS V 0 via sendRawDataViaTransact")
                val fullCutCmd = byteArrayOf(0x1D, 0x56, 0x00)
                val result2 = sendRawDataViaTransact(binder, fullCutCmd)
                if (result2 is PrinterResult.Success) {
                    Timber.d("$TAG: cutPaperWithFallback - GS V 0 succeeded")
                    return@withContext result2
                }

                // Thử GS V 1 - Partial cut
                Timber.d("$TAG: cutPaperWithFallback - trying GS V 1 via sendRawDataViaTransact")
                val partialCutCmd = byteArrayOf(0x1D, 0x56, 0x01)
                val result3 = sendRawDataViaTransact(binder, partialCutCmd)
                if (result3 is PrinterResult.Success) {
                    Timber.d("$TAG: cutPaperWithFallback - GS V 1 succeeded")
                    return@withContext result3
                }

                // Thử ESC m - Cut paper (một số máy cũ)
                Timber.d("$TAG: cutPaperWithFallback - trying ESC m via sendRawDataViaTransact")
                val escMCutCmd = byteArrayOf(0x1B, 0x6D)
                val result4 = sendRawDataViaTransact(binder, escMCutCmd)
                if (result4 is PrinterResult.Success) {
                    Timber.d("$TAG: cutPaperWithFallback - ESC m succeeded")
                    return@withContext result4
                }

                // Cuối cùng thử AIDL transact (có thể không hoạt động nhưng thử)
                Timber.d("$TAG: cutPaperWithFallback - trying AIDL cutPaper transact")
                val aidlResult = cutPaperViaTransact(binder)

                Timber.d("$TAG: cutPaperWithFallback - completed, last result: $aidlResult")
                return@withContext aidlResult
            }

            // Non-BinderProxy: use regular cutPaper
            return@withContext cutPaper()
        } catch (e: Exception) {
            Timber.e(e, "$TAG: cutPaperWithFallback failed")
            return@withContext PrinterResult.Error(e.message ?: "Cut paper failed")
        }
    }

    /**
     * Cut paper via AIDL transact for BinderProxy
     * Tries multiple transaction codes to find the correct one for the device
     */
    private fun cutPaperViaTransact(binder: IBinder): PrinterResult {
        val descriptor = serviceDescriptor ?: "woyou.aidlservice.jiuiv5.IWoyouService"

        // Try multiple possible transaction codes for cutPaper
        // Different Sunmi firmware versions may have different method ordering
        val possibleCodes = listOf(
            TransactionCodes.TRANSACTION_cutPaper,     // Position 24
            IBinder.FIRST_CALL_TRANSACTION + 25,       // Alternative position
            IBinder.FIRST_CALL_TRANSACTION + 23,       // Alternative position
            IBinder.FIRST_CALL_TRANSACTION + 26,       // Alternative position
            IBinder.FIRST_CALL_TRANSACTION + 20,       // Alternative position
            IBinder.FIRST_CALL_TRANSACTION + 21        // Alternative position
        )

        var lastError: Exception? = null

        for (code in possibleCodes) {
            try {
                val dataParcel = Parcel.obtain()
                val replyParcel = Parcel.obtain()

                try {
                    dataParcel.writeInterfaceToken(descriptor)
                    dataParcel.writeStrongBinder(null) // callback

                    val success = binder.transact(code, dataParcel, replyParcel, 0)

                    if (success) {
                        replyParcel.readException()
                        Timber.d("$TAG: cutPaper transact($code) succeeded")
                        return PrinterResult.Success
                    } else {
                        Timber.d("$TAG: cutPaper transact($code) returned false")
                    }
                } finally {
                    dataParcel.recycle()
                    replyParcel.recycle()
                }
            } catch (e: Exception) {
                Timber.d("$TAG: cutPaper transact($code) failed: ${e.message}")
                lastError = e
            }
        }

        // If all AIDL transact attempts fail, try ESC/POS cut command via sendRAWData
        Timber.d("$TAG: All cutPaper transact codes failed, trying ESC/POS cut command")
        try {
            // GS V 66 n - Cut with feed (n = 0 for minimal feed before cut)
            val cutCommand = byteArrayOf(0x1D, 0x56, 0x42, 0x00)
            val result = sendRawDataViaTransact(binder, cutCommand)
            if (result is PrinterResult.Success) {
                Timber.d("$TAG: ESC/POS cut command succeeded")
                return result
            }
        } catch (e: Exception) {
            Timber.d("$TAG: ESC/POS cut command failed: ${e.message}")
        }

        return PrinterResult.Error("cutPaper transact failed: ${lastError?.message ?: "unknown error"}")
    }

    /**
     * Feed giấy và cắt trong MỘT lệnh ESC/POS duy nhất
     *
     * QUAN TRỌNG: Method này giải quyết vấn đề footer bị cắt trên Sunmi T1
     * Thay vì gọi riêng feedLines() rồi cutPaper() (2 AIDL calls riêng biệt có timing issue),
     * method này gửi tất cả commands trong 1 buffer duy nhất qua sendRAWData()
     *
     * Flow giống TCP/IP printer: Build buffer → Single write → Printer executes in sequence
     *
     * @param feedLines Số dòng feed trước khi cắt (default 20 dòng = ~50mm cho Sunmi T1)
     * @param partial true = partial cut, false = full cut
     */
    suspend fun feedAndCutPaper(feedLines: Int = 20, partial: Boolean = true): PrinterResult = withContext(Dispatchers.IO) {
        if (!isConnected()) return@withContext PrinterResult.Error("Not connected")

        try {
            Timber.d("$TAG: feedAndCutPaper - feedLines=$feedLines, partial=$partial")

            // Build ESC/POS commands buffer
            val buffer = java.io.ByteArrayOutputStream()

            // 1. Reset line spacing về default để đảm bảo feed đúng khoảng cách
            buffer.write(byteArrayOf(0x1B, 0x32)) // ESC 2 - Default line spacing

            // 2. Feed giấy n dòng
            // ESC d n - Feed n lines
            buffer.write(byteArrayOf(0x1B, 0x64, feedLines.toByte()))

            // 3. Cut giấy
            // GS V 66 n - Feed n lines then cut (atomic command)
            // Thêm 3 dòng extra trong lệnh cut để đảm bảo
            buffer.write(byteArrayOf(0x1D, 0x56, 0x42, 0x03))

            val commands = buffer.toByteArray()
            Timber.d("$TAG: Sending ${commands.size} bytes ESC/POS feed+cut commands")

            // Gửi qua sendRAWData - single atomic operation
            return@withContext write(commands)
        } catch (e: Exception) {
            Timber.e(e, "$TAG: feedAndCutPaper failed")
            return@withContext PrinterResult.Error(e.message ?: "Feed and cut failed")
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
