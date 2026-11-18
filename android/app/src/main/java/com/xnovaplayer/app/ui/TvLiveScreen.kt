package com.xnovaplayer.app.ui

import android.net.Uri
import android.view.KeyEvent
import androidx.annotation.OptIn
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.extractor.DefaultExtractorsFactory
import androidx.media3.extractor.ts.DefaultTsPayloadReaderFactory
import androidx.media3.ui.PlayerView
import com.xnovaplayer.app.data.api.XtreamClient
import com.xnovaplayer.app.ui.components.LiveChannelOverlay
import com.xnovaplayer.app.ui.components.ZappingBanner
import com.xnovaplayer.app.ui.theme.XNovaTvTheme
import com.xnovaplayer.app.ui.viewmodel.LiveTvViewModel

@OptIn(UnstableApi::class)
@Composable
fun TvLiveScreen(
    serverUrl: String = XtreamClient.DEFAULT_SERVER,
    user: String = "dainiersan8play",
    pass: String = "uys1dg3e",
    viewModel: LiveTvViewModel = viewModel(),
    onExit: () -> Unit = {}
) {
    val context = LocalContext.current
    val categories by viewModel.categories.collectAsState()
    val selectedCategory by viewModel.selectedCategory.collectAsState()
    val channels by viewModel.channels.collectAsState()
    val currentChannel by viewModel.currentChannel.collectAsState()
    val isOverlayVisible by viewModel.isOverlayVisible.collectAsState()
    val isZappingBannerVisible by viewModel.isZappingBannerVisible.collectAsState()

    // Inicializar ExoPlayer nativo Media3 optimizado para TS / Live
    val exoPlayer = remember {
        val renderersFactory = DefaultRenderersFactory(context)
            .setExtensionRendererMode(DefaultRenderersFactory.EXTENSION_RENDERER_MODE_PREFER)
            .setEnableDecoderFallback(true)

        val httpDataSourceFactory = DefaultHttpDataSource.Factory()
            .setUserAgent("TiviMate/4.7.0 (Linux; Android 11; Media3)")
            .setConnectTimeoutMs(12000)
            .setReadTimeoutMs(12000)
            .setAllowCrossProtocolRedirects(true)

        val extractorsFactory = DefaultExtractorsFactory()
            .setConstantBitrateSeekingEnabled(true)
            .setTsExtractorFlags(
                DefaultTsPayloadReaderFactory.FLAG_ALLOW_NON_IDR_KEYFRAMES or
                DefaultTsPayloadReaderFactory.FLAG_DETECT_ACCESS_UNITS
            )

        val mediaSourceFactory = DefaultMediaSourceFactory(httpDataSourceFactory, extractorsFactory)

        ExoPlayer.Builder(context, renderersFactory)
            .setMediaSourceFactory(mediaSourceFactory)
            .build()
            .apply {
                playWhenReady = true
            }
    }

    // Efecto para cambiar canal al instante (<300ms) sin recrear el reproductor
    LaunchedEffect(currentChannel) {
        val ch = currentChannel ?: return@LaunchedEffect
        val streamUrl = XtreamClient.buildLiveStreamUrl(serverUrl, user, pass, ch.streamId, "ts")
        val mediaItem = MediaItem.fromUri(Uri.parse(streamUrl))
        exoPlayer.setMediaItem(mediaItem)
        exoPlayer.prepare()
        exoPlayer.play()
    }

    DisposableEffect(Unit) {
        viewModel.syncChannels(serverUrl, user, pass)
        onDispose {
            exoPlayer.release()
        }
    }

    XNovaTvTheme {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black)
                .focusable()
                .onKeyEvent { keyEvent ->
                    if (keyEvent.nativeKeyEvent.action == KeyEvent.ACTION_DOWN) {
                        when (keyEvent.nativeKeyEvent.keyCode) {
                            KeyEvent.KEYCODE_DPAD_UP -> {
                                if (!isOverlayVisible) {
                                    viewModel.prevChannel()
                                    return@onKeyEvent true
                                }
                            }
                            KeyEvent.KEYCODE_DPAD_DOWN -> {
                                if (!isOverlayVisible) {
                                    viewModel.nextChannel()
                                    return@onKeyEvent true
                                }
                            }
                            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> {
                                if (!isOverlayVisible) {
                                    viewModel.toggleOverlay()
                                    return@onKeyEvent true
                                }
                            }
                            KeyEvent.KEYCODE_DPAD_LEFT -> {
                                if (!isOverlayVisible) {
                                    viewModel.toggleOverlay()
                                    return@onKeyEvent true
                                }
                            }
                            KeyEvent.KEYCODE_BACK -> {
                                if (isOverlayVisible) {
                                    viewModel.hideOverlay()
                                    return@onKeyEvent true
                                } else {
                                    onExit()
                                    return@onKeyEvent true
                                }
                            }
                        }
                    }
                    false
                }
        ) {
            // 1. Superficie de Video en Vivo a pantalla completa (reproducción ininterrumpida)
            AndroidView(
                factory = { ctx ->
                    PlayerView(ctx).apply {
                        player = exoPlayer
                        useController = false
                        layoutParams = android.view.ViewGroup.LayoutParams(
                            android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                            android.view.ViewGroup.LayoutParams.MATCH_PARENT
                        )
                    }
                },
                modifier = Modifier.fillMaxSize()
            )

            // 2. Banner Flotante de Zapping (OSD inferior que aparece 3.5s al cambiar de canal)
            ZappingBanner(
                channel = currentChannel,
                isVisible = isZappingBannerVisible && !isOverlayVisible,
                modifier = Modifier.align(Alignment.BottomCenter)
            )

            // 3. Guía de Canales Translúcida Overlay (se abre a la izquierda sin pausar el video)
            LiveChannelOverlay(
                isVisible = isOverlayVisible,
                categories = categories,
                selectedCategory = selectedCategory,
                channels = channels,
                currentChannel = currentChannel,
                onCategoryClick = { cat -> viewModel.selectCategory(cat) },
                onChannelClick = { ch -> viewModel.selectChannel(ch) },
                onDismiss = { viewModel.hideOverlay() },
                modifier = Modifier.align(Alignment.CenterStart)
            )
        }
    }
}
