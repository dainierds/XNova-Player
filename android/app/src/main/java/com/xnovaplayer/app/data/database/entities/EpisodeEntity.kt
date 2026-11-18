package com.xnovaplayer.app.data.database.entities

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "episodes",
    indices = [
        Index(value = ["seriesId"]),
        Index(value = ["seriesId", "seasonNumber"])
    ]
)
data class EpisodeEntity(
    @PrimaryKey
    val id: String, // seriesId_seasonNum_episodeNum
    val episodeId: Int,
    val seriesId: Int,
    val seasonNumber: Int,
    val episodeNum: Int,
    val title: String,
    val containerExtension: String = "mkv",
    val cover: String? = null,
    val plot: String? = null,
    val durationSecs: Int = 0
)
