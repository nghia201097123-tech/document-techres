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
     * @param serverUrl The server URL (e.g., "http://192.168.1.62:4000")
     * @param branchId The branch ID to join
     * @param deviceId The device ID
     */
    fun connect(serverUrl: String, branchId: String, deviceId: String) {
        if (socket?.connected() == true && currentBranchId == branchId) {
            Timber.d("Already connected to branch $branchId")
            return
        }

        disconnect()

        try {
            _connectionState.value = SocketConnectionState.CONNECTING
            currentBranchId = branchId
            currentDeviceId = deviceId

            val options = IO.Options().apply {
                transports = arrayOf("websocket", "polling")
                reconnection = true
                reconnectionAttempts = 10
                reconnectionDelay = 1000
                reconnectionDelayMax = 5000
                timeout = 20000
            }

            // Connect to /payment namespace
            socket = IO.socket("$serverUrl/payment", options).apply {
                // Connection events
                on(Socket.EVENT_CONNECT, onConnect)
                on(Socket.EVENT_DISCONNECT, onDisconnect)
                on(Socket.EVENT_CONNECT_ERROR, onConnectError)

                // Payment events
                on("payment:success", onPaymentSuccess)
                on("payment:cancelled", onPaymentCancelled)
                on("payment:expired", onPaymentExpired)

                connect()
            }

            Timber.d("Connecting to Socket.IO server: $serverUrl/payment")
        } catch (e: Exception) {
            Timber.e(e, "Failed to connect to Socket.IO server")
            _connectionState.value = SocketConnectionState.ERROR
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
        Timber.d("Socket.IO connected")
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
        Timber.d("Socket.IO disconnected: $reason")
        _connectionState.value = SocketConnectionState.DISCONNECTED
    }

    private val onConnectError = Emitter.Listener { args ->
        val error = args.getOrNull(0)?.toString() ?: "unknown error"
        Timber.e("Socket.IO connection error: $error")
        _connectionState.value = SocketConnectionState.ERROR
    }

    private fun joinBranch(branchId: String, deviceId: String) {
        val payload = JSONObject().apply {
            put("branchId", branchId)
            put("deviceId", deviceId)
            put("deviceType", "android")
        }

        socket?.emit("join:branch", payload, io.socket.client.Ack { response ->
            val result = (response as? Array<*>)?.firstOrNull() as? JSONObject
            if (result?.optBoolean("success") == true) {
                Timber.d("Joined branch room: $branchId")
            } else {
                Timber.w("Failed to join branch room: ${result?.optString("message")}")
            }
        })
    }

    private val onPaymentSuccess = Emitter.Listener { args ->
        try {
            val data = args.firstOrNull() as? JSONObject ?: return@Listener
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

            Timber.d("Payment success received: orderCode=${event.orderCode}, amount=${event.amount}")

            scope.launch {
                _paymentSuccess.emit(event)
            }
        } catch (e: Exception) {
            Timber.e(e, "Error parsing payment:success event")
        }
    }

    private val onPaymentCancelled = Emitter.Listener { args ->
        try {
            val data = args.firstOrNull() as? JSONObject ?: return@Listener
            val event = PaymentCancelledEvent(
                orderId = data.optString("orderId"),
                orderCode = data.optLong("orderCode"),
                reason = data.optString("reason").takeIf { it.isNotEmpty() }
            )

            Timber.d("Payment cancelled received: orderCode=${event.orderCode}")

            scope.launch {
                _paymentCancelled.emit(event)
            }
        } catch (e: Exception) {
            Timber.e(e, "Error parsing payment:cancelled event")
        }
    }

    private val onPaymentExpired = Emitter.Listener { args ->
        try {
            val data = args.firstOrNull() as? JSONObject ?: return@Listener
            val event = PaymentExpiredEvent(
                orderCode = data.optLong("orderCode")
            )

            Timber.d("Payment expired received: orderCode=${event.orderCode}")

            scope.launch {
                _paymentExpired.emit(event)
            }
        } catch (e: Exception) {
            Timber.e(e, "Error parsing payment:expired event")
        }
    }
}
