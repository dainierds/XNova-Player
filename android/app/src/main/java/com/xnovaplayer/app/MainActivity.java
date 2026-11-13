package com.xnovaplayer.app;

import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Permitir reproducción automática de video con audio sin requerir gesto previo del usuario
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                settings.setMediaPlaybackRequiresUserGesture(false);
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
