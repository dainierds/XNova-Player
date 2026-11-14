package com.xnovaplayer.app;

import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.JavascriptInterface;
import android.webkit.SslErrorHandler;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Configurar WebView para Android TV
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                // Permitir reproducción automática de video con audio sin requerir gesto previo del usuario
                settings.setMediaPlaybackRequiresUserGesture(false);

                // Permitir cargar imágenes y recursos HTTP en orígenes HTTPS sin ser bloqueados por Mixed Content
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

                // Permitir cargar imágenes de servidores IPTV aunque tengan certificados SSL autofirmados o expirados (igual que OkHttp en TiviMate y Kai TV)
                webView.setWebViewClient(new BridgeWebViewClient(getBridge()) {
                    @Override
                    public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                        if (handler != null) {
                            handler.proceed();
                        }
                    }
                });

                // User-Agent idéntico a TiviMate para que los servidores IPTV y CDNs no rechacen la descarga de pósters ni flujos
                settings.setUserAgentString("TiviMate/4.7.0 (Linux; Android 11; Media3; WebView)");

                // Habilitar almacenamiento y caché local para acelerar la carga de imágenes
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setAllowFileAccess(true);
                settings.setAllowContentAccess(true);

                // Eliminar icono nativo feo de play sobre fondo blanco que Android pone por defecto en los <video>
                webView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
                    @Override
                    public Bitmap getDefaultVideoPoster() {
                        return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888);
                    }
                });

                // Puente nativo para abrir reproductores externos (VLC, MX Player, Just Player) en Android TV
                webView.addJavascriptInterface(new Object() {
                    @JavascriptInterface
                    public void openExternalPlayer(String url, String title) {
                        try {
                            Intent intent = new Intent(Intent.ACTION_VIEW);
                            intent.setDataAndType(Uri.parse(url), "video/*");
                            intent.putExtra("title", title);
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(Intent.createChooser(intent, "Reproducir con..."));
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }
                }, "NativePlayerLauncher");

                // 🚀 Puente nativo oficial para reproducir con Google Media3 ExoPlayer (motor idéntico a TiviMate)
                webView.addJavascriptInterface(new Object() {
                    @JavascriptInterface
                    public void playExoPlayer(String url, String title, String posterUrl, boolean isLive) {
                        try {
                            Intent intent = new Intent(MainActivity.this, ExoPlayerActivity.class);
                            intent.putExtra("url", url);
                            intent.putExtra("title", title);
                            intent.putExtra("posterUrl", posterUrl);
                            intent.putExtra("isLive", isLive);
                            startActivity(intent);
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }

                    @JavascriptInterface
                    public boolean isAvailable() {
                        return true;
                    }
                }, "ExoPlayerBridge");

                // 🛑 Puente nativo para cerrar la aplicación al confirmar en el modal de salida
                webView.addJavascriptInterface(new Object() {
                    @JavascriptInterface
                    public void exitApp() {
                        runOnUiThread(() -> {
                            try {
                                finishAffinity();
                                System.exit(0);
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        });
                    }
                }, "AppExitBridge");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Interceptar botón Atrás físico del control remoto en Android TV / Fire TV
     * En lugar de cerrar la aplicación abruptamente, envía el evento de tecla Escape
     * al WebView para que la interfaz web retroceda de pantalla (reproductor -> catálogo -> inicio).
     */
    @Override
    public void onBackPressed() {
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.evaluateJavascript(
                    "window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Escape', 'code': 'Escape', 'keyCode': 27, 'which': 27, 'bubbles': true}));",
                    null
                );
                return;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        super.onBackPressed();
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            onBackPressed();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
