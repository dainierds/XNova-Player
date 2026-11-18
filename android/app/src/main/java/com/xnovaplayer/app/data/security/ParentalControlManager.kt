package com.xnovaplayer.app.data.security

import android.content.Context
import android.content.SharedPreferences

class ParentalControlManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("xnova_parental_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_PIN = "parental_pin"
        private const val KEY_ENABLED = "parental_enabled"
        private const val DEFAULT_PIN = "0000"

        private val RESTRICTED_KEYWORDS = listOf(
            "+18", "18+", "adult", "adulto", "xxx", "erotic", "erotica",
            "porn", "playboy", "venus", "redlight", "hustler", "brazzers"
        )
    }

    var isEnabled: Boolean
        get() = prefs.getBoolean(KEY_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_ENABLED, value).apply()

    fun verifyPin(enteredPin: String): Boolean {
        val storedPin = prefs.getString(KEY_PIN, DEFAULT_PIN) ?: DEFAULT_PIN
        return enteredPin == storedPin
    }

    fun setPin(newPin: String): Boolean {
        if (newPin.length == 4 && newPin.all { it.isDigit() }) {
            prefs.edit().putString(KEY_PIN, newPin).apply()
            return true
        }
        return false
    }

    fun isCategoryRestricted(categoryName: String): Boolean {
        if (!isEnabled) return false
        val lower = categoryName.lowercase()
        return RESTRICTED_KEYWORDS.any { lower.contains(it) }
    }
}
