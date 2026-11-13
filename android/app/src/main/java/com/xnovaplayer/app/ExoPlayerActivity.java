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
            // Habilitar fallback automático de decodificadores de hardware a software para evitar pantalla negra
            DefaultRenderersFactory renderersFactory = new DefaultRenderersFactory(this)
                    .setExtensionRendererMode(DefaultRenderersFactory.EXTENSION_RENDERER_MODE_OFF)
                    .setEnableDecoderFallback(true);

            // User-Agent de alta compatibilidad (idéntico a TiviMate) para evitar rechazos de servidores IPTV
            DefaultHttpDataSource.Factory httpDataSourceFactory = new DefaultHttpDataSource.Factory()
                    .setUserAgent("TiviMate/4.7.0 (Linux; Android 11; Media3)")
                    .setConnectTimeoutMs(15000)
                    .setReadTimeoutMs(15000)
                    .setAllowCrossProtocolRedirects(true);

            DefaultMediaSourceFactory mediaSourceFactory = new DefaultMediaSourceFactory(httpDataSourceFactory);

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

                    // Si el audio falló por códec no compatible en el chip del TV (ej. DTS 7.1 o AC3 multicanal),
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
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // 🛑 SI EL DIÁLOGO DE ERROR ESTÁ VISIBLE, PERMITIR NAVEGACIÓN D-PAD NATIVA ENTRE LOS BOTONES
        if (errorLayout != null && errorLayout.getVisibility() == View.VISIBLE) {
            if (keyCode == KeyEvent.KEYCODE_BACK) {
                finish();
                return true;
            }
            return super.onKeyDown(keyCode, event);
        }

        if (player == null) {
            return super.onKeyDown(keyCode, event);
        }

        switch (keyCode) {
            case KeyEvent.KEYCODE_BACK:
                finish();
                return true;

            case KeyEvent.KEYCODE_DPAD_UP:
            case KeyEvent.KEYCODE_DPAD_DOWN:
                if (playerView != null && !playerView.isControllerFullyVisible()) {
                    playerView.showController();
                    return true;
                }
                break;

            case KeyEvent.KEYCODE_DPAD_LEFT:
                if (!isLive && player.isCurrentMediaItemSeekable()) {
                    long current = player.getCurrentPosition();
                    player.seekTo(Math.max(0, current - 10000));
                    if (playerView != null) playerView.showController();
                    return true;
                }
                break;

            case KeyEvent.KEYCODE_DPAD_RIGHT:
                if (!isLive && player.isCurrentMediaItemSeekable()) {
                    long current = player.getCurrentPosition();
                    player.seekTo(current + 10000);
                    if (playerView != null) playerView.showController();
                    return true;
                }
                break;

            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
            case KeyEvent.KEYCODE_DPAD_CENTER:
                if (playerView != null && !playerView.isControllerFullyVisible()) {
                    if (player.isPlaying()) {
                        player.pause();
                    } else {
                        player.play();
                    }
                    playerView.showController();
                    return true;
                }
                break;
        }

        return super.onKeyDown(keyCode, event);
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
