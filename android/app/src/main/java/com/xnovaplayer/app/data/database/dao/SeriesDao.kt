package com.xnovaplayer.app.data.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.xnovaplayer.app.data.database.entities.EpisodeEntity
import com.xnovaplayer.app.data.database.entities.SeriesEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SeriesDao {
    @Query("SELECT * FROM series WHERE categoryId = :categoryId ORDER BY seriesId DESC")
    fun getSeriesByCategory(categoryId: String): Flow<List<SeriesEntity>>

    @Query("SELECT * FROM series WHERE categoryId = :categoryId ORDER BY seriesId DESC")
    suspend fun getSeriesByCategoryList(categoryId: String): List<SeriesEntity>

    @Query("SELECT * FROM series WHERE name LIKE '%' || :query || '%' ORDER BY seriesId DESC LIMIT 100")
    fun searchSeries(query: String): Flow<List<SeriesEntity>>

    @Query("SELECT * FROM series WHERE seriesId = :seriesId LIMIT 1")
    suspend fun getSeriesById(seriesId: Int): SeriesEntity?

    @Query("SELECT COUNT(*) FROM series")
    suspend fun getCount(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(series: List<SeriesEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEpisodes(episodes: List<EpisodeEntity>)

    @Query("SELECT * FROM episodes WHERE seriesId = :seriesId AND seasonNumber = :seasonNumber ORDER BY episodeNum ASC")
    fun getEpisodes(seriesId: Int, seasonNumber: Int): Flow<List<EpisodeEntity>>

    @Query("DELETE FROM episodes WHERE seriesId = :seriesId")
    suspend fun clearEpisodesForSeries(seriesId: Int)

    @Query("DELETE FROM series")
    suspend fun clearAll()
}
