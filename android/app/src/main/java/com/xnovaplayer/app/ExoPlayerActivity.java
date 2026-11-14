package com.xnovaplayer.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.annotation.OptIn;
import androidx.appcompat.app.AppCompatActivity;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.DefaultRenderersFactory;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.extractor.DefaultExtractorsFactory;
import androidx.media3.extractor.ts.DefaultTsPayloadReaderFactory;
import androidx.media3.ui.PlayerView;

@OptIn(markerClass = UnstableApi.class)
public class ExoPlayerActivity extends AppCompatActivity {

    private ExoPlayer player;
    private PlayerView playerView;
    private ProgressBar loadingSpinner;
    private LinearLayout errorLayout;
    private TextView tvErrorMessage;

    private String streamUrl = "";
    private String title = "";
    private boolean isLive = false;
    private boolean hasTriedAudioFallback = false;
    private boolean hasTriedExtensionFallback = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(R.layout.activity_exo_player);

        // Obtener datos pasados desde la interfaz web
        Intent intent = getIntent();
        if (intent != null) {
            streamUrl = intent.getStringExtra("url");
            title = intent.getStringExtra("title");
            isLive = intent.getBooleanExtra("isLive", false);
        }

        // Vincular vistas de la pantalla
        playerView = findViewById(R.id.player_view);
        loadingSpinner = findViewById(R.id.loading_spinner);
        errorLayout = findViewById(R.id.error_layout);
        tvErrorMessage = findViewById(R.id.tv_error_message);

        Button btnRetry = findViewById(R.id.btn_retry);
        Button btnErrorExternal = findViewById(R.id.btn_error_external);
        Button btnErrorBack = findViewById(R.id.btn_error_back);

        // Configurar botones del diálogo de error
        btnErrorBack.setOnClickListener(v -> finish());
        btnRetry.setOnClickListener(v -> {
            hasTriedAudioFallback = false;
            hasTriedExtensionFallback = false;
            errorLayout.setVisibility(View.GONE);
            loadingSpinner.setVisibility(View.VISIBLE);
            initPlayer();
        });

        btnErrorExternal.setOnClickListener(v -> {
            try {
                Intent externalIntent = new Intent(Intent.ACTION_VIEW);
                externalIntent.setDataAndType(Uri.parse(streamUrl), "video/*");
                externalIntent.putExtra("title", title);
                externalIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(Intent.createChooser(externalIntent, "Reproducir con..."));
            } catch (Exception e) {
                e.printStackTrace();
            }
        });

        // Configurar textos y botones de la cabecera dentro del controlador personalizado
        setupCustomControllerViews();

        initPlayer();
    }

    private void setupCustomControllerViews() {
        if (playerView == null) return;

        ImageButton btnBack = playerView.findViewById(R.id.btn_back);
        if (btnBack != null) {
            btnBack.setOnClickListener(v -> finish());
        }

        TextView tvTitle = playerView.findViewById(R.id.tv_title);
        if (tvTitle != null && title != null && !title.isEmpty()) {
            tvTitle.setText(title);
        }

        TextView tvSubtitle = playerView.findViewById(R.id.tv_subtitle);
        if (tvSubtitle != null) {
            tvSubtitle.setText(isLive ? "Transmisión en Vivo • Motor Nativo" : "Película / Serie VOD • Motor Nativo");
        }

        // Ocultar barra de tiempo si es emisión en directo
        View bottomBar = playerView.findViewById(R.id.bottom_bar);
        if (bottomBar != null && isLive) {
            bottomBar.setVisibility(View.GONE);
        }
    }

    private void initPlayer() {
        if (streamUrl == null || streamUrl.isEmpty()) {
            showError("La dirección URL del flujo de video está vacía o es inválida.");
            return;
        }

        releasePlayer();

        try {
            // Habilitar decodificadores de software y hardware con preferencia inteligente
            DefaultRenderersFactory renderersFactory = new DefaultRenderersFactory(this)
                    .setExtensionRendererMode(DefaultRenderersFactory.EXTENSION_RENDERER_MODE_PREFER)
                    .setEnableDecoderFallback(true);

            // User-Agent de alta compatibilidad (idéntico a TiviMate) para evitar rechazos de servidores IPTV
            DefaultHttpDataSource.Factory httpDataSourceFactory = new DefaultHttpDataSource.Factory()
                    .setUserAgent("TiviMate/4.7.0 (Linux; Android 11; Media3)")
                    .setConnectTimeoutMs(15000)
                    .setReadTimeoutMs(15000)
                    .setAllowCrossProtocolRedirects(true);

            // Factoría de extractores con soporte robusto para flujos MPEG-TS de TV en Vivo (exactamente igual a TiviMate)
            DefaultExtractorsFactory extractorsFactory = new DefaultExtractorsFactory()
                    .setConstantBitrateSeekingEnabled(true)
                    .setTsExtractorFlags(
                            DefaultTsPayloadReaderFactory.FLAG_ALLOW_NON_IDR_KEYFRAMES |
                            DefaultTsPayloadReaderFactory.FLAG_DETECT_ACCESS_UNITS
                    );

            DefaultMediaSourceFactory mediaSourceFactory = new DefaultMediaSourceFactory(httpDataSourceFactory, extractorsFactory);

            player = new ExoPlayer.Builder(this, renderersFactory)
                    .setMediaSourceFactory(mediaSourceFactory)
                    .build();

            playerView.setPlayer(player);
            playerView.setControllerShowTimeoutMs(3500);

            // Re-vincular vistas del controlador tras asignar el reproductor
            setupCustomControllerViews();

            player.addListener(new Player.Listener() {
                @Override
                public void onPlaybackStateChanged(int playbackState) {
                    if (playbackState == Player.STATE_BUFFERING) {
                        loadingSpinner.setVisibility(View.VISIBLE);
                        errorLayout.setVisibility(View.GONE);
                    } else if (playbackState == Player.STATE_READY) {
                        loadingSpinner.setVisibility(View.GONE);
                        errorLayout.setVisibility(View.GONE);
                    } else if (playbackState == Player.STATE_ENDED) {
                        finish();
                    }
                }

                @Override
                public void onPlayerError(PlaybackException error) {
                    loadingSpinner.setVisibility(View.GONE);

                    // 1. Fallback automático de extensión para Canales en Vivo (.ts <-> .m3u8) y Series/VOD (.mp4 <-> .mkv)
                    // Si el servidor IPTV responde con 404/recurso no encontrado porque el canal requiere .ts y no .m3u8 (o viceversa),
                    // reintentar silenciosamente con la otra extensión exactamente como hace TiviMate
                    if ((error.errorCode == PlaybackException.ERROR_CODE_IO_BAD_HTTP_STATUS ||
                         error.errorCode == PlaybackException.ERROR_CODE_IO_FILE_NOT_FOUND ||
                         error.errorCode == PlaybackException.ERROR_CODE_PARSING_CONTAINER_UNSUPPORTED) &&
                        !hasTriedExtensionFallback && streamUrl != null && !streamUrl.isEmpty()) {
                        hasTriedExtensionFallback = true;
                        if (streamUrl.endsWith(".m3u8")) {
                            streamUrl = streamUrl.substring(0, streamUrl.length() - 5) + ".ts";
                            initPlayer();
                            return;
                        } else if (streamUrl.endsWith(".ts")) {
                            streamUrl = streamUrl.substring(0, streamUrl.length() - 3) + ".m3u8";
                            initPlayer();
                            return;
                        } else if (streamUrl.endsWith(".mp4")) {
                            streamUrl = streamUrl.substring(0, streamUrl.length() - 4) + ".mkv";
                            initPlayer();
                            return;
                        } else if (streamUrl.endsWith(".mkv")) {
                            streamUrl = streamUrl.substring(0, streamUrl.length() - 4) + ".mp4";
                            initPlayer();
                            return;
                        }
                    }

                    // 2. Si el audio falló por códec no compatible en el chip del TV (ej. DTS 7.1 o AC3 multicanal),
                    // intentar automáticamente forzar downmixing a 2 canales estéreo
                    if (error.errorCode == PlaybackException.ERROR_CODE_AUDIO_TRACK_INIT_FAILED && !hasTriedAudioFallback) {
                        hasTriedAudioFallback = true;
                        try {
                            player.setTrackSelectionParameters(
                                    player.getTrackSelectionParameters()
                                            .buildUpon()
                                            .setMaxAudioChannelCount(2)
                                            .build()
                            );
                            player.prepare();
                            player.play();
                            return;
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }

                    boolean isDts = error.getMessage() != null && error.getMessage().toLowerCase().contains("dts");
                    showError("Error de reproducción (" + error.getErrorCodeName() + "): " + 
                            (isDts ? "Esta película contiene audio DTS multicanal no soportado por el chip de este televisor. Puedes abrirla directamente con VLC." : error.getMessage()));
                    
                    // Si es error de audio/códec, resaltar por defecto el botón "Abrir con VLC"
                    Button btnExternal = findViewById(R.id.btn_error_external);
                    if (btnExternal != null) {
                        btnExternal.requestFocus();
                    }
                }
            });

            MediaItem mediaItem = MediaItem.fromUri(Uri.parse(streamUrl));
            player.setMediaItem(mediaItem);
            player.setPlayWhenReady(true);
            player.prepare();

        } catch (Exception e) {
            e.printStackTrace();
            showError("Error al iniciar el motor de reproducción: " + e.getMessage());
        }
    }

    private void showError(String message) {
        if (errorLayout != null && tvErrorMessage != null) {
            tvErrorMessage.setText(message);
            errorLayout.setVisibility(View.VISIBLE);
            Button btnExternal = findViewById(R.id.btn_error_external);
            if (btnExternal != null) {
                btnExternal.requestFocus();
            }
        }
    }

    private void releasePlayer() {
        if (player != null) {
            player.release();
            player = null;
        }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        // 🛑 SI EL DIÁLOGO DE ERROR ESTÁ VISIBLE, PERMITIR NAVEGACIÓN D-PAD NATIVA ENTRE LOS BOTONES
        if (errorLayout != null && errorLayout.getVisibility() == View.VISIBLE) {
            if (event.getKeyCode() == KeyEvent.KEYCODE_BACK && event.getAction() == KeyEvent.ACTION_DOWN) {
                finish();
                return true;
            }
            return super.dispatchKeyEvent(event);
        }

        if (player == null) {
            return super.dispatchKeyEvent(event);
        }

        int keyCode = event.getKeyCode();

        switch (keyCode) {
            case KeyEvent.KEYCODE_BACK:
                if (event.getAction() == KeyEvent.ACTION_DOWN) {
                    finish();
                }
                return true;

            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
            case KeyEvent.KEYCODE_NUMPAD_ENTER:
            case KeyEvent.KEYCODE_SPACE:
                if (event.getAction() == KeyEvent.ACTION_DOWN) {
                    View currentFocus = getCurrentFocus();
                    if (currentFocus != null && currentFocus.getId() == R.id.btn_back) {
                        finish();
                        return true;
                    }
                    if (player.isPlaying()) {
                        player.pause();
                    } else {
                        player.play();
                    }
                    if (playerView != null) {
                        playerView.showController();
                    }
                }
                return true;

            case KeyEvent.KEYCODE_MEDIA_PLAY:
                if (event.getAction() == KeyEvent.ACTION_DOWN) {
                    player.play();
                    if (playerView != null) playerView.showController();
                }
                return true;

            case KeyEvent.KEYCODE_MEDIA_PAUSE:
                if (event.getAction() == KeyEvent.ACTION_DOWN) {
                    player.pause();
                    if (playerView != null) playerView.showController();
                }
                return true;

            case KeyEvent.KEYCODE_DPAD_LEFT:
                if (event.getAction() == KeyEvent.ACTION_DOWN) {
                    if (!isLive && player.isCurrentMediaItemSeekable()) {
                        long current = player.getCurrentPosition();
                        player.seekTo(Math.max(0, current - 10000));
                        if (playerView != null) playerView.showController();
                    }
                }
                return true;

            case KeyEvent.KEYCODE_DPAD_RIGHT:
                if (event.getAction() == KeyEvent.ACTION_DOWN) {
                    if (!isLive && player.isCurrentMediaItemSeekable()) {
                        long current = player.getCurrentPosition();
                        player.seekTo(current + 10000);
                        if (playerView != null) playerView.showController();
                    }
                }
                return true;

            case KeyEvent.KEYCODE_DPAD_UP:
            case KeyEvent.KEYCODE_DPAD_DOWN:
                if (playerView != null && !playerView.isControllerFullyVisible()) {
                    if (event.getAction() == KeyEvent.ACTION_DOWN) {
                        playerView.showController();
                    }
                    return true;
                }
                break;
        }

        return super.dispatchKeyEvent(event);
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (player != null) {
            player.pause();
        }
    }

    @Override
    protected void onStop() {
        super.onStop();
        releasePlayer();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        releasePlayer();
    }
}
