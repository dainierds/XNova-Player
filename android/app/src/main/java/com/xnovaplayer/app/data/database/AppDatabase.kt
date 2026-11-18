package com.xnovaplayer.app.data.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.xnovaplayer.app.data.database.dao.CategoryDao
import com.xnovaplayer.app.data.database.dao.ChannelDao
import com.xnovaplayer.app.data.database.dao.EpgDao
import com.xnovaplayer.app.data.database.dao.MovieDao
import com.xnovaplayer.app.data.database.dao.SeriesDao
import com.xnovaplayer.app.data.database.dao.WatchHistoryDao
import com.xnovaplayer.app.data.database.entities.CategoryEntity
import com.xnovaplayer.app.data.database.entities.ChannelEntity
import com.xnovaplayer.app.data.database.entities.EpgProgramEntity
import com.xnovaplayer.app.data.database.entities.EpisodeEntity
import com.xnovaplayer.app.data.database.entities.MovieEntity
import com.xnovaplayer.app.data.database.entities.SeriesEntity
import com.xnovaplayer.app.data.database.entities.WatchHistoryEntity

@Database(
    entities = [
        CategoryEntity::class,
        MovieEntity::class,
        SeriesEntity::class,
        EpisodeEntity::class,
        ChannelEntity::class,
        WatchHistoryEntity::class,
        EpgProgramEntity::class
    ],
    version = 2,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {

    abstract fun categoryDao(): CategoryDao
    abstract fun movieDao(): MovieDao
    abstract fun seriesDao(): SeriesDao
    abstract fun channelDao(): ChannelDao
    abstract fun watchHistoryDao(): WatchHistoryDao
    abstract fun epgDao(): EpgDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "xnova_catalog.db"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
