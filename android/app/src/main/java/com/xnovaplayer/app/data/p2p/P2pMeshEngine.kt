package com.xnovaplayer.app.data.p2p

import android.annotation.SuppressLint
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONArray
import org.json.JSONObject

class P2pMeshEngine private constructor(private val context: Context) {

    companion object {
        private const val TAG = "XNova_P2PMesh"

        @Volatile
        private var instance: P2pMeshEngine? = null

        fun getInstance(context: Context): P2pMeshEngine {
            return instance ?: synchronized(this) {
                instance ?: P2pMeshEngine(context.applicationContext).also { instance = it }
            }
        }

        val DEFAULT_TRACKERS = listOf(
            "wss://tracker.novage.com.ua",
            "wss://tracker.openwebtorrent.com",
            "wss://tracker.webtorrent.dev"
        )
    }

    private var webView: WebView? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    private val _isReady = MutableStateFlow(false)
    val isReady: StateFlow<Boolean> = _isReady.asStateFlow()

    private val _connectedPeers = MutableStateFlow(0)
    val connectedPeers: StateFlow<Int> = _connectedPeers.asStateFlow()

    private val _p2pDownloadedBytes = MutableStateFlow(0L)
    val p2pDownloadedBytes: StateFlow<Long> = _p2pDownloadedBytes.asStateFlow()

    private val _httpDownloadedBytes = MutableStateFlow(0L)
    val httpDownloadedBytes: StateFlow<Long> = _httpDownloadedBytes.asStateFlow()

    private val _uploadedBytes = MutableStateFlow(0L)
    val uploadedBytes: StateFlow<Long> = _uploadedBytes.asStateFlow()

    init {
        mainHandler.post {
            initHeadlessWebView()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun initHeadlessWebView() {
        try {
            webView = WebView(context).apply {
                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    allowFileAccess = true
                    allowContentAccess = true
                    cacheMode = WebSettings.LOAD_DEFAULT
                }

                addJavascriptInterface(P2pJsBridge(), "Android")
                loadUrl("file:///android_asset/p2pml/static/index.html")
            }
            Log.i(TAG, "Headless P2P WebRTC WebView initialized")
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing headless P2P WebView", e)
        }
    }

    fun startMeshSession(manifestUrl: String) {
        mainHandler.post {
            val config = JSONObject().apply {
                val announceArray = JSONArray()
                DEFAULT_TRACKERS.forEach { announceArray.put(it) }
                put("trackerAnnounce", announceArray)
                put("simultaneousP2PDownloads", 10)
                put("simultaneousHttpDownloads", 3)
            }

            val script = """
                if (window.p2p) {
                    window.p2p.initP2P('${config}');
                    window.p2p.setManifestUrl('${manifestUrl}');
                }
            """.trimIndent()

            webView?.evaluateJavascript(script, null)
            Log.i(TAG, "Iniciada sesión P2P Mesh para flujo: $manifestUrl")
        }
    }

    fun stopMeshSession() {
        mainHandler.post {
            webView?.evaluateJavascript("if (window.p2p) { window.p2p.destroyP2PEngine(); }", null)
            _connectedPeers.value = 0
            Log.i(TAG, "Sesión P2P Mesh detenida.")
        }
    }

    private inner class P2pJsBridge {

        @JavascriptInterface
        fun onWebViewLoaded() {
            Log.i(TAG, "P2P Media Loader Core cargado y listo en memoria")
            _isReady.value = true
        }

        @JavascriptInterface
        fun onChunkDownloaded(bytesLength: Long, downloadSource: String, peerId: String) {
            if (downloadSource.equals("p2p", ignoreCase = true)) {
                _p2pDownloadedBytes.value += bytesLength
                Log.d(TAG, "Chunk P2P recibido de peer $peerId: $bytesLength bytes (Servidor central aliviado)")
            } else {
                _httpDownloadedBytes.value += bytesLength
            }
        }

        @JavascriptInterface
        fun onChunkUploaded(bytesLength: Long, peerId: String) {
            _uploadedBytes.value += bytesLength
            Log.d(TAG, "Chunk P2P subido a peer $peerId: $bytesLength bytes")
        }

        @JavascriptInterface
        fun onPeerConnect(params: String) {
            _connectedPeers.value += 1
            Log.i(TAG, "Nuevo par WebRTC conectado a la malla. Total pares: ${_connectedPeers.value}")
        }

        @JavascriptInterface
        fun onPeerClose(params: String) {
            if (_connectedPeers.value > 0) {
                _connectedPeers.value -= 1
            }
        }

        @JavascriptInterface
        fun onPeerError(params: String) {
            Log.w(TAG, "Aviso de par WebRTC: $params")
        }

        @JavascriptInterface
        fun onTrackerError(params: String) {
            Log.w(TAG, "Aviso de tracker P2P: $params")
        }

        @JavascriptInterface
        fun onTrackerWarning(params: String) {
            Log.w(TAG, "Alerta de tracker P2P: $params")
        }

        @JavascriptInterface
        fun onSegmentLoaded(params: String) {}

        @JavascriptInterface
        fun onSegmentError(params: String) {}

        @JavascriptInterface
        fun onSegmentAbort(params: String) {}

        @JavascriptInterface
        fun onSegmentStart(params: String) {}
    }
}
