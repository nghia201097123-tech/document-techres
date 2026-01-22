package com.techres.ccb.data.socket

import io.socket.client.IO
import io.socket.client.Socket
import io.socket.emitter.Emitter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.json.JSONObject
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Payment success event data
 */
data class PaymentSuccessEvent(
    val orderId: String,
    val orderCode: Long,
    val amount: Long,
    val transactionRef: String,
    val transactionDateTime: String,
    val counterAccountName: String?,
    val counterAccountNumber: String?,
    val counterAccountBankName: String?
)

/**
 * Payment cancelled event data
 */
data class PaymentCancelledEvent(
    val orderId: String,
    val orderCode: Long,
    val reason: String?
)

/**
 * Payment expired event data
 */
data class PaymentExpiredEvent(
    val orderCode: Long
)

/**
 * Socket connection state
 */
enum class SocketConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    ERROR
}

/**
 * Manages Socket.IO connection for real-time payment notifications
 */
@Singleton
class PaymentSocketManager @Inject constructor() {

    private var socket: Socket? = null
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _connectionState = MutableStateFlow(SocketConnectionState.DISCONNECTED)
    val connectionState: StateFlow<SocketConnectionState> = _connectionState.asStateFlow()

    private val _paymentSuccess = MutableSharedFlow<PaymentSuccessEvent>()
    val paymentSuccess: SharedFlow<PaymentSuccessEvent> = _paymentSuccess.asSharedFlow()

    private val _paymentCancelled = MutableSharedFlow<PaymentCancelledEvent>()
    val paymentCancelled: SharedFlow<PaymentCancelledEvent> = _paymentCancelled.asSharedFlow()

    private val _paymentExpired = MutableSharedFlow<PaymentExpiredEvent>()
    val paymentExpired: SharedFlow<PaymentExpiredEvent> = _paymentExpired.asSharedFlow()

    private var currentBranchId: String? = null
    private var currentDeviceId: String? = null

    /**
     * Connect to the Socket.IO server
     * @param serverUrl The server URL (e.g., "http://192.168.1.62:3007")
     * @param branchId The branch ID to join
     * @param deviceId The device ID
     */
    fun connect(serverUrl: String, branchId: String, deviceId: String) {
        if (socket?.connected() == true && currentBranchId == branchId) {
            Timber.d("════════════════════════════════════════════════════════════")
            Timber.d("📡 [SOCKET] Already connected to branch $branchId")
            Timber.d("════════════════════════════════════════════════════════════")
            return
        }

        disconnect()

        try {
            _connectionState.value = SocketConnectionState.CONNECTING
            currentBranchId = branchId
            currentDeviceId = deviceId

            Timber.d("════════════════════════════════════════════════════════════")
            Timber.d("📡 [SOCKET] Connecting to Socket.IO server...")
            Timber.d("   🔗 URL: $serverUrl")
            Timber.d("   🏢 Branch: $branchId")
            Timber.d("   📱 Device: $deviceId")
            Timber.d("════════════════════════════════════════════════════════════")

            val options = IO.Options().apply {
                transports = arrayOf("websocket", "polling")
                reconnection = true
                reconnectionAttempts = 10
                reconnectionDelay = 1000
                reconnectionDelayMax = 5000
                timeout = 20000
            }

            // Connect to socket-service (no namespace, root path)
            socket = IO.socket(serverUrl, options).apply {
                // Connection events
                on(Socket.EVENT_CONNECT, onConnect)
                on(Socket.EVENT_DISCONNECT, onDisconnect)
                on(Socket.EVENT_CONNECT_ERROR, onConnectError)

                // Payment events
                on("payment:success", onPaymentSuccess)
                on("payment:cancelled", onPaymentCancelled)
                on("payment:expired", onPaymentExpired)

                // Global payment update (broadcast from socket-service)
                on("payment:update", onPaymentUpdate)

                // Connection success event from server
                on("connection:success", onConnectionSuccess)

                connect()
            }

        } catch (e: Exception) {
            Timber.e("════════════════════════════════════════════════════════════")
            Timber.e("❌ [SOCKET] Failed to connect!")
            Timber.e("   ⚠️ Error: ${e.message}")
            Timber.e("════════════════════════════════════════════════════════════")
            _connectionState.value = SocketConnectionState.ERROR
        }
    }

    private val onConnectionSuccess = Emitter.Listener { args ->
        try {
            val data = args.firstOrNull() as? JSONObject
            val socketId = data?.optString("socketId") ?: "unknown"
            Timber.d("────────────────────────────────────────────────────────────")
            Timber.d("✅ [SOCKET] Connection confirmed by server!")
            Timber.d("   🔑 Socket ID: $socketId")
            Timber.d("────────────────────────────────────────────────────────────")
        } catch (e: Exception) {
            Timber.e(e, "Error parsing connection:success event")
        }
    }

    /**
     * Disconnect from the server
     */
    fun disconnect() {
        socket?.let { s ->
            s.off()
            s.disconnect()
            socket = null
        }
        _connectionState.value = SocketConnectionState.DISCONNECTED
        currentBranchId = null
        currentDeviceId = null
        Timber.d("Disconnected from Socket.IO server")
    }

    /**
     * Check if connected
     */
    fun isConnected(): Boolean = socket?.connected() == true

    private val onConnect = Emitter.Listener {
        Timber.d("════════════════════════════════════════════════════════════")
        Timber.d("✅ [SOCKET] Connected to socket-service!")
        Timber.d("════════════════════════════════════════════════════════════")
        _connectionState.value = SocketConnectionState.CONNECTED

        // Join branch room
        currentBranchId?.let { branchId ->
            currentDeviceId?.let { deviceId ->
                joinBranch(branchId, deviceId)
            }
        }
    }

    private val onDisconnect = Emitter.Listener { args ->
        val reason = args.getOrNull(0)?.toString() ?: "unknown"
        Timber.d("════════════════════════════════════════════════════════════")
        Timber.d("❌ [SOCKET] Disconnected from socket-service")
        Timber.d("   📝 Reason: $reason")
        Timber.d("════════════════════════════════════════════════════════════")
        _connectionState.value = SocketConnectionState.DISCONNECTED
    }

    private val onConnectError = Emitter.Listener { args ->
        val error = args.getOrNull(0)?.toString() ?: "unknown error"
        Timber.e("════════════════════════════════════════════════════════════")
        Timber.e("❌ [SOCKET] Connection error!")
        Timber.e("   ⚠️ Error: $error")
        Timber.e("════════════════════════════════════════════════════════════")
        _connectionState.value = SocketConnectionState.ERROR
    }

    private fun joinBranch(branchId: String, deviceId: String) {
        Timber.d("────────────────────────────────────────────────────────────")
        Timber.d("📡 [SOCKET] Joining branch room...")
        Timber.d("   🏢 Branch: $branchId")
        Timber.d("   📱 Device: $deviceId")

        val payload = JSONObject().apply {
            put("branchId", branchId)
            put("deviceId", deviceId)
            put("deviceType", "android")
        }

        socket?.emit("join:branch", payload, io.socket.client.Ack { response ->
            val result = (response as? Array<*>)?.firstOrNull() as? JSONObject
            if (result?.optBoolean("success") == true) {
                Timber.d("✅ [SOCKET] Joined branch room successfully!")
                Timber.d("────────────────────────────────────────────────────────────")
            } else {
                Timber.w("⚠️ [SOCKET] Failed to join branch room: ${result?.optString("message")}")
                Timber.d("────────────────────────────────────────────────────────────")
            }
        })
    }

    private val onPaymentSuccess = Emitter.Listener { args ->
        try {
            val receivedAt = System.currentTimeMillis()
            val data = args.firstOrNull() as? JSONObject ?: return@Listener

            Timber.d("╔══════════════════════════════════════════════════════════════════╗")
            Timber.d("║  💰 [SOCKET] PAYMENT SUCCESS RECEIVED FROM SOCKET-SERVICE!       ║")
            Timber.d("╠══════════════════════════════════════════════════════════════════╣")
            Timber.d("║  🔑 Event Key: payment:success (ROOM/BRANCH SPECIFIC)            ║")
            Timber.d("║  ⏱️  Received At: $receivedAt (${java.util.Date(receivedAt)})")
            Timber.d("╠══════════════════════════════════════════════════════════════════╣")
            Timber.d("║  💳 PAYMENT DATA:                                                 ║")
            Timber.d("║     📦 OrderCode: ${data.optLong("orderCode")}")
            Timber.d("║     💵 Amount: ${data.optLong("amount")} VND")
            Timber.d("║     🔖 Transaction Ref: ${data.optString("transactionRef")}")
            Timber.d("║     🏦 Bank: ${data.optString("counterAccountBankName")}")
            Timber.d("║     👤 From: ${data.optString("counterAccountName")}")
            Timber.d("║     🔢 Account: ${data.optString("counterAccountNumber")}")
            Timber.d("║     ⏰ Transaction Time: ${data.optString("transactionDateTime")}")
            Timber.d("╠══════════════════════════════════════════════════════════════════╣")
            Timber.d("║  📄 RAW DATA: $data")
            Timber.d("╚══════════════════════════════════════════════════════════════════╝")

            val event = PaymentSuccessEvent(
                orderId = data.optString("orderId"),
                orderCode = data.optLong("orderCode"),
                amount = data.optLong("amount"),
                transactionRef = data.optString("transactionRef"),
                transactionDateTime = data.optString("transactionDateTime"),
                counterAccountName = data.optString("counterAccountName").takeIf { it.isNotEmpty() },
                counterAccountNumber = data.optString("counterAccountNumber").takeIf { it.isNotEmpty() },
                counterAccountBankName = data.optString("counterAccountBankName").takeIf { it.isNotEmpty() }
            )

            scope.launch {
                _paymentSuccess.emit(event)
            }
        } catch (e: Exception) {
            Timber.e("════════════════════════════════════════════════════════════")
            Timber.e("❌ [SOCKET] Error parsing payment:success event!")
            Timber.e("   ⚠️ Error: ${e.message}")
            Timber.e("════════════════════════════════════════════════════════════")
        }
    }

    private val onPaymentCancelled = Emitter.Listener { args ->
        try {
            val receivedAt = System.currentTimeMillis()
            val data = args.firstOrNull() as? JSONObject ?: return@Listener

            Timber.d("╔══════════════════════════════════════════════════════════════════╗")
            Timber.d("║  ❌ [SOCKET] PAYMENT CANCELLED RECEIVED FROM SOCKET-SERVICE!     ║")
            Timber.d("╠══════════════════════════════════════════════════════════════════╣")
            Timber.d("║  🔑 Event Key: payment:cancelled (ROOM/BRANCH SPECIFIC)          ║")
            Timber.d("║  ⏱️  Received At: $receivedAt (${java.util.Date(receivedAt)})")
            Timber.d("╠══════════════════════════════════════════════════════════════════╣")
            Timber.d("║     📦 OrderCode: ${data.optLong("orderCode")}")
            Timber.d("║     📝 Reason: ${data.optString("reason")}")
            Timber.d("║  📄 RAW DATA: $data")
            Timber.d("╚══════════════════════════════════════════════════════════════════╝")

            val event = PaymentCancelledEvent(
                orderId = data.optString("orderId"),
                orderCode = data.optLong("orderCode"),
                reason = data.optString("reason").takeIf { it.isNotEmpty() }
            )

            scope.launch {
                _paymentCancelled.emit(event)
            }
        } catch (e: Exception) {
            Timber.e("❌ [SOCKET] Error parsing payment:cancelled event: ${e.message}")
        }
    }

    private val onPaymentExpired = Emitter.Listener { args ->
        try {
            val receivedAt = System.currentTimeMillis()
            val data = args.firstOrNull() as? JSONObject ?: return@Listener

            Timber.d("╔══════════════════════════════════════════════════════════════════╗")
            Timber.d("║  ⏰ [SOCKET] PAYMENT EXPIRED RECEIVED FROM SOCKET-SERVICE!       ║")
            Timber.d("╠══════════════════════════════════════════════════════════════════╣")
            Timber.d("║  🔑 Event Key: payment:expired (ROOM/BRANCH SPECIFIC)            ║")
            Timber.d("║  ⏱️  Received At: $receivedAt (${java.util.Date(receivedAt)})")
            Timber.d("╠══════════════════════════════════════════════════════════════════╣")
            Timber.d("║     📦 OrderCode: ${data.optLong("orderCode")}")
            Timber.d("║  📄 RAW DATA: $data")
            Timber.d("╚══════════════════════════════════════════════════════════════════╝")

            val event = PaymentExpiredEvent(
                orderCode = data.optLong("orderCode")
            )

            scope.launch {
                _paymentExpired.emit(event)
            }
        } catch (e: Exception) {
            Timber.e("❌ [SOCKET] Error parsing payment:expired event: ${e.message}")
        }
    }

    /**
     * Handler for global payment:update event (broadcast from socket-service)
     * This event is sent to ALL connected clients regardless of room
     */
    private val onPaymentUpdate = Emitter.Listener { args ->
        try {
            val receivedAt = System.currentTimeMillis()
            val data = args.firstOrNull() as? JSONObject ?: return@Listener

            Timber.d("╔══════════════════════════════════════════════════════════════════╗")
            Timber.d("║  📡 [SOCKET] REALTIME EVENT RECEIVED FROM SOCKET-SERVICE!        ║")
            Timber.d("╠══════════════════════════════════════════════════════════════════╣")
            Timber.d("║  🔑 Event Key: payment:update (GLOBAL BROADCAST)                 ║")
            Timber.d("║  ⏱️  Received At: $receivedAt (${java.util.Date(receivedAt)})")
            Timber.d("╠══════════════════════════════════════════════════════════════════╣")

            val eventType = data.optString("event")
            val timestamp = data.optString("timestamp")
            val paymentData = data.optJSONObject("data")

            Timber.d("║  📌 Inner Event: $eventType")
            Timber.d("║  🕐 Server Timestamp: $timestamp")

            if (paymentData != null) {
                Timber.d("╠══════════════════════════════════════════════════════════════════╣")
                Timber.d("║  💳 PAYMENT DATA:                                                 ║")
                Timber.d("║     📦 OrderCode: ${paymentData.optLong("orderCode")}")
                Timber.d("║     💰 Amount: ${paymentData.optLong("amount")} VND")
                Timber.d("║     🔄 Status: ${paymentData.optString("status")}")
                Timber.d("║     🔖 TransactionRef: ${paymentData.optString("transactionRef")}")
                Timber.d("║     🏦 Bank: ${paymentData.optString("counterAccountBankName")}")
                Timber.d("║     👤 From: ${paymentData.optString("counterAccountName")}")
                Timber.d("║     🔢 Account: ${paymentData.optString("counterAccountNumber")}")
            }

            Timber.d("╠══════════════════════════════════════════════════════════════════╣")
            Timber.d("║  📄 RAW DATA: $data")
            Timber.d("╚══════════════════════════════════════════════════════════════════╝")

            // If this is a payment:success event, also emit it through our flow
            if (eventType == "payment:success" && paymentData != null) {
                Timber.d("🔔 [SOCKET] Forwarding payment:success from global broadcast...")

                val event = PaymentSuccessEvent(
                    orderId = paymentData.optString("orderId"),
                    orderCode = paymentData.optLong("orderCode"),
                    amount = paymentData.optLong("amount"),
                    transactionRef = paymentData.optString("transactionRef"),
                    transactionDateTime = paymentData.optString("transactionDateTime"),
                    counterAccountName = paymentData.optString("counterAccountName").takeIf { it.isNotEmpty() },
                    counterAccountNumber = paymentData.optString("counterAccountNumber").takeIf { it.isNotEmpty() },
                    counterAccountBankName = paymentData.optString("counterAccountBankName").takeIf { it.isNotEmpty() }
                )

                scope.launch {
                    _paymentSuccess.emit(event)
                    Timber.d("✅ [SOCKET] PaymentSuccessEvent emitted from global broadcast!")
                }
            }
        } catch (e: Exception) {
            Timber.e("════════════════════════════════════════════════════════════")
            Timber.e("❌ [SOCKET] Error parsing payment:update event!")
            Timber.e("   ⚠️ Error: ${e.message}")
            Timber.e("   📄 Args: ${args.contentToString()}")
            Timber.e("════════════════════════════════════════════════════════════")
        }
    }
}
