package com.xnovaplayer.app.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.KeyEvent
import androidx.annotation.OptIn
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
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
import androidx.tv.foundation.lazy.list.TvLazyColumn
import androidx.tv.foundation.lazy.list.items
import androidx.tv.material3.*
import coil.compose.AsyncImage
import com.xnovaplayer.app.ExoPlayerActivity
import com.xnovaplayer.app.data.api.XtreamClient
import com.xnovaplayer.app.data.database.entities.ChannelEntity
import com.xnovaplayer.app.ui.theme.XNovaCyan
import com.xnovaplayer.app.ui.theme.XNovaDarkSurface
import com.xnovaplayer.app.ui.theme.XNovaTextSecondary
import com.xnovaplayer.app.ui.theme.XNovaTvTheme
import com.xnovaplayer.app.ui.theme.XNovaVoid
import com.xnovaplayer.app.ui.viewmodel.LiveTvViewModel
import java.text.SimpleDateFormat
import java.util.*

@OptIn(UnstableApi::class, ExperimentalTvMaterial3Api::class)
@Composable
fun TvEpgGuideScreen(
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

    val timelineScrollState = rememberScrollState()
    val currentTime = remember { System.currentTimeMillis() }
    val timeFormat = remember { SimpleDateFormat("HH:mm", Locale.getDefault()) }

    // Generar franjas horarias (desde 2 horas antes hasta 4 horas después)
    val timeSlots = remember(currentTime) {
        val base = currentTime - (currentTime % (1800 * 1000)) - (2 * 3600 * 1000)
        (0..12).map { i ->
            Date(base + i * 1800 * 1000)
        }
    }

    // Mini reproductor de vista previa en la esquina
    val previewPlayer = remember {
        val renderersFactory = DefaultRenderersFactory(context)
            .setExtensionRendererMode(DefaultRenderersFactory.EXTENSION_RENDERER_MODE_PREFER)
            .setEnableDecoderFallback(true)

        val httpFactory = DefaultHttpDataSource.Factory()
            .setUserAgent("TiviMate/4.7.0 (Linux; Android 11; Media3)")

        ExoPlayer.Builder(context, renderersFactory)
            .setMediaSourceFactory(DefaultMediaSourceFactory(httpFactory))
            .build().apply {
                volume = 1.0f
                playWhenReady = true
            }
    }

    LaunchedEffect(currentChannel) {
        val ch = currentChannel ?: return@LaunchedEffect
        val streamUrl = XtreamClient.buildLiveStreamUrl(serverUrl, user, pass, ch.streamId, "ts")
        previewPlayer.setMediaItem(MediaItem.fromUri(Uri.parse(streamUrl)))
        previewPlayer.prepare()
        previewPlayer.play()
    }

    DisposableEffect(Unit) {
        viewModel.syncChannels(serverUrl, user, pass)
        onDispose {
            previewPlayer.release()
        }
    }

    XNovaTvTheme {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(XNovaVoid)
                .onKeyEvent { keyEvent ->
                    if (keyEvent.nativeKeyEvent.action == KeyEvent.ACTION_DOWN) {
                        if (keyEvent.nativeKeyEvent.keyCode == KeyEvent.KEYCODE_BACK) {
                            onExit()
                            return@onKeyEvent true
                        }
                    }
                    false
                }
        ) {
            // Cabecera superior: Título, categoría y mini reproductor preview
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
                    .background(Color(0xFF0A0E1A))
                    .padding(horizontal = 24.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "GUÍA INTERACTIVA EPG",
                            color = XNovaCyan,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = 1.5.sp
                        )
                        Box(
                            modifier = Modifier
                                .background(Color(0xFFEF4444).copy(alpha = 0.2f), RoundedCornerShape(4.dp))
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = "LÍNEA DE TIEMPO EN VIVO",
                                color = Color(0xFFEF4444),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Canal: ${currentChannel?.name ?: "Selecciona un canal"} • OK para Pantalla Completa | ⏪ Replay",
                        color = XNovaTextSecondary,
                        fontSize = 13.sp
                    )
                }

                // Mini Reproductor en vivo de alta definición (TiviMate style)
                Box(
                    modifier = Modifier
                        .width(220.dp)
                        .height(116.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .border(1.5.dp, XNovaCyan, RoundedCornerShape(8.dp))
                        .background(Color.Black)
                ) {
                    AndroidView(
                        factory = { ctx ->
                            PlayerView(ctx).apply {
                                player = previewPlayer
                                useController = false
                            }
                        },
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }

            // Regla de Franjas Horarias con Línea Roja Indicadora en tiempo real
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(36.dp)
                    .background(Color(0xFF0F172A))
                    .border(BorderStroke(0.5.dp, Color(0x3338BDF8)))
            ) {
                // Espacio fijo para columna de canales (220dp)
                Box(
                    modifier = Modifier
                        .width(220.dp)
                        .fillMaxHeight()
                        .background(Color(0xFF1E293B)),
                    contentAlignment = Alignment.CenterStart
                ) {
                    Text(
                        text = "  CANAL",
                        color = XNovaCyan,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                }

                // Franjas de tiempo horizontales
                Row(
                    modifier = Modifier
                        .weight(1f)
                        .horizontalScroll(timelineScrollState)
                ) {
                    timeSlots.forEach { slot ->
                        Box(
                            modifier = Modifier
                                .width(180.dp)
                                .fillMaxHeight()
                                .border(BorderStroke(0.5.dp, Color(0x2238BDF8))),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = timeFormat.format(slot),
                                color = Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }

            // Filas de Canales y Programación
            TvLazyColumn(
                verticalArrangement = Arrangement.spacedBy(4.dp),
                modifier = Modifier
                    .fillMaxSize()
                    .padding(vertical = 4.dp)
            ) {
                items(channels, key = { it.streamId }) { ch ->
                    val isPlaying = ch.streamId == currentChannel?.streamId

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(60.dp)
                    ) {
                        // Columna Izquierda: Tarjeta del Canal
                        Surface(
                            onClick = {
                                viewModel.selectChannel(ch)
                                launchFullScreen(context, serverUrl, user, pass, ch)
                            },
                            shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(6.dp)),
                            colors = ClickableSurfaceDefaults.colors(
                                containerColor = if (isPlaying) Color(0xFF1E293B) else Color(0xFF0F172A),
                                focusedContainerColor = XNovaCyan
                            ),
                            border = ClickableSurfaceDefaults.border(
                                border = if (isPlaying) Border(BorderStroke(1.dp, XNovaCyan)) else Border.None,
                                focusedBorder = Border(BorderStroke(2.dp, Color.White))
                            ),
                            modifier = Modifier
                                .width(220.dp)
                                .fillMaxHeight()
                                .padding(horizontal = 4.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(horizontal = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                if (!ch.streamIcon.isNullOrBlank()) {
                                    AsyncImage(
                                        model = ch.streamIcon,
                                        contentDescription = ch.name,
                                        contentScale = ContentScale.Fit,
                                        modifier = Modifier.size(32.dp)
                                    )
                                }
                                Text(
                                    text = ch.name,
                                    color = Color.White,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }

                        // Columna Derecha: Bloques de Programación Simulada y Catchup
                        Row(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxHeight()
                                .horizontalScroll(timelineScrollState)
                        ) {
                            // Programa 1: Pasado (con soporte Catchup / Replay ⏪)
                            ProgramCell(
                                title = "Emisión Anterior ⏪",
                                subtitle = "Disponible en Replay",
                                isPast = true,
                                isLive = false,
                                widthDp = 240,
                                onClick = {
                                    launchCatchup(context, serverUrl, user, pass, ch)
                                }
                            )

                            // Programa 2: En Vivo Ahora Mismo 🔴
                            ProgramCell(
                                title = "Programa Actual en Vivo",
                                subtitle = "Transmisión principal",
                                isPast = false,
                                isLive = true,
                                widthDp = 300,
                                onClick = {
                                    viewModel.selectChannel(ch)
                                    launchFullScreen(context, serverUrl, user, pass, ch)
                                }
                            )

                            // Programa 3: Siguiente Programa
                            ProgramCell(
                                title = "Próximo Evento",
                                subtitle = "A continuación",
                                isPast = false,
                                isLive = false,
                                widthDp = 260,
                                onClick = {}
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun ProgramCell(
    title: String,
    subtitle: String,
    isPast: Boolean,
    isLive: Boolean,
    widthDp: Int,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(6.dp)),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = when {
                isLive -> Color(0x3300F0FF)
                isPast -> Color(0xFF131B2E)
                else -> Color(0xFF1E293B)
            },
            focusedContainerColor = if (isLive) XNovaCyan else Color(0xFF334155)
        ),
        border = ClickableSurfaceDefaults.border(
            border = if (isLive) Border(BorderStroke(1.5.dp, Color(0xFF00F0FF))) else Border.None,
            focusedBorder = Border(BorderStroke(2.dp, Color.White))
        ),
        modifier = Modifier
            .width(widthDp.dp)
            .fillMaxHeight()
            .padding(horizontal = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 10.dp, vertical = 6.dp),
            verticalArrangement = Arrangement.Center
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                if (isLive) {
                    Box(
                        modifier = Modifier
                            .background(Color(0xFFEF4444), RoundedCornerShape(2.dp))
                            .padding(horizontal = 4.dp, vertical = 1.dp)
                    ) {
                        Text(
                            text = "EN VIVO",
                            color = Color.White,
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
                Text(
                    text = title,
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = subtitle,
                color = XNovaTextSecondary,
                fontSize = 10.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

private fun launchFullScreen(
    context: Context,
    serverUrl: String,
    user: String,
    pass: String,
    channel: ChannelEntity
) {
    val streamUrl = XtreamClient.buildLiveStreamUrl(serverUrl, user, pass, channel.streamId, "ts")
    val intent = Intent(context, ExoPlayerActivity::class.java).apply {
        putExtra("url", streamUrl)
        putExtra("title", channel.name)
        putExtra("isLive", true)
    }
    context.startActivity(intent)
}

private fun launchCatchup(
    context: Context,
    serverUrl: String,
    user: String,
    pass: String,
    channel: ChannelEntity
) {
    // Generar flujo de Replay / Timeshift del servidor IPTV
    val cleanServer = serverUrl.trimEnd('/')
    val catchupUrl = "$cleanServer/timeshift/$user/$pass/60/${channel.streamId}.m3u8"
    val intent = Intent(context, ExoPlayerActivity::class.java).apply {
        putExtra("url", catchupUrl)
        putExtra("title", "${channel.name} [REPLAY ⏪]")
        putExtra("isLive", false)
    }
    context.startActivity(intent)
}
