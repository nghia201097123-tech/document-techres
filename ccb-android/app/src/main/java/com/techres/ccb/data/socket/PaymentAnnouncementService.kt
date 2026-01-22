package com.techres.ccb.data.socket

import android.content.Context
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import timber.log.Timber
import java.text.NumberFormat
import java.util.Locale
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Service for announcing payment notifications via Text-to-Speech
 */
@Singleton
class PaymentAnnouncementService @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private var tts: TextToSpeech? = null
    private var isInitialized = false

    private val _isSpeaking = MutableStateFlow(false)
    val isSpeaking: StateFlow<Boolean> = _isSpeaking.asStateFlow()

    private val _isReady = MutableStateFlow(false)
    val isReady: StateFlow<Boolean> = _isReady.asStateFlow()

    private val vietnameseLocale = Locale("vi", "VN")
    private val currencyFormat = NumberFormat.getNumberInstance(vietnameseLocale)

    init {
        initializeTts()
    }

    private fun initializeTts() {
        tts = TextToSpeech(context) { status ->
            if (status == TextToSpeech.SUCCESS) {
                val result = tts?.setLanguage(vietnameseLocale)
                if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                    // Fallback to default locale
                    Timber.w("Vietnamese TTS not available, using default")
                    tts?.setLanguage(Locale.getDefault())
                }

                // Set speech rate (1.0 is normal)
                tts?.setSpeechRate(1.0f)

                // Set pitch (1.0 is normal)
                tts?.setPitch(1.0f)

                tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) {
                        _isSpeaking.value = true
                    }

                    override fun onDone(utteranceId: String?) {
                        _isSpeaking.value = false
                    }

                    @Deprecated("Deprecated in Java")
                    override fun onError(utteranceId: String?) {
                        _isSpeaking.value = false
                        Timber.e("TTS error for utterance: $utteranceId")
                    }

                    override fun onError(utteranceId: String?, errorCode: Int) {
                        _isSpeaking.value = false
                        Timber.e("TTS error $errorCode for utterance: $utteranceId")
                    }
                })

                isInitialized = true
                _isReady.value = true
                Timber.d("TTS initialized successfully")
            } else {
                Timber.e("TTS initialization failed with status: $status")
                _isReady.value = false
            }
        }
    }

    /**
     * Announce payment success
     * Example: "Thanh toán thành công, đơn hàng số 5, số tiền 1 triệu 20 nghìn đồng"
     */
    fun announcePaymentSuccess(amount: Long, dailyOrderNumber: Long) {
        val amountText = formatAmountForSpeech(amount)
        val message = "Thanh toán thành công, đơn hàng số $dailyOrderNumber, số tiền $amountText"
        speak(message)
    }

    /**
     * Announce payment success with table name
     * Example: "Đã nhận thanh toán 150 nghìn đồng cho bàn số 5"
     */
    fun announcePaymentSuccessWithTable(amount: Long, tableName: String) {
        val amountText = formatAmountForSpeech(amount)
        val message = "Đã nhận thanh toán $amountText cho $tableName"
        speak(message)
    }

    /**
     * Announce payment cancelled
     */
    fun announcePaymentCancelled(orderCode: Long) {
        val message = "Đơn hàng số $orderCode đã hủy thanh toán"
        speak(message)
    }

    /**
     * Announce payment expired
     */
    fun announcePaymentExpired(orderCode: Long) {
        val message = "Thanh toán đơn hàng số $orderCode đã hết hạn"
        speak(message)
    }

    /**
     * Announce custom message
     */
    fun speak(message: String) {
        if (!isInitialized) {
            Timber.w("TTS not initialized, cannot speak: $message")
            return
        }

        val utteranceId = UUID.randomUUID().toString()
        tts?.speak(message, TextToSpeech.QUEUE_ADD, null, utteranceId)
        Timber.d("TTS speaking: $message")
    }

    /**
     * Stop current speech
     */
    fun stop() {
        tts?.stop()
        _isSpeaking.value = false
    }

    /**
     * Release TTS resources
     */
    fun shutdown() {
        tts?.stop()
        tts?.shutdown()
        tts = null
        isInitialized = false
        _isReady.value = false
    }

    /**
     * Format amount for natural speech in Vietnamese
     * Examples:
     * - 150000 -> "150 nghìn đồng"
     * - 1500000 -> "1 triệu 500 nghìn đồng"
     * - 25000 -> "25 nghìn đồng"
     */
    private fun formatAmountForSpeech(amount: Long): String {
        return when {
            amount >= 1_000_000_000 -> {
                val billions = amount / 1_000_000_000
                val millions = (amount % 1_000_000_000) / 1_000_000
                if (millions > 0) {
                    "$billions tỷ $millions triệu đồng"
                } else {
                    "$billions tỷ đồng"
                }
            }
            amount >= 1_000_000 -> {
                val millions = amount / 1_000_000
                val thousands = (amount % 1_000_000) / 1_000
                if (thousands > 0) {
                    "$millions triệu ${thousands} nghìn đồng"
                } else {
                    "$millions triệu đồng"
                }
            }
            amount >= 1_000 -> {
                val thousands = amount / 1_000
                "${thousands} nghìn đồng"
            }
            else -> {
                "$amount đồng"
            }
        }
    }
}
