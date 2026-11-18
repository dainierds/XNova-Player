package com.xnovaplayer.app.ui

import android.net.Uri
import android.view.KeyEvent
import androidx.annotation.OptIn
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Surface
import androidx.tv.material3.Text
import com.xnovaplayer.app.data.api.XtreamClient
import com.xnovaplayer.app.data.database.entities.ChannelEntity
import com.xnovaplayer.app.ui.components.LiveChannelOverlay
import com.xnovaplayer.app.ui.theme.XNovaCyan
import com.xnovaplayer.app.ui.theme.XNovaTvTheme
import com.xnovaplayer.app.ui.theme.XNovaVoid
import com.xnovaplayer.app.ui.viewmodel.LiveTvViewModel

@OptIn(UnstableApi::class, ExperimentalTvMaterial3Api::class)
@Composable
fun TvMultiscreenScreen(
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

    var activeScreenIndex by remember { mutableIntStateOf(0) }
    var isChannelPickerOpen by remember { mutableStateOf(false) }

    // Estado de los 4 canales seleccionados para las 4 pantallas
    val screenChannels = remember {
        mutableStateListOf<ChannelEntity?>(null, null, null, null)
    }

    // Inicializar 4 reproductores ExoPlayer independientes
    val players = remember {
        (0 until 4).map { idx ->
            val renderersFactory = DefaultRenderersFactory(context)
                .setExtensionRendererMode(DefaultRenderersFactory.EXTENSION_RENDERER_MODE_PREFER)
                .setEnableDecoderFallback(true)

            val httpDataSourceFactory = DefaultHttpDataSource.Factory()
                .setUserAgent("TiviMate/4.7.0 (Linux; Android 11; Media3)")
                .setConnectTimeoutMs(10000)
                .setReadTimeoutMs(10000)
                .setAllowCrossProtocolRedirects(true)

            ExoPlayer.Builder(context, renderersFactory)
                .setMediaSourceFactory(DefaultMediaSourceFactory(httpDataSourceFactory))
                .build().apply {
                    playWhenReady = true
                    volume = if (idx == 0) 1.0f else 0.0f // Solo la pantalla enfocada tiene audio
                }
        }
    }

    // Cambiar audio al alternar pantalla enfocada
    LaunchedEffect(activeScreenIndex) {
        players.forEachIndexed { idx, player ->
            player.volume = if (idx == activeScreenIndex) 1.0f else 0.0f
        }
    }

    // Auto-asignar los primeros 4 canales cuando carguen
    LaunchedEffect(channels) {
        if (channels.isNotEmpty() && screenChannels[0] == null) {
            for (i in 0 until minOf(4, channels.size)) {
                screenChannels[i] = channels[i]
                val streamUrl = XtreamClient.buildLiveStreamUrl(serverUrl, user, pass, channels[i].streamId, "ts")
                players[i].setMediaItem(MediaItem.fromUri(Uri.parse(streamUrl)))
                players[i].prepare()
                players[i].play()
            }
        }
    }

    DisposableEffect(Unit) {
        viewModel.syncChannels(serverUrl, user, pass)
        onDispose {
            players.forEach { it.release() }
        }
    }

    XNovaTvTheme {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(XNovaVoid)
                .onKeyEvent { keyEvent ->
                    if (keyEvent.nativeKeyEvent.action == KeyEvent.ACTION_DOWN) {
                        if (keyEvent.nativeKeyEvent.keyCode == KeyEvent.KEYCODE_BACK) {
                            if (isChannelPickerOpen) {
                                isChannelPickerOpen = false
                                return@onKeyEvent true
                            } else {
                                onExit()
                                return@onKeyEvent true
                            }
                        }
                    }
                    false
                }
        ) {
            // Mosaico 2x2 de 4 pantallas en vivo
            Column(modifier = Modifier.fillMaxSize().padding(10.dp)) {
                for (row in 0 until 2) {
                    Row(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        for (col in 0 until 2) {
                            val screenIndex = row * 2 + col
                            val isActive = activeScreenIndex == screenIndex
                            val channel = screenChannels[screenIndex]

                            Surface(
                                onClick = {
                                    activeScreenIndex = screenIndex
                                    isChannelPickerOpen = true
                                },
                                shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
                                colors = ClickableSurfaceDefaults.colors(
                                    containerColor = Color.Black
                                ),
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxHeight()
                                    .border(
                                        BorderStroke(
                                            width = if (isActive) 3.dp else 1.dp,
                                            color = if (isActive) XNovaCyan else Color(0x3338BDF8)
                                        ),
                                        shape = RoundedCornerShape(8.dp)
                                    )
                            ) {
                                Box(modifier = Modifier.fillMaxSize()) {
                                    // Superficie de Video ExoPlayer de cada cuadrante
                                    AndroidView(
                                        factory = { ctx ->
                                            PlayerView(ctx).apply {
                                                player = players[screenIndex]
                                                useController = false
                                                layoutParams = android.view.ViewGroup.LayoutParams(
                                                    android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                                                    android.view.ViewGroup.LayoutParams.MATCH_PARENT
                                                )
                                            }
                                        },
                                        modifier = Modifier.fillMaxSize()
                                    )

                                    // Indicador de Pantalla y Canal
                                    Row(
                                        modifier = Modifier
                                            .align(Alignment.TopStart)
                                            .padding(8.dp),
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .background(
                                                    if (isActive) XNovaCyan else Color(0x99000000),
                                                    RoundedCornerShape(4.dp)
                                                )
                                                .padding(horizontal = 6.dp, vertical = 2.dp)
                                        ) {
                                            Text(
                                                text = "PANTALLA ${screenIndex + 1} ${if (isActive) "🔊" else "🔇"}",
                                                color = if (isActive) Color.Black else Color.White,
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }

                                        if (channel != null) {
                                            Box(
                                                modifier = Modifier
                                                    .background(Color(0x99000000), RoundedCornerShape(4.dp))
                                                .padding(horizontal = 6.dp, vertical = 2.dp)
                                            ) {
                                                Text(
                                                    text = channel.name,
                                                    color = Color.White,
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.SemiBold
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (row == 0) Spacer(modifier = Modifier.height(10.dp))
                }
            }

            // Guía de selección de canal para la pantalla enfocada
            LiveChannelOverlay(
                isVisible = isChannelPickerOpen,
                categories = categories,
                selectedCategory = selectedCategory,
                channels = channels,
                currentChannel = screenChannels[activeScreenIndex],
                onCategoryClick = { cat -> viewModel.selectCategory(cat) },
                onChannelClick = { ch ->
                    screenChannels[activeScreenIndex] = ch
                    val streamUrl = XtreamClient.buildLiveStreamUrl(serverUrl, user, pass, ch.streamId, "ts")
                    players[activeScreenIndex].setMediaItem(MediaItem.fromUri(Uri.parse(streamUrl)))
                    players[activeScreenIndex].prepare()
                    players[activeScreenIndex].play()
                    isChannelPickerOpen = false
                },
                onDismiss = { isChannelPickerOpen = false },
                modifier = Modifier.align(Alignment.CenterStart)
            )
        }
    }
}
