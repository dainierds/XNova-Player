package com.xnovaplayer.app.data.database.entities

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "channels",
    indices = [
        Index(value = ["categoryId"]),
        Index(value = ["num"]),
        Index(value = ["name"])
    ]
)
data class ChannelEntity(
    @PrimaryKey
    val streamId: Int,
    val num: Int = 0,
    val name: String,
    val streamType: String = "live",
    val streamIcon: String? = null,
    val epgChannelId: String? = null,
    val added: String? = null,
    val categoryId: String,
    val customSid: String? = null,
    val tvArchive: Int = 0,
    val directSource: String? = null
)
