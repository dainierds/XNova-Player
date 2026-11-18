package com.xnovaplayer.app.data.database.entities

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "epg_programs",
    indices = [
        Index(value = ["channelId"]),
        Index(value = ["start"]),
        Index(value = ["end"])
    ]
)
data class EpgProgramEntity(
    @PrimaryKey
    val id: String,
    val channelId: String,
    val streamId: Int,
    val title: String,
    val description: String? = null,
    val start: Long,
    val end: Long,
    val hasArchive: Boolean = false
)
