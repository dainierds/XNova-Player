package com.xnovaplayer.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.foundation.lazy.grid.TvGridCells
import androidx.tv.foundation.lazy.grid.TvLazyVerticalGrid
import androidx.tv.foundation.lazy.grid.items
import androidx.tv.material3.*
import coil.compose.AsyncImage
import com.xnovaplayer.app.data.database.entities.MovieEntity
import com.xnovaplayer.app.ui.theme.XNovaCardBg
import com.xnovaplayer.app.ui.theme.XNovaCyan
import com.xnovaplayer.app.ui.theme.XNovaGold
import com.xnovaplayer.app.ui.theme.XNovaTextSecondary

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun MovieGrid(
    movies: List<MovieEntity>,
    onMovieFocused: (MovieEntity) -> Unit,
    onMovieClicked: (MovieEntity) -> Unit,
    modifier: Modifier = Modifier
) {
    if (movies.isEmpty()) {
        Box(
            modifier = modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "No hay títulos disponibles en esta categoría",
                color = XNovaTextSecondary,
                fontSize = 16.sp
            )
        }
    } else {
        TvLazyVerticalGrid(
            columns = TvGridCells.Fixed(5),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            modifier = modifier.fillMaxSize()
        ) {
            items(movies, key = { it.streamId }) { movie ->
                MovieCard(
                    movie = movie,
                    onFocused = { onMovieFocused(movie) },
                    onClick = { onMovieClicked(movie) }
                )
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun MovieCard(
    movie: MovieEntity,
    onFocused: () -> Unit,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.08f),
        border = ClickableSurfaceDefaults.border(
            border = Border(BorderStroke(1.dp, Color(0x2238BDF8))),
            focusedBorder = Border(BorderStroke(2.5.dp, XNovaCyan))
        ),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = XNovaCardBg,
            focusedContainerColor = Color(0xFF1E293B)
        ),
        modifier = Modifier
            .fillMaxWidth()
            .height(240.dp)
            .onFocusChanged { state ->
                if (state.isFocused) {
                    onFocused()
                }
            }
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .background(Color(0xFF0F172A))
            ) {
                AsyncImage(
                    model = movie.streamIcon,
                    contentDescription = movie.name,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )

                // Badge de Formato (MKV / MP4)
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(6.dp)
                        .background(Color(0xCC000000), RoundedCornerShape(4.dp))
                        .padding(horizontal = 4.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = movie.containerExtension.uppercase(),
                        color = XNovaCyan,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Badge de Rating
                if (movie.rating5based > 0f) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(6.dp)
                            .background(Color(0xCC000000), RoundedCornerShape(4.dp))
                            .padding(horizontal = 4.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = "★ ${"%.1f".format(movie.rating5based)}",
                            color = XNovaGold,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // Nombre de la película debajo del poster
            Text(
                text = movie.name,
                color = Color.White,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 6.dp, vertical = 6.dp)
            )
        }
    }
}
