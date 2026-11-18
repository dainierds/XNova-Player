package com.xnovaplayer.app.data.database.entities

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "watch_history",
    indices = [
        Index(value = ["watchedAt"])
    ]
)
data class WatchHistoryEntity(
    @PrimaryKey
    val id: String,
    val streamId: String,
    val title: String,
    val posterUrl: String? = null,
    val streamUrl: String,
    val type: String, // "movie", "series", "live"
    val watchedAt: Long = System.currentTimeMillis(),
    val playbackPositionMs: Long = 0L,
    val durationMs: Long = 0L,
    val seriesId: String? = null,
    val seasonNum: Int? = null,
    val episodeNum: Int? = null
)
