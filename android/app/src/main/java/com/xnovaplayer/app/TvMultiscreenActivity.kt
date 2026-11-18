package com.xnovaplayer.app

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.xnovaplayer.app.ui.TvMultiscreenScreen

class TvMultiscreenActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        val server = intent.getStringExtra("server") ?: "https://tupdvr24.com:443"
        val user = intent.getStringExtra("user") ?: "dainiersan8play"
        val pass = intent.getStringExtra("pass") ?: "uys1dg3e"

        setContent {
            TvMultiscreenScreen(
                serverUrl = server,
                user = user,
                pass = pass,
                onExit = { finish() }
            )
        }
    }
}
