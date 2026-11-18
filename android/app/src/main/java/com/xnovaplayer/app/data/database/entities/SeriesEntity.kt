package com.xnovaplayer.app.data.database.entities

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "series",
    indices = [
        Index(value = ["categoryId"]),
        Index(value = ["name"]),
        Index(value = ["lastModified"])
    ]
)
data class SeriesEntity(
    @PrimaryKey
    val seriesId: Int,
    val num: Int = 0,
    val name: String,
    val seriesType: String? = null,
    val cover: String? = null,
    val plot: String? = null,
    val cast: String? = null,
    val director: String? = null,
    val genre: String? = null,
    val releaseDate: String? = null,
    val lastModified: String? = null,
    val rating: String? = null,
    val rating5based: Float = 0f,
    val backdropPath: String? = null,
    val youtubeTrailer: String? = null,
    val episodeRunTime: String? = null,
    val categoryId: String
)
