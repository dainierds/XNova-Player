package com.xnovaplayer.app.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.tv.material3.ColorScheme
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.darkColorScheme

val XNovaVoid = Color(0xFF070B14)
val XNovaDarkSurface = Color(0xFF0F172A)
val XNovaCardBg = Color(0xFF1E293B)
val XNovaCyan = Color(0xFF00F0FF)
val XNovaPurple = Color(0xFF8B5CF6)
val XNovaGold = Color(0xFFFFD700)
val XNovaTextPrimary = Color(0xFFF8FAFC)
val XNovaTextSecondary = Color(0xFF94A3B8)
val XNovaBorder = Color(0x3338BDF8)

private val DarkColorScheme = darkColorScheme(
    primary = XNovaCyan,
    onPrimary = Color.Black,
    secondary = XNovaPurple,
    onSecondary = Color.White,
    background = XNovaVoid,
    onBackground = XNovaTextPrimary,
    surface = XNovaDarkSurface,
    onSurface = XNovaTextPrimary,
    border = XNovaBorder
)

@Composable
fun XNovaTvTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
