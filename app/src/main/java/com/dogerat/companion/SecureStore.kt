package com.dogerat.companion

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

object SecureStore {
    private const val FILE_NAME = "dogerat_secure_store"
    private const val KEY_API_BASE = "api_base"
    private const val KEY_DEVICE_TOKEN = "device_token"
    private const val KEY_DEVICE_ID = "device_id"

    private fun prefs(context: Context) = EncryptedSharedPreferences.create(
        context, FILE_NAME,
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
    fun apiBase(context: Context): String = prefs(context).getString(KEY_API_BASE, "") ?: ""
    fun token(context: Context): String = prefs(context).getString(KEY_DEVICE_TOKEN, "") ?: ""
    fun deviceId(context: Context): String = prefs(context).getString(KEY_DEVICE_ID, "") ?: ""
    fun saveEnrollment(context: Context, base: String, id: String, token: String) {
        prefs(context).edit().putString(KEY_API_BASE, base).putString(KEY_DEVICE_ID, id)
            .putString(KEY_DEVICE_TOKEN, token).apply()
    }
    fun clearEnrollment(context: Context) {
        prefs(context).edit().remove(KEY_DEVICE_ID).remove(KEY_DEVICE_TOKEN).apply()
    }
}