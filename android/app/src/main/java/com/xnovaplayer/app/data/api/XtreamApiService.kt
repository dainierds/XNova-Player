package com.xnovaplayer.app.data.api

import com.xnovaplayer.app.data.api.models.XtreamAuthResponse
import com.xnovaplayer.app.data.api.models.XtreamCategoryDto
import com.xnovaplayer.app.data.api.models.XtreamSeriesDto
import com.xnovaplayer.app.data.api.models.XtreamStreamDto
import com.xnovaplayer.app.data.api.models.XtreamVodInfoDto
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

interface XtreamApiService {

    @GET("player_api.php")
    suspend fun authenticate(
        @Query("username") user: String,
        @Query("password") pass: String
    ): Response<XtreamAuthResponse>

    @GET("player_api.php")
    suspend fun getLiveCategories(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_live_categories"
    ): Response<List<XtreamCategoryDto>>

    @GET("player_api.php")
    suspend fun getVodCategories(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_vod_categories"
    ): Response<List<XtreamCategoryDto>>

    @GET("player_api.php")
    suspend fun getSeriesCategories(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_series_categories"
    ): Response<List<XtreamCategoryDto>>

    @GET("player_api.php")
    suspend fun getLiveStreams(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_live_streams",
        @Query("category_id") categoryId: String? = null
    ): Response<List<XtreamStreamDto>>

    @GET("player_api.php")
    suspend fun getVodStreams(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_vod_streams",
        @Query("category_id") categoryId: String? = null
    ): Response<List<XtreamStreamDto>>

    @GET("player_api.php")
    suspend fun getSeries(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_series",
        @Query("category_id") categoryId: String? = null
    ): Response<List<XtreamSeriesDto>>

    @GET("player_api.php")
    suspend fun getVodInfo(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_vod_info",
        @Query("vod_id") vodId: Int
    ): Response<XtreamVodInfoDto>

    @GET("player_api.php")
    suspend fun getSeriesInfo(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_series_info",
        @Query("series_id") seriesId: Int
    ): Response<ResponseBody>
}
