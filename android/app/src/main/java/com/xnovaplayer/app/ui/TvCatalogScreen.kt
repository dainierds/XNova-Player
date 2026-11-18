package com.xnovaplayer.app.ui

import android.content.Context
import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import com.xnovaplayer.app.ExoPlayerActivity
import com.xnovaplayer.app.data.api.XtreamClient
import com.xnovaplayer.app.data.database.entities.MovieEntity
import com.xnovaplayer.app.ui.components.CategorySidebar
import com.xnovaplayer.app.ui.components.HeroPreviewBanner
import com.xnovaplayer.app.ui.components.MovieGrid
import com.xnovaplayer.app.ui.theme.XNovaTvTheme
import com.xnovaplayer.app.ui.theme.XNovaVoid
import com.xnovaplayer.app.ui.viewmodel.CatalogViewModel

@Composable
fun TvCatalogScreen(
    serverUrl: String = XtreamClient.DEFAULT_SERVER,
    user: String = "dainiersan8play",
    pass: String = "uys1dg3e",
    viewModel: CatalogViewModel = viewModel()
) {
    val context = LocalContext.current
    val categories by viewModel.categories.collectAsState()
    val selectedCategory by viewModel.selectedCategory.collectAsState()
    val movies by viewModel.movies.collectAsState()
    val focusedMovie by viewModel.focusedMovie.collectAsState()

    // Sincronización inicial en segundo plano si la base de datos está vacía
    LaunchedEffect(Unit) {
        viewModel.syncCatalog(serverUrl, user, pass)
    }

    XNovaTvTheme {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .background(XNovaVoid)
        ) {
            // 1. Barra lateral de categorías (TV D-Pad optimizado)
            CategorySidebar(
                categories = categories,
                selectedCategory = selectedCategory,
                onCategoryClick = { category ->
                    viewModel.selectCategory(category)
                }
            )

            // 2. Columna principal (Hero Banner superior + Rejilla de Carátulas)
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
            ) {
                // Banner superior de película destacada
                HeroPreviewBanner(
                    movie = focusedMovie,
                    onPlayClick = { movie ->
                        launchMoviePlayback(context, serverUrl, user, pass, movie)
                    }
                )

                // Rejilla de películas 5 columnas (carga ultra rápida con Room)
                MovieGrid(
                    movies = movies,
                    onMovieFocused = { movie ->
                        viewModel.focusMovie(movie)
                    },
                    onMovieClicked = { movie ->
                        launchMoviePlayback(context, serverUrl, user, pass, movie)
                    },
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

private fun launchMoviePlayback(
    context: Context,
    serverUrl: String,
    user: String,
    pass: String,
    movie: MovieEntity
) {
    val streamExt = movie.containerExtension ?: "mkv"
    val streamUrl = XtreamClient.buildVodStreamUrl(serverUrl, user, pass, movie.streamId, streamExt)

    val intent = Intent(context, ExoPlayerActivity::class.java).apply {
        putExtra("url", streamUrl)
        putExtra("title", movie.name)
        putExtra("isLive", false)
    }
    context.startActivity(intent)
}
