package com.xnovaplayer.app.data.database.entities

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "movies",
    indices = [
        Index(value = ["categoryId"]),
        Index(value = ["name"]),
        Index(value = ["added"])
    ]
)
data class MovieEntity(
    @PrimaryKey
    val streamId: Int,
    val num: Int = 0,
    val name: String,
    val streamType: String = "movie",
    val streamIcon: String? = null,
    val rating: String? = null,
    val rating5based: Float = 0f,
    val added: String? = null,
    val categoryId: String,
    val containerExtension: String = "mkv",
    val customSid: String? = null,
    val directSource: String? = null
)
