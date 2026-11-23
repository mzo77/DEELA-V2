package dev.aurastore.store.auth

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * A password is never saved by DEELA. Only rotating session tokens are stored
 * in app-private preferences, encrypted with a non-exportable Android Keystore key.
 * Preferences survive process termination and in-place APK updates; app backup is disabled.
 */
object DeelaSessionStore {
    private const val PREFS = "deela_secure_session_v1"
    private const val SESSION = "session"
    private const val ALIAS = "deela_session_aes_v1"
    private const val KEYSTORE = "AndroidKeyStore"

    private fun secretKey(): SecretKey {
        val store = KeyStore.getInstance(KEYSTORE).apply { load(null) }
        (store.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE).run {
            init(
                KeyGenParameterSpec.Builder(
                    ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
                ).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setRandomizedEncryptionRequired(true)
                    .build()
            )
            generateKey()
        }
    }

    fun save(context: Context, session: DeelaSession): Boolean {
        if (session.token.isBlank() || session.refreshToken.isBlank()) return false
        return runCatching {
            val payload = JSONObject()
                .put("token", session.token)
                .put("refresh_token", session.refreshToken)
                .put("expires_at_ms", session.expiresAtEpochMs)
                .put("role", session.role)
                .put("active", session.subscriptionActive)
                .toString().toByteArray(Charsets.UTF_8)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, secretKey())
            val iv = Base64.encodeToString(cipher.iv, Base64.NO_WRAP)
            val ciphertext = Base64.encodeToString(cipher.doFinal(payload), Base64.NO_WRAP)
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putString(SESSION, "$iv:$ciphertext").commit()
        }.getOrDefault(false)
    }

    /** The returned role or entitlement is NOT trusted until /auth/refresh verifies it. */
    fun load(context: Context): DeelaSession? = runCatching {
        val encoded = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(SESSION, null) ?: return@runCatching null
        val parts = encoded.split(':', limit = 2)
        if (parts.size != 2) return@runCatching null
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(
            Cipher.DECRYPT_MODE,
            secretKey(),
            GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)),
        )
        val payload = JSONObject(String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), Charsets.UTF_8))
        val token = payload.optString("token")
        val refresh = payload.optString("refresh_token")
        if (token.isBlank() || refresh.isBlank()) return@runCatching null
        DeelaSession(
            token,
            payload.optLong("expires_at_ms"),
            payload.optString("role", "subscriber"),
            payload.optBoolean("active", false),
            refresh,
        )
    }.getOrNull()

    fun clear(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(SESSION).commit()
    }
}
