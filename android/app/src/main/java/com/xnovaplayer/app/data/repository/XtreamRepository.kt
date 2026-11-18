package com.xnovaplayer.app.data.repository

import com.xnovaplayer.app.data.api.XtreamApiService
import com.xnovaplayer.app.data.api.XtreamClient
import com.xnovaplayer.app.data.api.models.XtreamAuthResponse
import com.xnovaplayer.app.data.database.AppDatabase
import com.xnovaplayer.app.data.database.entities.CategoryEntity
import com.xnovaplayer.app.data.database.entities.ChannelEntity
import com.xnovaplayer.app.data.database.entities.MovieEntity
import com.xnovaplayer.app.data.database.entities.SeriesEntity
import com.xnovaplayer.app.data.database.entities.WatchHistoryEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext

class XtreamRepository(
    private val database: AppDatabase,
    var serverUrl: String = XtreamClient.DEFAULT_SERVER,
    var username: String = "",
    var password: String = ""
) {

    private var api: XtreamApiService = XtreamClient.createService(serverUrl)

    fun updateCredentials(server: String, user: String, pass: String) {
        this.serverUrl = server
        this.username = user
        this.password = pass
        this.api = XtreamClient.createService(server)
    }

    suspend fun login(): Result<XtreamAuthResponse> = withContext(Dispatchers.IO) {
        try {
            val response = api.authenticate(username, password)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.userInfo?.auth == 1) {
                    Result.success(body)
                } else {
                    Result.failure(Exception("Usuario o contraseña incorrectos en el servidor."))
                }
            } else {
                Result.failure(Exception("Error de conexión con el servidor (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ── CARPETAS / CATEGORÍAS ──
    fun observeCategories(type: String): Flow<List<CategoryEntity>> =
        database.categoryDao().getCategoriesByType(type)

    suspend fun syncCategories(type: String): Result<Int> = withContext(Dispatchers.IO) {
        try {
            val response = when (type) {
                "movies" -> api.getVodCategories(username, password)
                "series" -> api.getSeriesCategories(username, password)
                else -> api.getLiveCategories(username, password)
            }

            if (response.isSuccessful && response.body() != null) {
                val dtoList = response.body()!!
                val entities = dtoList.map { dto ->
                    CategoryEntity(
                        categoryId = dto.categoryId,
                        categoryName = dto.categoryName,
                        parentId = dto.parentId,
                        type = type
                    )
                }
                database.categoryDao().clearByType(type)
                database.categoryDao().insertAll(entities)
                Result.success(entities.size)
            } else {
                Result.failure(Exception("Error al descargar categorías de $type: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ── PELÍCULAS (VOD) ──
    fun observeMoviesByCategory(categoryId: String): Flow<List<MovieEntity>> =
        database.movieDao().getMoviesByCategory(categoryId)

    fun searchMovies(query: String): Flow<List<MovieEntity>> =
        database.movieDao().searchMovies(query)

    suspend fun syncMovies(): Result<Int> = withContext(Dispatchers.IO) {
        try {
            val response = api.getVodStreams(username, password)
            if (response.isSuccessful && response.body() != null) {
                val dtoList = response.body()!!
                val entities = dtoList.map { dto ->
                    MovieEntity(
                        streamId = dto.streamId,
                        num = dto.num,
                        name = dto.name,
                        streamType = dto.streamType ?: "movie",
                        streamIcon = dto.streamIcon,
                        rating = dto.rating,
                        rating5based = dto.rating5based,
                        added = dto.added,
                        categoryId = dto.categoryId,
                        containerExtension = dto.containerExtension?.trimStart('.') ?: "mkv",
                        customSid = dto.customSid,
                        directSource = dto.directSource
                    )
                }
                database.movieDao().clearAll()
                // Inserción en bloques de 1.000 para optimizar memoria en Smart TV
                entities.chunked(1000).forEach { chunk ->
                    database.movieDao().insertAll(chunk)
                }
                Result.success(entities.size)
            } else {
                Result.failure(Exception("Error al descargar catálogo de películas: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ── SERIES ──
    fun observeSeriesByCategory(categoryId: String): Flow<List<SeriesEntity>> =
        database.seriesDao().getSeriesByCategory(categoryId)

    fun searchSeries(query: String): Flow<List<SeriesEntity>> =
        database.seriesDao().searchSeries(query)

    suspend fun syncSeries(): Result<Int> = withContext(Dispatchers.IO) {
        try {
            val response = api.getSeries(username, password)
            if (response.isSuccessful && response.body() != null) {
                val dtoList = response.body()!!
                val entities = dtoList.map { dto ->
                    SeriesEntity(
                        seriesId = dto.seriesId,
                        num = dto.num,
                        name = dto.name,
                        seriesType = dto.seriesType,
                        cover = dto.cover,
                        plot = dto.plot,
                        cast = dto.cast,
                        director = dto.director,
                        genre = dto.genre,
                        releaseDate = dto.releaseDate,
                        lastModified = dto.lastModified,
                        rating = dto.rating,
                        rating5based = dto.rating5based,
                        backdropPath = dto.backdropPath?.toString(),
                        youtubeTrailer = dto.youtubeTrailer,
                        episodeRunTime = dto.episodeRunTime,
                        categoryId = dto.categoryId
                    )
                }
                database.seriesDao().clearAll()
                entities.chunked(1000).forEach { chunk ->
                    database.seriesDao().insertAll(chunk)
                }
                Result.success(entities.size)
            } else {
                Result.failure(Exception("Error al descargar catálogo de series: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ── CANALES DE TV EN VIVO ──
    fun observeChannelsByCategory(categoryId: String): Flow<List<ChannelEntity>> =
        database.channelDao().getChannelsByCategory(categoryId)

    fun searchChannels(query: String): Flow<List<ChannelEntity>> =
        database.channelDao().searchChannels(query)

    suspend fun syncChannels(): Result<Int> = withContext(Dispatchers.IO) {
        try {
            val response = api.getLiveStreams(username, password)
            if (response.isSuccessful && response.body() != null) {
                val dtoList = response.body()!!
                val entities = dtoList.map { dto ->
                    ChannelEntity(
                        streamId = dto.streamId,
                        num = dto.num,
                        name = dto.name,
                        streamType = dto.streamType ?: "live",
                        streamIcon = dto.streamIcon,
                        epgChannelId = dto.epgChannelId,
                        added = dto.added,
                        categoryId = dto.categoryId,
                        customSid = dto.customSid,
                        tvArchive = dto.tvArchive,
                        directSource = dto.directSource
                    )
                }
                database.channelDao().clearAll()
                entities.chunked(1000).forEach { chunk ->
                    database.channelDao().insertAll(chunk)
                }
                Result.success(entities.size)
            } else {
                Result.failure(Exception("Error al descargar canales de TV: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ── HISTORIAL / CONTINUAR VIENDO ──
    fun observeWatchHistory(limit: Int = 30): Flow<List<WatchHistoryEntity>> =
        database.watchHistoryDao().getRecentHistory(limit)

    suspend fun saveWatchHistory(item: WatchHistoryEntity) = withContext(Dispatchers.IO) {
        database.watchHistoryDao().upsert(item)
    }

    suspend fun removeFromHistory(id: String) = withContext(Dispatchers.IO) {
        database.watchHistoryDao().deleteById(id)
    }
}
