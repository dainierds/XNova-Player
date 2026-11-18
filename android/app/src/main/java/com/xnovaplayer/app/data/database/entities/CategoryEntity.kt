package com.xnovaplayer.app.data.database.entities

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "categories",
    indices = [
        Index(value = ["type"]),
        Index(value = ["type", "categoryId"])
    ]
)
data class CategoryEntity(
    @PrimaryKey
    val categoryId: String,
    val categoryName: String,
    val parentId: Int = 0,
    val type: String // "movies", "series", "live"
)
