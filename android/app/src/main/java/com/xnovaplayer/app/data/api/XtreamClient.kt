package com.xnovaplayer.app.data.api

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.security.SecureRandom
import java.security.cert.X509Certificate
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

object XtreamClient {

    const val DEFAULT_SERVER = "https://tupdvr24.com:443"
    private const val USER_AGENT = "TiviMate/4.7.0 (Linux; Android 11; Media3)"

    private val unsafeOkHttpClient: OkHttpClient by lazy {
        try {
            val trustAllCerts = arrayOf<TrustManager>(object : X509TrustManager {
                override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
                override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
                override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
            })

            val sslContext = SSLContext.getInstance("SSL")
            sslContext.init(null, trustAllCerts, SecureRandom())

            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BASIC
            }

            OkHttpClient.Builder()
                .sslSocketFactory(sslContext.socketFactory, trustAllCerts[0] as X509TrustManager)
                .hostnameVerifier { _, _ -> true }
                .connectTimeout(25, TimeUnit.SECONDS)
                .readTimeout(25, TimeUnit.SECONDS)
                .writeTimeout(25, TimeUnit.SECONDS)
                .addInterceptor { chain ->
                    val request = chain.request().newBuilder()
                        .header("User-Agent", USER_AGENT)
                        .header("Accept", "*/*")
                        .build()
                    chain.proceed(request)
                }
                .addInterceptor(logging)
                .build()
        } catch (e: Exception) {
            OkHttpClient.Builder().build()
        }
    }

    fun createService(baseUrl: String = DEFAULT_SERVER): XtreamApiService {
        val cleanUrl = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
        return Retrofit.Builder()
            .baseUrl(cleanUrl)
            .client(unsafeOkHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(XtreamApiService::class.java)
    }

    fun buildLiveStreamUrl(server: String, user: String, pass: String, streamId: Int, ext: String = "ts"): String {
        val cleanServer = server.trimEnd('/')
        val cleanExt = ext.trimStart('.')
        return "$cleanServer/live/$user/$pass/$streamId.$cleanExt"
    }

    fun buildVodStreamUrl(server: String, user: String, pass: String, streamId: Int, ext: String = "mkv"): String {
        val cleanServer = server.trimEnd('/')
        val cleanExt = ext.trimStart('.')
        return "$cleanServer/movie/$user/$pass/$streamId.$cleanExt"
    }

    fun buildSeriesStreamUrl(server: String, user: String, pass: String, streamId: Int, ext: String = "mkv"): String {
        val cleanServer = server.trimEnd('/')
        val cleanExt = ext.trimStart('.')
        return "$cleanServer/series/$user/$pass/$streamId.$cleanExt"
    }
}
