package dev.aurastore.store.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalConfiguration
import com.google.android.gms.tasks.Task
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.TranslatorOptions
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.Locale
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Translates the remote catalogue's display copy INSIDE DEELA, without modifying the remote
 * catalogue, links, package IDs or the actual app names. Known gaming terms render immediately;
 * arbitrary new descriptions are translated using ML Kit's on-device English/Arabic model.
 * The model is downloaded once on first use, then translation works offline.
 */
@Composable
fun arabicCatalogueText(source: String): String {
    val arabic = LocalConfiguration.current.locales[0].language == "ar"
    val immediate = remember(source, arabic) {
        if (!arabic) source else ArabicCataloguePhrases.exact(source)
    }
    var result by remember(source, arabic) {
        mutableStateOf(immediate ?: ArabicOnDeviceTranslation.cached(source) ?: "جارٍ تجهيز الترجمة…")
    }
    LaunchedEffect(source, arabic, immediate) {
        if (arabic && immediate == null) {
            result = ArabicOnDeviceTranslation.cached(source) ?: "جارٍ تجهيز الترجمة…"
            try {
                result = ArabicOnDeviceTranslation.translate(source)
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (_: Exception) {
                // Never present an untranslated English paragraph as if localization succeeded.
                result = "تعذّرت الترجمة. اتصل بالإنترنت ثم افتح الصفحة مجددًا."
            }
        }
    }
    return immediate ?: result
}

/** Instant, accurate translations for technical mod jargon that machine translation often misses. */
private object ArabicCataloguePhrases {
    private val latin = Regex("[A-Za-z]")
    private val leading = Regex("^[\\s☆★✧✩•*\\-–—]+")
    private val trailing = Regex("[\\s☆★✧✩•*\\-–—:]+$")
    private val separators = Regex("\\s*([·,|])\\s*")
    private val glossary = mapOf(
        "menu mod" to "قائمة التعديل",
        "mod menu" to "قائمة التعديل",
        "mod info" to "معلومات التعديل",
        "mod information" to "معلومات التعديل",
        "mod features" to "مميزات التعديل",
        "features" to "المميزات",
        "mod apk" to "نسخة معدّلة",
        "mod" to "معدّل",
        "modded" to "معدّل",
        "unlock" to "فتح",
        "unlocked" to "مفتوح",
        "all unlocked" to "فتح جميع المميزات",
        "unlock all" to "فتح الكل",
        "unlock all features" to "فتح جميع المميزات",
        "premium unlocked" to "فتح المميزات المدفوعة",
        "pro unlocked" to "فتح مميزات برو",
        "vip unlocked" to "فتح مميزات كبار الشخصيات",
        "damage multiplier" to "مضاعف الضرر",
        "god mode" to "وضع الحصانة",
        "exp multiplier" to "مضاعف نقاط الخبرة",
        "xp multiplier" to "مضاعف نقاط الخبرة",
        "gold always increase" to "الذهب يزداد باستمرار",
        "adventure points never decrease" to "نقاط المغامرة لا تنقص",
        "unlock x2 battle speed" to "فتح سرعة القتال المضاعفة",
        "unlock fortune boost" to "فتح تعزيز الحظ",
        "unlock power boost" to "فتح تعزيز القوة",
        "unlock loot boost" to "فتح تعزيز الغنائم",
        "zoom multiplier" to "مضاعف التقريب",
        "unlimited money" to "أموال غير محدودة",
        "unlimited coins" to "عملات غير محدودة",
        "unlimited gems" to "جواهر غير محدودة",
        "unlimited resources" to "موارد غير محدودة",
        "unlimited lives" to "محاولات غير محدودة",
        "unlimited energy" to "طاقة غير محدودة",
        "no ads" to "بدون إعلانات",
        "ads removed" to "إزالة الإعلانات",
        "remove ads" to "إزالة الإعلانات",
        "ad free" to "بدون إعلانات",
        "offline" to "بدون إنترنت",
        "online" to "عبر الإنترنت",
        "anti ban" to "مضاد للحظر",
        "anti-ban" to "مضاد للحظر",
        "root not required" to "لا يحتاج روت",
        "no root" to "بدون روت",
        "full version" to "النسخة الكاملة",
        "latest version" to "أحدث إصدار",
        "bug fixes" to "إصلاح الأخطاء",
        "performance improvements" to "تحسين الأداء",
        "new features" to "مميزات جديدة",
        "fixed crashes" to "إصلاح التعطل",
        "updated" to "محدّث",
        "description" to "الوصف",
        "about" to "حول التطبيق",
        "modification" to "التعديل",
        "installation" to "التثبيت",
        "requirements" to "المتطلبات",
        "note" to "ملاحظة",
        "notes" to "ملاحظات",
        "changelog" to "سجل التغييرات",
        "what's new" to "ما الجديد",
        "what’s new" to "ما الجديد",
        "editor's choice" to "اختيار المحررين",
        "editor’s choice" to "اختيار المحررين",
        "universal" to "لكل الأجهزة",
        "action" to "أكشن",
        "adventure" to "مغامرات",
        "role playing" to "تقمص الأدوار",
        "role playing games" to "ألعاب تقمص الأدوار",
        "simulation" to "محاكاة",
        "casino" to "كازينو",
        "arcade" to "أركيد",
        "sports" to "رياضة",
        "puzzle" to "ألغاز",
        "strategy" to "استراتيجية",
        "racing" to "سباقات",
        "casual" to "خفيفة",
        "entertainment" to "ترفيه",
        "games" to "الألعاب",
        "apps" to "التطبيقات",
        "tools" to "الأدوات"
    )

    private fun single(text: String): String? {
        if (text.isBlank() || !latin.containsMatchIn(text)) return text
        val beginning = leading.find(text)?.value.orEmpty()
        val afterBeginning = text.drop(beginning.length)
        val ending = trailing.find(afterBeginning)?.value.orEmpty()
        val body = afterBeginning.dropLast(ending.length).trim()
        val key = body.lowercase(Locale.ROOT).replace(Regex("\\s+"), " ")
        val translation = glossary[key]
            ?: if (key.matches(Regex("(?i)\\d+(?:\\.\\d+)?\\s*(?:mb|gb|kb)"))) {
                body.replace(Regex("(?i)\\bMB\\b"), "م.ب")
                    .replace(Regex("(?i)\\bGB\\b"), "ج.ب")
                    .replace(Regex("(?i)\\bKB\\b"), "ك.ب")
            } else if (key.matches(Regex("(?i)v?[0-9]+(?:[.][0-9]+)*(?:\\s*[-–]\\s*mod)?"))) {
                body.replace(Regex("(?i)\\bmod\\b"), "معدّل")
            } else null
        return translation?.let { beginning + it + ending }
    }

    fun exact(text: String): String? {
        if (text.isEmpty() || !latin.containsMatchIn(text)) return text
        single(text)?.let { return it }
        // Preserve bullet lines and separators. Do not drop or abbreviate unknown descriptions.
        val parts = text.split("\\n")
        if (parts.size > 1) {
            val mapped = parts.map { line -> single(line) ?: return null }
            return mapped.joinToString("\\n")
        }
        val bits = text.split(separators)
        if (bits.size > 1) {
            val mapped = bits.map { part -> single(part) ?: return null }
            return mapped.joinToString(" · ")
        }
        return null
    }
}

private object ArabicOnDeviceTranslation {
    private val translator by lazy {
        Translation.getClient(
            TranslatorOptions.Builder()
                .setSourceLanguage(TranslateLanguage.ENGLISH)
                .setTargetLanguage(TranslateLanguage.ARABIC)
                .build(),
        )
    }
    private val modelMutex = Mutex()
    @Volatile private var modelReady = false
    private val cache = object : LinkedHashMap<String, String>(256, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, String>?): Boolean =
            size > 600
    }

    fun cached(text: String): String? = synchronized(cache) { cache[text] }

    suspend fun translate(text: String): String {
        cached(text)?.let { return it }
        modelMutex.withLock {
            if (!modelReady) {
                // No Wi-Fi restriction: the user can initialize translation on mobile data.
                translator.downloadModelIfNeeded(DownloadConditions.Builder().build()).awaitTask()
                modelReady = true
            }
        }
        // Keep long descriptions intact; ML Kit performs best with reasonably sized chunks.
        val segments = if (text.length <= 2800) listOf(text) else text.chunked(2500)
        val result = buildString {
            for (segment in segments) {
                val known = ArabicCataloguePhrases.exact(segment)
                append(known ?: translator.translate(segment).awaitTask())
            }
        }.trim()
        if (result.isBlank()) throw IllegalStateException("Translation returned empty text")
        synchronized(cache) { cache[text] = result }
        return result
    }

    private suspend fun <T> Task<T>.awaitTask(): T = suspendCancellableCoroutine { continuation ->
        addOnSuccessListener { value ->
            if (continuation.isActive) continuation.resume(value)
        }
        addOnFailureListener { error ->
            if (continuation.isActive) continuation.resumeWithException(error)
        }
        addOnCanceledListener {
            if (continuation.isActive) continuation.cancel()
        }
    }
}
