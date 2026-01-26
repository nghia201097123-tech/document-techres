package com.techres.ccb.util

import android.content.Context
import android.speech.tts.TextToSpeech
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manager for announcing new food orders using Text-to-Speech
 */
@Singleton
class OrderAnnouncementManager @Inject constructor(
    @ApplicationContext private val context: Context
) : TextToSpeech.OnInitListener {

    companion object {
        private const val TAG = "OrderAnnouncementMgr"
    }

    private var tts: TextToSpeech? = null
    private var isInitialized = false
    private val pendingAnnouncements = mutableListOf<String>()

    init {
        initTTS()
    }

    private fun initTTS() {
        tts = TextToSpeech(context, this)
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            // Set Vietnamese language
            val result = tts?.setLanguage(Locale("vi", "VN"))

            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                // Fallback to default locale
                Log.w(TAG, "Vietnamese not supported, using default")
                tts?.setLanguage(Locale.getDefault())
            }

            // Set speech rate (slightly slower for clarity)
            tts?.setSpeechRate(0.9f)

            isInitialized = true
            Log.d(TAG, "TTS initialized successfully")

            // Process any pending announcements
            processPendingAnnouncements()
        } else {
            Log.e(TAG, "TTS initialization failed with status: $status")
            isInitialized = false
        }
    }

    /**
     * Announce a new order
     * @param platform Platform name (e.g., "GrabFood", "ShopeeFood")
     * @param orderCode Order code (e.g., "GF-714")
     */
    fun announceNewOrder(platform: String, orderCode: String) {
        val message = buildAnnouncementMessage(platform, orderCode)
        speak(message)
    }

    /**
     * Announce multiple new orders
     */
    fun announceNewOrders(orders: List<Pair<String, String>>) {
        if (orders.isEmpty()) return

        if (orders.size == 1) {
            val (platform, orderCode) = orders.first()
            announceNewOrder(platform, orderCode)
        } else {
            // Multiple orders - announce count first, then each order
            val countMessage = "Bạn có ${orders.size} đơn hàng mới"
            speak(countMessage)

            orders.forEach { (platform, orderCode) ->
                val message = buildAnnouncementMessage(platform, orderCode)
                speak(message, addToQueue = true)
            }
        }
    }

    private fun buildAnnouncementMessage(platform: String, orderCode: String): String {
        val platformName = when (platform.uppercase()) {
            "GRAB", "GRABFOOD", "GRAB_FOOD" -> "Grab Food"
            "SHOPEE", "SHOPEEFOOD", "SHOPEE_FOOD" -> "Shopee Food"
            "BE", "BEFOOD", "BE_FOOD" -> "Be Food"
            "GO", "GOFOOD", "GO_FOOD" -> "Go Food"
            "WEB", "WEB_ORDER" -> "Web"
            "PHONE", "PHONE_ORDER" -> "điện thoại"
            else -> platform
        }

        return "Bạn có đơn $platformName mới, mã đơn $orderCode"
    }

    private fun speak(message: String, addToQueue: Boolean = false) {
        if (!isInitialized) {
            Log.d(TAG, "TTS not ready, queuing: $message")
            pendingAnnouncements.add(message)
            return
        }

        val queueMode = if (addToQueue) TextToSpeech.QUEUE_ADD else TextToSpeech.QUEUE_FLUSH

        tts?.speak(message, queueMode, null, message.hashCode().toString())
        Log.d(TAG, "Speaking: $message")
    }

    private fun processPendingAnnouncements() {
        if (pendingAnnouncements.isNotEmpty()) {
            Log.d(TAG, "Processing ${pendingAnnouncements.size} pending announcements")
            pendingAnnouncements.forEachIndexed { index, message ->
                speak(message, addToQueue = index > 0)
            }
            pendingAnnouncements.clear()
        }
    }

    /**
     * Stop any ongoing speech
     */
    fun stop() {
        tts?.stop()
    }

    /**
     * Release TTS resources
     */
    fun shutdown() {
        tts?.stop()
        tts?.shutdown()
        tts = null
        isInitialized = false
    }
}
