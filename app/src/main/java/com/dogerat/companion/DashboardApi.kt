package com.dogerat.companion

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.os.Build
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

object DashboardApi {
    private val client = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS).readTimeout(12, TimeUnit.SECONDS)
        .callTimeout(20, TimeUnit.SECONDS).build()
    private val jsonType = "application/json; charset=utf-8".toMediaType()
    data class Enrollment(val deviceId: String, val token: String)

    private fun base(raw: String): String {
        val value = raw.trim().trimEnd('/')
        require(value.startsWith("https://") || value.startsWith("http://10.0.2.2") ||
            value.startsWith("http://127.0.0.1") || value.startsWith("http://localhost")) {
            "Use HTTPS. HTTP is allowed only for local development."
        }
        return value
    }
    private fun call(url: String, token: String? = null, body: JSONObject? = null,
                     extraHeader: Pair<String, String>? = null): JSONObject {
        val builder = Request.Builder().url(url)
        if (token != null) builder.header("Authorization", "Bearer " + token)
        if (extraHeader != null) builder.header(extraHeader.first, extraHeader.second)
        if (body != null) builder.post(body.toString().toRequestBody(jsonType)) else builder.get()
        client.newCall(builder.build()).execute().use { response ->
            val payload = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                val errorText = runCatching { JSONObject(payload).optString("error") }.getOrNull()
                throw IllegalStateException(errorText?.takeIf { it.isNotBlank() } ?: ("Server error: " + response.code))
            }
            return if (payload.isBlank()) JSONObject() else JSONObject(payload)
        }
    }
    fun enroll(rawBase: String, code: String): Enrollment {
        val body = JSONObject().put("name", Build.MODEL ?: "Android device")
            .put("platform", "Android " + Build.VERSION.RELEASE)
            .put("appVersion", BuildConfig.VERSION_NAME)
        val result = call(base(rawBase) + "/api/devices/enroll", body = body,
            extraHeader = "X-Enrollment-Code" to code)
        return Enrollment(result.getString("deviceId"), result.getString("deviceToken"))
    }
    fun heartbeat(context: Context, rawBase: String, token: String) {
        val batteryManager = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val level = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        val body = JSONObject().put("name", Build.MODEL ?: "Android device")
            .put("platform", "Android " + Build.VERSION.RELEASE)
            .put("appVersion", BuildConfig.VERSION_NAME)
            .put("batteryPercent", if (level in 0..100) level else JSONObject.NULL)
            .put("networkType", networkLabel(context))
        call(base(rawBase) + "/api/device/heartbeat", token = token, body = body)
    }
    fun revoke(rawBase: String, token: String) {
        call(base(rawBase) + "/api/device/revoke", token = token, body = JSONObject())
    }
    private fun networkLabel(context: Context): String {
        val manager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = manager.activeNetwork ?: return "Offline"
        val caps = manager.getNetworkCapabilities(network) ?: return "Unknown"
        return when {
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "Wi-Fi"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "Cellular"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "Ethernet"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN) -> "VPN"
            else -> "Other"
        }
    }
}