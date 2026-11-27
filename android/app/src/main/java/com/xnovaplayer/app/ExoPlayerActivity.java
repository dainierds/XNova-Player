package com.xnovaplayer.app;

import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewParent;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageButton;
import android.widget.ImageView;
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
import org.json.JSONArray;
import org.json.JSONObject;

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
    private boolean hasTriedVlcFallback = false;

    private String seriesInfoJson = "";
    private String currentEpisodeId = "";
    private LinearLayout llEpisodesList;
    private HorizontalScrollView hsvEpisodes;
    private LinearLayout episodesContainer;

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
            seriesInfoJson = intent.getStringExtra("seriesInfoJson");
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

        // Ocultar barra de tiempo solo si es emisión en directo Y no hay lista rápida de canales
        View bottomBar = playerView.findViewById(R.id.bottom_bar);
        if (bottomBar != null && isLive && (seriesInfoJson == null || seriesInfoJson.isEmpty())) {
            bottomBar.setVisibility(View.GONE);
        }

        // Configurar carrusel de capítulos o canales de TV
        if (seriesInfoJson != null && !seriesInfoJson.isEmpty()) {
            setupSeriesEpisodes(seriesInfoJson);
        }
    }

    private static final android.util.LruCache<String, Bitmap> logoCache = new android.util.LruCache<>(100);
    private static final java.util.concurrent.ExecutorService logoExecutor = java.util.concurrent.Executors.newFixedThreadPool(4);

    private void loadChannelLogo(String url, ImageView imageView, View fallbackView) {
        if (url == null || url.trim().isEmpty()) {
            imageView.setVisibility(View.GONE);
            if (fallbackView != null) fallbackView.setVisibility(View.VISIBLE);
            return;
        }
        Bitmap cached = logoCache.get(url);
        if (cached != null) {
            imageView.setImageBitmap(cached);
            imageView.setVisibility(View.VISIBLE);
            if (fallbackView != null) fallbackView.setVisibility(View.GONE);
            return;
        }
        imageView.setTag(url);
        logoExecutor.execute(() -> {
            try {
                java.net.HttpURLConnection conn = (java.net.HttpURLConnection) new java.net.URL(url).openConnection();
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);
                conn.setInstanceFollowRedirects(true);
                conn.setRequestProperty("User-Agent", "TiviMate/4.7.0 (Linux; Android 11)");
                int responseCode = conn.getResponseCode();
                if (responseCode == java.net.HttpURLConnection.HTTP_OK) {
                    java.io.InputStream is = conn.getInputStream();
                    Bitmap bitmap = BitmapFactory.decodeStream(is);
                    is.close();
                    if (bitmap != null) {
                        logoCache.put(url, bitmap);
                        runOnUiThread(() -> {
                            if (url.equals(imageView.getTag())) {
                                imageView.setImageBitmap(bitmap);
                                imageView.setVisibility(View.VISIBLE);
                                if (fallbackView != null) fallbackView.setVisibility(View.GONE);
                            }
                        });
                        return;
                    }
                }
            } catch (Exception ignored) {}
            runOnUiThread(() -> {
                if (url.equals(imageView.getTag())) {
                    imageView.setVisibility(View.GONE);
                    if (fallbackView != null) fallbackView.setVisibility(View.VISIBLE);
                }
            });
        });
    }

    private boolean isViewInCarousel(View view) {
        if (view == null || llEpisodesList == null) return false;
        ViewParent p = view.getParent();
        while (p != null) {
            if (p == llEpisodesList || p == hsvEpisodes) return true;
            if (!(p instanceof View)) break;
            p = ((View) p).getParent();
        }
        return false;
    }

    private void setupSeriesEpisodes(String json) {
        if (playerView == null || json == null || json.isEmpty()) return;

        try {
            JSONObject obj = new JSONObject(json);

            // 📺 CASO A: Canales de la Carpeta de TV en Vivo
            if (obj.has("channels")) {
                final String catName = obj.optString("categoryName", "Canales en Vivo");
                currentEpisodeId = obj.optString("currentChannelId", "");
                JSONArray chArray = obj.optJSONArray("channels");
                if (chArray == null || chArray.length() == 0) return;

                episodesContainer = playerView.findViewById(R.id.episodes_container);
                hsvEpisodes = playerView.findViewById(R.id.hsv_episodes);
                llEpisodesList = playerView.findViewById(R.id.ll_episodes_list);
                TextView tvEpisodesHeader = playerView.findViewById(R.id.tv_episodes_header);

                if (episodesContainer != null) {
                    episodesContainer.setVisibility(View.VISIBLE);
                }
                if (tvEpisodesHeader != null) {
                    tvEpisodesHeader.setText("CARPETA: " + catName.toUpperCase() + " • " + chArray.length() + " CANALES");
                }
                if (llEpisodesList == null) return;
                llEpisodesList.removeAllViews();

                int prevId = -1;
                for (int i = 0; i < chArray.length(); i++) {
                    JSONObject ch = chArray.getJSONObject(i);
                    final String chId = ch.optString("id", String.valueOf(i + 1));
                    final int chNum = ch.optInt("channelNumber", i + 1);
                    final String chName = ch.optString("name", "Canal " + chNum);
                    final String chUrl = ch.optString("streamUrl", "");
                    final String chLogo = ch.optString("logoUrl", "");

                    // Tarjeta de canal con dimensiones amplias y fondo semi-transparente
                    LinearLayout itemLayout = new LinearLayout(this);
                    itemLayout.setOrientation(LinearLayout.HORIZONTAL);
                    itemLayout.setGravity(Gravity.CENTER_VERTICAL);
                    itemLayout.setFocusable(true);
                    itemLayout.setClickable(true);
                    itemLayout.setBackgroundResource(R.drawable.bg_player_episode_item);
                    itemLayout.setPadding(dpToPx(10), dpToPx(8), dpToPx(12), dpToPx(8));

                    LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                            dpToPx(200),
                            dpToPx(76)
                    );
                    lp.setMarginEnd(dpToPx(12));
                    itemLayout.setLayoutParams(lp);

                    // Conexión precisa de navegación D-pad horizontal entre canales
                    int cardId = View.generateViewId();
                    itemLayout.setId(cardId);
                    if (prevId != -1) {
                        itemLayout.setNextFocusLeftId(prevId);
                        View prevCard = llEpisodesList.getChildAt(i - 1);
                        if (prevCard != null) {
                            prevCard.setNextFocusRightId(cardId);
                        }
                    }
                    prevId = cardId;
                    itemLayout.setNextFocusUpId(androidx.media3.ui.R.id.exo_play);

                    // Contenedor del Logo con esquinas redondeadas
                    FrameLayout logoContainer = new FrameLayout(this);
                    LinearLayout.LayoutParams logoLp = new LinearLayout.LayoutParams(dpToPx(52), dpToPx(52));
                    logoContainer.setLayoutParams(logoLp);

                    android.graphics.drawable.GradientDrawable logoBg = new android.graphics.drawable.GradientDrawable();
                    logoBg.setColor(android.graphics.Color.parseColor("#26FFFFFF"));
                    logoBg.setCornerRadius(dpToPx(8));
                    logoContainer.setBackground(logoBg);

                    ImageView ivLogo = new ImageView(this);
                    FrameLayout.LayoutParams ivLp = new FrameLayout.LayoutParams(dpToPx(46), dpToPx(46), Gravity.CENTER);
                    ivLogo.setLayoutParams(ivLp);
                    ivLogo.setScaleType(ImageView.ScaleType.FIT_CENTER);

                    TextView tvFallback = new TextView(this);
                    FrameLayout.LayoutParams fbLp = new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT);
                    tvFallback.setLayoutParams(fbLp);
                    tvFallback.setGravity(Gravity.CENTER);
                    tvFallback.setText(String.valueOf(chNum));
                    tvFallback.setTextSize(14);
                    tvFallback.setTypeface(null, android.graphics.Typeface.BOLD);
                    tvFallback.setTextColor(android.graphics.Color.parseColor("#22D3EE"));

                    logoContainer.addView(tvFallback);
                    logoContainer.addView(ivLogo);
                    loadChannelLogo(chLogo, ivLogo, tvFallback);

                    // Contenedor de Textos (Número, badge y Nombre de Canal)
                    LinearLayout infoLayout = new LinearLayout(this);
                    infoLayout.setOrientation(LinearLayout.VERTICAL);
                    infoLayout.setGravity(Gravity.CENTER_VERTICAL);
                    LinearLayout.LayoutParams infoLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
                    infoLp.setMarginStart(dpToPx(10));
                    infoLayout.setLayoutParams(infoLp);

                    // Fila superior: CH número y badge "EN VIVO"
                    LinearLayout rowBadge = new LinearLayout(this);
                    rowBadge.setOrientation(LinearLayout.HORIZONTAL);
                    rowBadge.setGravity(Gravity.CENTER_VERTICAL);

                    TextView tvNum = new TextView(this);
                    tvNum.setTextSize(10);
                    tvNum.setTypeface(null, android.graphics.Typeface.BOLD);
                    tvNum.setTextColor(android.graphics.Color.parseColor("#A1A1AA"));
                    tvNum.setText("CH " + chNum);
                    rowBadge.addView(tvNum);

                    TextView tvNow = new TextView(this);
                    tvNow.setTextSize(9);
                    tvNow.setTypeface(null, android.graphics.Typeface.BOLD);
                    tvNow.setTextColor(android.graphics.Color.parseColor("#22D3EE"));
                    tvNow.setText("• EN VIVO");
                    tvNow.setPadding(dpToPx(6), 0, 0, 0);
                    tvNow.setTag("badge_now");

                    boolean isCurrent = chId.equals(currentEpisodeId);
                    tvNow.setVisibility(isCurrent ? View.VISIBLE : View.GONE);
                    rowBadge.addView(tvNow);

                    TextView tvName = new TextView(this);
                    tvName.setTextSize(12);
                    tvName.setTypeface(null, android.graphics.Typeface.BOLD);
                    tvName.setTextColor(getResources().getColorStateList(R.color.text_player_episode_selector, getTheme()));
                    tvName.setText(chName);
                    tvName.setMaxLines(2);
                    tvName.setEllipsize(android.text.TextUtils.TruncateAt.END);
                    tvName.setPadding(0, dpToPx(2), 0, 0);

                    infoLayout.addView(rowBadge);
                    infoLayout.addView(tvName);

                    itemLayout.addView(logoContainer);
                    itemLayout.addView(infoLayout);

                    itemLayout.setContentDescription(chId);
                    if (isCurrent) {
                        itemLayout.setTag("current_ep");
                    } else {
                        itemLayout.setTag(chId);
                    }

                    // Auto-desplazamiento suave y elevación al recibir foco del mando
                    itemLayout.setOnFocusChangeListener((v, hasFocus) -> {
                        if (hasFocus) {
                            v.setScaleX(1.08f);
                            v.setScaleY(1.08f);
                            v.setElevation(dpToPx(8));
                            if (hsvEpisodes != null) {
                                int scrollTo = v.getLeft() - (hsvEpisodes.getWidth() / 2) + (v.getWidth() / 2);
                                hsvEpisodes.smoothScrollTo(Math.max(0, scrollTo), 0);
                            }
                        } else {
                            v.setScaleX(1.0f);
                            v.setScaleY(1.0f);
                            v.setElevation(0);
                        }
                    });

                    itemLayout.setOnClickListener(v -> {
                        playNewEpisode(chUrl, chName, chId);
                    });

                    llEpisodesList.addView(itemLayout);
                }
                return;
            }

            final String seriesName = obj.optString("seriesName", "Serie");
            final int seasonNum = obj.optInt("seasonNumber", 1);
            currentEpisodeId = obj.optString("currentEpisodeId", "");
            JSONArray epArray = obj.optJSONArray("episodes");
            if (epArray == null || epArray.length() == 0) return;

            episodesContainer = playerView.findViewById(R.id.episodes_container);
            hsvEpisodes = playerView.findViewById(R.id.hsv_episodes);
            llEpisodesList = playerView.findViewById(R.id.ll_episodes_list);
            TextView tvEpisodesHeader = playerView.findViewById(R.id.tv_episodes_header);

            if (episodesContainer != null) {
                episodesContainer.setVisibility(View.VISIBLE);
            }
            if (tvEpisodesHeader != null) {
                tvEpisodesHeader.setText("TEMPORADA " + seasonNum + " — " + epArray.length() + " CAPÍTULOS");
            }
            if (llEpisodesList == null) return;
            llEpisodesList.removeAllViews();

            int prevId = -1;
            for (int i = 0; i < epArray.length(); i++) {
                JSONObject ep = epArray.getJSONObject(i);
                final String epId = ep.optString("id", String.valueOf(i + 1));
                final int epNum = ep.optInt("episodeNum", i + 1);
                final String epTitle = ep.optString("title", "Capítulo " + epNum);
                final String epUrl = ep.optString("streamUrl", "");
                final String epPoster = ep.optString("posterUrl", "");
                final String fullTitle = seriesName + " - T" + seasonNum + "E" + epNum + ": " + epTitle;

                // Tarjeta de botón de cada capítulo con dimensiones amplias y estilo cinematográfico
                LinearLayout itemLayout = new LinearLayout(this);
                itemLayout.setOrientation(LinearLayout.HORIZONTAL);
                itemLayout.setGravity(Gravity.CENTER_VERTICAL);
                itemLayout.setFocusable(true);
                itemLayout.setClickable(true);
                itemLayout.setBackgroundResource(R.drawable.bg_player_episode_item);
                itemLayout.setPadding(dpToPx(10), dpToPx(8), dpToPx(12), dpToPx(8));

                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                        dpToPx(210),
                        dpToPx(76)
                );
                lp.setMarginEnd(dpToPx(12));
                itemLayout.setLayoutParams(lp);

                int cardId = View.generateViewId();
                itemLayout.setId(cardId);
                if (prevId != -1) {
                    itemLayout.setNextFocusLeftId(prevId);
                    View prevCard = llEpisodesList.getChildAt(i - 1);
                    if (prevCard != null) {
                        prevCard.setNextFocusRightId(cardId);
                    }
                }
                prevId = cardId;
                itemLayout.setNextFocusUpId(androidx.media3.ui.R.id.exo_progress);

                // Contenedor de Miniatura / Icono
                FrameLayout thumbContainer = new FrameLayout(this);
                LinearLayout.LayoutParams thumbLp = new LinearLayout.LayoutParams(dpToPx(52), dpToPx(52));
                thumbContainer.setLayoutParams(thumbLp);

                android.graphics.drawable.GradientDrawable thumbBg = new android.graphics.drawable.GradientDrawable();
                thumbBg.setColor(android.graphics.Color.parseColor("#26FFFFFF"));
                thumbBg.setCornerRadius(dpToPx(8));
                thumbContainer.setBackground(thumbBg);

                ImageView ivThumb = new ImageView(this);
                FrameLayout.LayoutParams ivLp = new FrameLayout.LayoutParams(dpToPx(48), dpToPx(48), Gravity.CENTER);
                ivThumb.setLayoutParams(ivLp);
                ivThumb.setScaleType(ImageView.ScaleType.CENTER_CROP);

                TextView tvFallback = new TextView(this);
                FrameLayout.LayoutParams fbLp = new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT);
                tvFallback.setLayoutParams(fbLp);
                tvFallback.setGravity(Gravity.CENTER);
                tvFallback.setText("E" + epNum);
                tvFallback.setTextSize(13);
                tvFallback.setTypeface(null, android.graphics.Typeface.BOLD);
                tvFallback.setTextColor(android.graphics.Color.parseColor("#22D3EE"));

                thumbContainer.addView(tvFallback);
                thumbContainer.addView(ivThumb);
                loadChannelLogo(epPoster, ivThumb, tvFallback);

                // Contenedor de Textos
                LinearLayout infoLayout = new LinearLayout(this);
                infoLayout.setOrientation(LinearLayout.VERTICAL);
                infoLayout.setGravity(Gravity.CENTER_VERTICAL);
                LinearLayout.LayoutParams infoLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
                infoLp.setMarginStart(dpToPx(10));
                infoLayout.setLayoutParams(infoLp);

                // Fila superior: Badge T1 • E01 y estado
                LinearLayout rowBadge = new LinearLayout(this);
                rowBadge.setOrientation(LinearLayout.HORIZONTAL);
                rowBadge.setGravity(Gravity.CENTER_VERTICAL);

                TextView tvNum = new TextView(this);
                tvNum.setTextSize(10);
                tvNum.setTypeface(null, android.graphics.Typeface.BOLD);
                tvNum.setTextColor(android.graphics.Color.parseColor("#A1A1AA"));
                tvNum.setText("T" + seasonNum + " • E" + epNum);
                rowBadge.addView(tvNum);

                TextView tvNow = new TextView(this);
                tvNow.setTextSize(9);
                tvNow.setTypeface(null, android.graphics.Typeface.BOLD);
                tvNow.setTextColor(android.graphics.Color.parseColor("#22D3EE"));
                tvNow.setText("• REPRODUCIENDO");
                tvNow.setPadding(dpToPx(6), 0, 0, 0);
                tvNow.setTag("badge_now");

                boolean isCurrent = epId.equals(currentEpisodeId);
                tvNow.setVisibility(isCurrent ? View.VISIBLE : View.GONE);
                rowBadge.addView(tvNow);

                TextView tvText = new TextView(this);
                tvText.setTextSize(12);
                tvText.setTypeface(null, android.graphics.Typeface.BOLD);
                tvText.setTextColor(getResources().getColorStateList(R.color.text_player_episode_selector, getTheme()));
                tvText.setText(epTitle);
                tvText.setMaxLines(2);
                tvText.setEllipsize(android.text.TextUtils.TruncateAt.END);
                tvText.setPadding(0, dpToPx(2), 0, 0);

                infoLayout.addView(rowBadge);
                infoLayout.addView(tvText);

                itemLayout.addView(thumbContainer);
                itemLayout.addView(infoLayout);

                itemLayout.setContentDescription(epId);
                if (isCurrent) {
                    itemLayout.setTag("current_ep");
                } else {
                    itemLayout.setTag(epId);
                }

                itemLayout.setOnFocusChangeListener((v, hasFocus) -> {
                    if (hasFocus) {
                        v.setScaleX(1.08f);
                        v.setScaleY(1.08f);
                        v.setElevation(dpToPx(8));
                        if (hsvEpisodes != null) {
                            int scrollTo = v.getLeft() - (hsvEpisodes.getWidth() / 2) + (v.getWidth() / 2);
                            hsvEpisodes.smoothScrollTo(Math.max(0, scrollTo), 0);
                        }
                    } else {
                        v.setScaleX(1.0f);
                        v.setScaleY(1.0f);
                        v.setElevation(0);
                    }
                });

                itemLayout.setOnClickListener(v -> {
                    playNewEpisode(epUrl, fullTitle, epId);
                });

                llEpisodesList.addView(itemLayout);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private int dpToPx(int dp) {
        float density = getResources().getDisplayMetrics().density;
        return Math.round(dp * density);
    }

    private void playNewEpisode(String newUrl, String newTitle, String newEpId) {
        if (newUrl == null || newUrl.isEmpty()) return;
        this.streamUrl = newUrl;
        this.title = newTitle;
        this.currentEpisodeId = newEpId;

        // Actualizar título en la barra superior
        if (playerView != null) {
            TextView tvTitle = playerView.findViewById(R.id.tv_title);
            if (tvTitle != null) {
                tvTitle.setText(newTitle);
            }
        }

        // Actualizar indicadores visuales en los capítulos / canales
        if (llEpisodesList != null) {
            for (int i = 0; i < llEpisodesList.getChildCount(); i++) {
                View child = llEpisodesList.getChildAt(i);
                String tag = child.getContentDescription() != null ? child.getContentDescription().toString() : "";
                boolean isMatch = newEpId.equals(tag) || newEpId.equals(child.getTag());
                View nowBadge = child.findViewWithTag("badge_now");
                if (nowBadge != null) {
                    nowBadge.setVisibility(isMatch ? View.VISIBLE : View.GONE);
                }
                if (isMatch) {
                    child.setTag("current_ep");
                } else {
                    child.setTag(tag);
                }
            }
        }

        // Cargar y reproducir el nuevo stream en ExoPlayer sin salir
        if (player != null) {
            player.stop();
            loadingSpinner.setVisibility(View.VISIBLE);
            errorLayout.setVisibility(View.GONE);
            MediaItem mediaItem = MediaItem.fromUri(newUrl);
            player.setMediaItem(mediaItem);
            player.prepare();
            player.play();
        } else {
            initPlayer();
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

            // Garantizar que al mostrar controles el foco siempre quede en el botón central de Play/Pausa
            playerView.setControllerVisibilityListener(new PlayerView.ControllerVisibilityListener() {
                @Override
                public void onVisibilityChanged(int visibility) {
                    if (visibility == View.VISIBLE) {
                        focusCenterControl();
                    }
                }
            });

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
                    // Si el servidor IPTV responde con 404/recurso no encontrado o error de contenedor,
                    // reintentar silenciosamente con la otra extensión exactamente como hace TiviMate
                    if ((error.errorCode == PlaybackException.ERROR_CODE_IO_BAD_HTTP_STATUS ||
                         error.errorCode == PlaybackException.ERROR_CODE_IO_FILE_NOT_FOUND ||
                         error.errorCode == PlaybackException.ERROR_CODE_PARSING_CONTAINER_UNSUPPORTED) &&
                        !hasTriedExtensionFallback && streamUrl != null && !streamUrl.isEmpty()) {
                        hasTriedExtensionFallback = true;
                        String newUrl = streamUrl;
                        if (streamUrl.matches(".*\\.m3u8(\\?.*)?$")) {
                            newUrl = streamUrl.replaceFirst("\\.m3u8(\\?|$)", ".ts$1");
                        } else if (streamUrl.matches(".*\\.ts(\\?.*)?$")) {
                            newUrl = streamUrl.replaceFirst("\\.ts(\\?|$)", ".m3u8$1");
                        } else if (streamUrl.matches(".*\\.mp4(\\?.*)?$")) {
                            newUrl = streamUrl.replaceFirst("\\.mp4(\\?|$)", ".mkv$1");
                        } else if (streamUrl.matches(".*\\.mkv(\\?.*)?$")) {
                            newUrl = streamUrl.replaceFirst("\\.mkv(\\?|$)", ".mp4$1");
                        }
                        if (!newUrl.equals(streamUrl)) {
                            streamUrl = newUrl;
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

                    // 3. 🛡️ Salto automático a LibVLC nativo si el chip del televisor no puede decodificar con ExoPlayer
                    if (!hasTriedVlcFallback && streamUrl != null && !streamUrl.isEmpty()) {
                        hasTriedVlcFallback = true;
                        try {
                            Intent vlcIntent = new Intent(ExoPlayerActivity.this, VlcPlayerActivity.class);
                            vlcIntent.putExtra("url", streamUrl);
                            vlcIntent.putExtra("title", title);
                            startActivity(vlcIntent);
                            finish();
                            return;
                        } catch (Exception ex) {
                            ex.printStackTrace();
                        }
                    }

                    boolean isDts = error.getMessage() != null && error.getMessage().toLowerCase().contains("dts");
                    showError("Error de reproducción (" + error.getErrorCodeName() + "): " + 
                            (isDts ? "Esta película contiene audio DTS multicanal no soportado por el chip de este televisor." : error.getMessage()));
                    
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

    private void focusCenterControl() {
        if (playerView == null) return;
        playerView.post(() -> {
            View play = playerView.findViewById(androidx.media3.ui.R.id.exo_play);
            View pause = playerView.findViewById(androidx.media3.ui.R.id.exo_pause);
            View ffwd = playerView.findViewById(androidx.media3.ui.R.id.exo_ffwd);
            if (play != null && play.getVisibility() == View.VISIBLE) {
                play.requestFocus();
            } else if (pause != null && pause.getVisibility() == View.VISIBLE) {
                pause.requestFocus();
            } else if (ffwd != null && ffwd.getVisibility() == View.VISIBLE) {
                ffwd.requestFocus();
            }
        });
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
        View focused = getCurrentFocus();
        boolean inCarousel = isViewInCarousel(focused);

        switch (keyCode) {
            case KeyEvent.KEYCODE_BACK:
                if (event.getAction() == KeyEvent.ACTION_DOWN) {
                    if (inCarousel) {
                        focusCenterControl();
                        return true;
                    }
                    finish();
                }
                return true;

            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
            case KeyEvent.KEYCODE_NUMPAD_ENTER:
                if (inCarousel && focused != null) {
                    if (event.getAction() == KeyEvent.ACTION_DOWN) {
                        focused.performClick();
                    }
                    return true;
                }
                if (event.getAction() == KeyEvent.ACTION_DOWN) {
                    if (player.isPlaying()) {
                        player.pause();
                    } else {
                        player.play();
                    }
                    if (playerView != null) {
                        playerView.showController();
                        focusCenterControl();
                    }
                }
                return true;

            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
            case KeyEvent.KEYCODE_SPACE:
                if (event.getAction() == KeyEvent.ACTION_DOWN) {
                    if (player.isPlaying()) {
                        player.pause();
                    } else {
                        player.play();
                    }
                    if (playerView != null) {
                        playerView.showController();
                        focusCenterControl();
                    }
                }
                return true;

            case KeyEvent.KEYCODE_MEDIA_PLAY:
                if (event.getAction() == KeyEvent.ACTION_DOWN) {
                    player.play();
                    if (playerView != null) {
                        playerView.showController();
                        focusCenterControl();
                    }
                }
                return true;

            case KeyEvent.KEYCODE_MEDIA_PAUSE:
                if (event.getAction() == KeyEvent.ACTION_DOWN) {
                    player.pause();
                    if (playerView != null) {
                        playerView.showController();
                        focusCenterControl();
                    }
                }
                return true;

            case KeyEvent.KEYCODE_DPAD_LEFT:
                if (inCarousel) {
                    return super.dispatchKeyEvent(event);
                }
                if (event.getAction() == KeyEvent.ACTION_DOWN) {
                    if (!isLive && player.isCurrentMediaItemSeekable()) {
                        long current = player.getCurrentPosition();
                        player.seekTo(Math.max(0, current - 10000));
                        if (playerView != null) {
                            playerView.showController();
                            focusCenterControl();
                        }
                    }
                }
                return true;

            case KeyEvent.KEYCODE_MEDIA_REWIND:
            case KeyEvent.KEYCODE_MEDIA_STEP_BACKWARD:
                if (event.getAction() == KeyEvent.ACTION_DOWN) {
                    if (!isLive && player.isCurrentMediaItemSeekable()) {
                        long current = player.getCurrentPosition();
                        player.seekTo(Math.max(0, current - 10000));
                        if (playerView != null) {
                            playerView.showController();
                            focusCenterControl();
                        }
                    }
                }
                return true;

            case KeyEvent.KEYCODE_DPAD_RIGHT:
                if (inCarousel) {
                    return super.dispatchKeyEvent(event);
                }
                if (event.getAction() == KeyEvent.ACTION_DOWN) {
                    if (!isLive && player.isCurrentMediaItemSeekable()) {
                        long current = player.getCurrentPosition();
                        player.seekTo(current + 10000);
                        if (playerView != null) {
                            playerView.showController();
                            focusCenterControl();
                        }
                    }
                }
                return true;

            case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD:
            case KeyEvent.KEYCODE_MEDIA_STEP_FORWARD:
                if (event.getAction() == KeyEvent.ACTION_DOWN) {
                    if (!isLive && player.isCurrentMediaItemSeekable()) {
                        long current = player.getCurrentPosition();
                        player.seekTo(current + 10000);
                        if (playerView != null) {
                            playerView.showController();
                            focusCenterControl();
                        }
                    }
                }
                return true;

            case KeyEvent.KEYCODE_DPAD_UP:
                if (playerView != null && !playerView.isControllerFullyVisible()) {
                    if (event.getAction() == KeyEvent.ACTION_DOWN) {
                        playerView.showController();
                        focusCenterControl();
                    }
                    return true;
                }
                if (inCarousel) {
                    if (event.getAction() == KeyEvent.ACTION_DOWN) {
                        if (!isLive && playerView != null) {
                            View progress = playerView.findViewById(androidx.media3.ui.R.id.exo_progress);
                            if (progress != null && progress.getVisibility() == View.VISIBLE) {
                                progress.requestFocus();
                                return true;
                            }
                        }
                        focusCenterControl();
                    }
                    return true;
                }
                break;

            case KeyEvent.KEYCODE_DPAD_DOWN:
                if (playerView != null) {
                    if (event.getAction() == KeyEvent.ACTION_DOWN) {
                        // 📺 Si el carrusel de capítulos o canales existe:
                        // Con pulsar Flecha Abajo en cualquier momento se muestra y se enfoca directamente
                        if (!inCarousel && llEpisodesList != null && llEpisodesList.getChildCount() > 0) {
                            if (!playerView.isControllerFullyVisible()) {
                                playerView.showController();
                            }
                            View currentEpView = llEpisodesList.findViewWithTag("current_ep");
                            if (currentEpView != null) {
                                currentEpView.requestFocus();
                            } else {
                                llEpisodesList.getChildAt(0).requestFocus();
                            }
                            return true;
                        } else if (!playerView.isControllerFullyVisible()) {
                            playerView.showController();
                            focusCenterControl();
                            return true;
                        }
                    }
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
