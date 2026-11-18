package com.xnovaplayer.app.data.api.models

import com.google.gson.annotations.SerializedName

data class XtreamAuthResponse(
    @SerializedName("user_info") val userInfo: XtreamUserInfo? = null,
    @SerializedName("server_info") val serverInfo: XtreamServerInfo? = null
)

data class XtreamUserInfo(
    @SerializedName("username") val username: String? = null,
    @SerializedName("status") val status: String? = null,
    @SerializedName("exp_date") val expDate: String? = null,
    @SerializedName("is_trial") val isTrial: String? = null,
    @SerializedName("active_cons") val activeCons: String? = null,
    @SerializedName("max_connections") val maxConnections: String? = null,
    @SerializedName("auth") val auth: Int? = null
)

data class XtreamServerInfo(
    @SerializedName("url") val url: String? = null,
    @SerializedName("port") val port: String? = null,
    @SerializedName("https_port") val httpsPort: String? = null,
    @SerializedName("server_protocol") val serverProtocol: String? = null,
    @SerializedName("timezone") val timezone: String? = null
)

data class XtreamCategoryDto(
    @SerializedName("category_id") val categoryId: String,
    @SerializedName("category_name") val categoryName: String,
    @SerializedName("parent_id") val parentId: Int = 0
)

data class XtreamStreamDto(
    @SerializedName("stream_id") val streamId: Int,
    @SerializedName("num") val num: Int = 0,
    @SerializedName("name") val name: String,
    @SerializedName("stream_type") val streamType: String? = null,
    @SerializedName("stream_icon") val streamIcon: String? = null,
    @SerializedName("rating") val rating: String? = null,
    @SerializedName("rating_5based") val rating5based: Float = 0f,
    @SerializedName("added") val added: String? = null,
    @SerializedName("category_id") val categoryId: String,
    @SerializedName("container_extension") val containerExtension: String? = null,
    @SerializedName("custom_sid") val customSid: String? = null,
    @SerializedName("direct_source") val directSource: String? = null,
    @SerializedName("epg_channel_id") val epgChannelId: String? = null,
    @SerializedName("tv_archive") val tvArchive: Int = 0
)

data class XtreamSeriesDto(
    @SerializedName("series_id") val seriesId: Int,
    @SerializedName("num") val num: Int = 0,
    @SerializedName("name") val name: String,
    @SerializedName("series_type") val seriesType: String? = null,
    @SerializedName("cover") val cover: String? = null,
    @SerializedName("plot") val plot: String? = null,
    @SerializedName("cast") val cast: String? = null,
    @SerializedName("director") val director: String? = null,
    @SerializedName("genre") val genre: String? = null,
    @SerializedName("releaseDate") val releaseDate: String? = null,
    @SerializedName("last_modified") val lastModified: String? = null,
    @SerializedName("rating") val rating: String? = null,
    @SerializedName("rating_5based") val rating5based: Float = 0f,
    @SerializedName("backdrop_path") val backdropPath: Any? = null,
    @SerializedName("youtube_trailer") val youtubeTrailer: String? = null,
    @SerializedName("episode_run_time") val episodeRunTime: String? = null,
    @SerializedName("category_id") val categoryId: String
)

data class XtreamVodInfoDto(
    @SerializedName("info") val info: Map<String, Any?>? = null,
    @SerializedName("movie_data") val movieData: Map<String, Any?>? = null
)
