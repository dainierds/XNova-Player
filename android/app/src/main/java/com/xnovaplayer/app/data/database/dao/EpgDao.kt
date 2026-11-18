package com.xnovaplayer.app.data.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.xnovaplayer.app.data.database.entities.EpgProgramEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface EpgDao {

    @Query("SELECT * FROM epg_programs WHERE channelId = :channelId ORDER BY start ASC")
    fun getProgramsForChannel(channelId: String): Flow<List<EpgProgramEntity>>

    @Query("SELECT * FROM epg_programs WHERE channelId = :channelId ORDER BY start ASC")
    suspend fun getProgramsForChannelList(channelId: String): List<EpgProgramEntity>

    @Query("SELECT * FROM epg_programs WHERE streamId = :streamId AND start <= :now AND end >= :now LIMIT 1")
    suspend fun getCurrentProgram(streamId: Int, now: Long): EpgProgramEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(programs: List<EpgProgramEntity>)

    @Query("DELETE FROM epg_programs WHERE end < :cutoff")
    suspend fun deleteOldPrograms(cutoff: Long)

    @Query("DELETE FROM epg_programs")
    suspend fun clearAll()
}
