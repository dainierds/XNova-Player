package com.xnovaplayer.app

import android.net.Uri
import android.os.Bundle
import android.view.WindowManager
import androidx.appcompat.app.AppCompatActivity
import org.videolan.libvlc.LibVLC
import org.videolan.libvlc.Media
import org.videolan.libvlc.MediaPlayer
import org.videolan.libvlc.util.VLCVideoLayout

class VlcPlayerActivity : AppCompatActivity() {

    private var libVLC: LibVLC? = null
    private var mediaPlayer: MediaPlayer? = null
    private lateinit var videoLayout: VLCVideoLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        videoLayout = VLCVideoLayout(this)
        setContentView(videoLayout)

        val streamUrl = intent.getStringExtra("url")
        if (streamUrl.isNullOrBlank()) {
            finish()
            return
        }

        val options = arrayListOf(
            "--no-sub-autodetect-file",
            "--network-caching=2500",
            "--http-reconnect",
            "--clock-jitter=0",
            "--drop-late-frames",
            "--skip-frames"
        )

        try {
            libVLC = LibVLC(this, options)
            mediaPlayer = MediaPlayer(libVLC).apply {
                attachViews(videoLayout, null, false, false)
                val media = Media(libVLC, Uri.parse(streamUrl)).apply {
                    setHWDecoderEnabled(true, false)
                }
                setMedia(media)
                media.release()
                play()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            finish()
        }
    }

    override fun onStop() {
        super.onStop()
        mediaPlayer?.stop()
        mediaPlayer?.detachViews()
    }

    override fun onDestroy() {
        super.onDestroy()
        mediaPlayer?.release()
        libVLC?.release()
    }
}
