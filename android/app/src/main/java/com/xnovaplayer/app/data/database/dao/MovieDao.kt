package com.xnovaplayer.app.data.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.xnovaplayer.app.data.database.entities.MovieEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface MovieDao {
    @Query("SELECT * FROM movies WHERE categoryId = :categoryId ORDER BY streamId DESC")
    fun getMoviesByCategory(categoryId: String): Flow<List<MovieEntity>>

    @Query("SELECT * FROM movies WHERE categoryId = :categoryId ORDER BY streamId DESC")
    suspend fun getMoviesByCategoryList(categoryId: String): List<MovieEntity>

    @Query("SELECT * FROM movies WHERE name LIKE '%' || :query || '%' ORDER BY streamId DESC LIMIT 100")
    fun searchMovies(query: String): Flow<List<MovieEntity>>

    @Query("SELECT * FROM movies WHERE streamId = :streamId LIMIT 1")
    suspend fun getMovieById(streamId: Int): MovieEntity?

    @Query("SELECT COUNT(*) FROM movies")
    suspend fun getCount(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(movies: List<MovieEntity>)

    @Query("DELETE FROM movies WHERE categoryId = :categoryId")
    suspend fun deleteByCategory(categoryId: String)

    @Query("DELETE FROM movies")
    suspend fun clearAll()
}
