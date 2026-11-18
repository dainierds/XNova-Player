package com.xnovaplayer.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.xnovaplayer.app.data.database.entities.MovieEntity
import com.xnovaplayer.app.ui.theme.XNovaCyan
import com.xnovaplayer.app.ui.theme.XNovaDarkSurface
import com.xnovaplayer.app.ui.theme.XNovaGold
import com.xnovaplayer.app.ui.theme.XNovaTextSecondary

@Composable
fun HeroPreviewBanner(
    movie: MovieEntity?,
    onPlayClick: (MovieEntity) -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(280.dp)
            .background(XNovaDarkSurface)
    ) {
        if (movie != null) {
            // Fondo con Carátula cinematográfica oscurecida
            AsyncImage(
                model = movie.streamIcon,
                contentDescription = movie.name,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )

            // Gradiente cinematográfico para legibilidad
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(
                                Color(0xFF070B14),
                                Color(0xF2070B14),
                                Color(0x99070B14),
                                Color.Transparent
                            ),
                            startX = 0f,
                            endX = 1200f
                        )
                    )
            )

            // Contenido informativo
            Column(
                modifier = Modifier
                    .fillMaxHeight()
                    .width(620.dp)
                    .padding(start = 32.dp, top = 24.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    // Badges de calidad y rating
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(Color(0xFF00F0FF).copy(alpha = 0.2f))
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = movie.containerExtension.uppercase(),
                                color = XNovaCyan,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        if (movie.rating5based > 0f) {
                            Text(
                                text = "★ ${"%.1f".format(movie.rating5based)} / 5",
                                color = XNovaGold,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }

                        if (!movie.added.isNullOrBlank()) {
                            Text(
                                text = "Agregada recientemente",
                                color = XNovaTextSecondary,
                                fontSize = 12.sp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Título de la película
                    Text(
                        text = movie.name,
                        color = Color.White,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.ExtraBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Descripción
                    Text(
                        text = "Transmisión nativa de alta definición con decodificación de hardware acelerada en XNova Player.",
                        color = XNovaTextSecondary,
                        fontSize = 13.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        lineHeight = 18.sp
                    )
                }

                // Botón de reproducción rápida optimizado para TV D-Pad
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    Button(
                        onClick = { onPlayClick(movie) },
                        colors = ButtonDefaults.colors(
                            containerColor = XNovaCyan,
                            focusedContainerColor = Color.White
                        ),
                        shape = ButtonDefaults.shape(RoundedCornerShape(8.dp))
                    ) {
                        Text(
                            text = "▶ Reproducir Ahora",
                            color = Color.Black,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                    }
                }
            }
        }
    }
}
