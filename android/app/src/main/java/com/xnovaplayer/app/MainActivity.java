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
                getBridge().setWebViewClient(new BridgeWebViewClient(getBridge()) {
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
                        playExoPlayer(url, title, posterUrl, isLive, null);
                    }

                    @JavascriptInterface
                    public void playExoPlayer(String url, String title, String posterUrl, boolean isLive, String seriesInfoJson) {
                        try {
                            Intent intent = new Intent(MainActivity.this, ExoPlayerActivity.class);
                            intent.putExtra("url", url);
                            intent.putExtra("title", title);
                            intent.putExtra("posterUrl", posterUrl);
                            intent.putExtra("isLive", isLive);
                            if (seriesInfoJson != null && !seriesInfoJson.isEmpty()) {
                                intent.putExtra("seriesInfoJson", seriesInfoJson);
                            }
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

                // ⚡ Puente oficial para abrir el Catálogo 100% Nativo en Jetpack Compose & SQLite Room
                webView.addJavascriptInterface(new Object() {
                    @JavascriptInterface
                    public void openNativeCatalog(String server, String user, String pass) {
                        try {
                            Intent intent = new Intent(MainActivity.this, TvMainActivity.class);
                            intent.putExtra("server", server);
                            intent.putExtra("user", user);
                            intent.putExtra("pass", pass);
                            startActivity(intent);
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }

                    @JavascriptInterface
                    public void openNativeLiveTv(String server, String user, String pass) {
                        try {
                            Intent intent = new Intent(MainActivity.this, TvLivePlayerActivity.class);
                            intent.putExtra("server", server);
                            intent.putExtra("user", user);
                            intent.putExtra("pass", pass);
                            startActivity(intent);
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }

                    @JavascriptInterface
                    public void openNativeMultiscreen(String server, String user, String pass) {
                        try {
                            Intent intent = new Intent(MainActivity.this, TvMultiscreenActivity.class);
                            intent.putExtra("server", server);
                            intent.putExtra("user", user);
                            intent.putExtra("pass", pass);
                            startActivity(intent);
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }

                    @JavascriptInterface
                    public void openNativeEpgGuide(String server, String user, String pass) {
                        try {
                            Intent intent = new Intent(MainActivity.this, TvEpgGuideActivity.class);
                            intent.putExtra("server", server);
                            intent.putExtra("user", user);
                            intent.putExtra("pass", pass);
                            startActivity(intent);
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }

                    @JavascriptInterface
                    public boolean isAvailable() {
                        return true;
                    }
                }, "NativeTvCatalogBridge");

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

                // 🔄 Puente nativo oficial para actualización OTA interna sin usar Downloader
                webView.addJavascriptInterface(new Object() {
                    @JavascriptInterface
                    public void downloadAndInstall(String downloadUrl) {
                        new Thread(() -> {
                            try {
                                java.net.URL url = new java.net.URL(downloadUrl);
                                java.net.HttpURLConnection conn = null;
                                int redirects = 0;
                                while (redirects < 5) {
                                    conn = (java.net.HttpURLConnection) url.openConnection();
                                    conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android TV; XNova-Updater)");
                                    conn.setInstanceFollowRedirects(true);
                                    conn.connect();
                                    int status = conn.getResponseCode();
                                    if (status == java.net.HttpURLConnection.HTTP_MOVED_TEMP
                                        || status == java.net.HttpURLConnection.HTTP_MOVED_PERM
                                        || status == 307 || status == 308) {
                                        String newUrl = conn.getHeaderField("Location");
                                        if (newUrl != null) {
                                            url = new java.net.URL(newUrl);
                                            redirects++;
                                            continue;
                                        }
                                    }
                                    break;
                                }

                                int fileLength = conn.getContentLength();
                                java.io.File cacheDir = getExternalCacheDir() != null ? getExternalCacheDir() : getCacheDir();
                                java.io.File apkFile = new java.io.File(cacheDir, "XNovaUpdate.apk");
                                if (apkFile.exists()) {
                                    apkFile.delete();
                                }

                                java.io.InputStream input = conn.getInputStream();
                                java.io.FileOutputStream output = new java.io.FileOutputStream(apkFile);

                                byte[] buffer = new byte[16384];
                                long total = 0;
                                int count;
                                long lastProgressTime = 0;

                                while ((count = input.read(buffer)) != -1) {
                                    total += count;
                                    output.write(buffer, 0, count);
                                    long now = System.currentTimeMillis();
                                    if (fileLength > 0 && (now - lastProgressTime > 200)) {
                                        lastProgressTime = now;
                                        final int progress = (int) (total * 100 / fileLength);
                                        runOnUiThread(() -> {
                                            webView.evaluateJavascript(
                                                "window.dispatchEvent(new CustomEvent('native_update_progress', { detail: { percent: " + progress + " } }));",
                                                null
                                            );
                                        });
                                    }
                                }

                                output.flush();
                                output.close();
                                input.close();

                                // Validar que el archivo descargado no esté vacío o incompleto (mínimo 1MB)
                                if (!apkFile.exists() || apkFile.length() < 1000000) {
                                    throw new java.io.IOException("El paquete descargado está incompleto o dañado. Por favor, reintenta.");
                                }

                                // Otorgar permisos de lectura al archivo para el instalador del sistema
                                apkFile.setReadable(true, false);

                                // Notificar que la descarga terminó y se abre el instalador
                                runOnUiThread(() -> {
                                    webView.evaluateJavascript(
                                        "window.dispatchEvent(new CustomEvent('native_update_progress', { detail: { percent: 100, installing: true } }));",
                                        null
                                    );
                                });

                                // Si es Android 8+ y no tiene permiso para instalar apps desconocidas, solicitarlo y detener para no causar bloqueo
                                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                                    if (!getPackageManager().canRequestPackageInstalls()) {
                                        runOnUiThread(() -> {
                                            webView.evaluateJavascript(
                                                "window.dispatchEvent(new CustomEvent('native_update_error', { detail: { error: 'Debes conceder permiso para instalar apps desconocidas a XNova Player en Ajustes y luego volver a presionar Actualizar.' } }));",
                                                null
                                            );
                                        });
                                        try {
                                            Intent settingsIntent = new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                                            settingsIntent.setData(Uri.parse("package:" + getPackageName()));
                                            settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                            startActivity(settingsIntent);
                                        } catch (Exception se) {
                                            Intent fallbackSettings = new Intent(android.provider.Settings.ACTION_SECURITY_SETTINGS);
                                            fallbackSettings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                            startActivity(fallbackSettings);
                                        }
                                        return;
                                    }
                                }

                                // Invocar el instalador oficial del sistema operativo con permisos completos
                                Uri apkUri = androidx.core.content.FileProvider.getUriForFile(
                                    MainActivity.this,
                                    getPackageName() + ".fileprovider",
                                    apkFile
                                );

                                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                                installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                                installIntent.addFlags(Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);

                                // Otorgar permisos de lectura explícitos a todas las apps que puedan manejar la instalación
                                java.util.List<android.content.pm.ResolveInfo> resolveInfoList = getPackageManager().queryIntentActivities(installIntent, android.content.pm.PackageManager.MATCH_DEFAULT_ONLY);
                                for (android.content.pm.ResolveInfo resolveInfo : resolveInfoList) {
                                    try {
                                        grantUriPermission(resolveInfo.activityInfo.packageName, apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                                    } catch (Exception ignored) {}
                                }
                                try {
                                    grantUriPermission("com.google.android.packageinstaller", apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                                } catch (Exception ignored) {}
                                try {
                                    grantUriPermission("com.android.packageinstaller", apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                                } catch (Exception ignored) {}

                                startActivity(installIntent);

                            } catch (Exception e) {
                                e.printStackTrace();
                                final String errMsg = e.getMessage() != null ? e.getMessage().replace("'", "\\'") : "Error de descarga";
                                runOnUiThread(() -> {
                                    webView.evaluateJavascript(
                                        "window.dispatchEvent(new CustomEvent('native_update_error', { detail: { error: '" + errMsg + "' } }));",
                                        null
                                    );
                                });
                            }
                        }).start();
                    }

                    @JavascriptInterface
                    public boolean isAvailable() {
                        return true;
                    }
                }, "NativeUpdaterBridge");
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
