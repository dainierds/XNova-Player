package com.xnovaplayer.app.data.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.xnovaplayer.app.data.database.entities.ChannelEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ChannelDao {
    @Query("SELECT * FROM channels WHERE categoryId = :categoryId ORDER BY num ASC, streamId ASC")
    fun getChannelsByCategory(categoryId: String): Flow<List<ChannelEntity>>

    @Query("SELECT * FROM channels WHERE categoryId = :categoryId ORDER BY num ASC, streamId ASC")
    suspend fun getChannelsByCategoryList(categoryId: String): List<ChannelEntity>

    @Query("SELECT * FROM channels WHERE name LIKE '%' || :query || '%' ORDER BY num ASC LIMIT 100")
    fun searchChannels(query: String): Flow<List<ChannelEntity>>

    @Query("SELECT * FROM channels WHERE streamId = :streamId LIMIT 1")
    suspend fun getChannelById(streamId: Int): ChannelEntity?

    @Query("SELECT COUNT(*) FROM channels")
    suspend fun getCount(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(channels: List<ChannelEntity>)

    @Query("DELETE FROM channels")
    suspend fun clearAll()
}
