package dev.aurastore.store.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalConfiguration

/**
 * Localise catalogue headings provided by independent remote catalogues.
 * This only changes displayed copy; IDs, source URLs, sorting keys and file links remain untouched.
 */
@Composable
fun subscriberLabel(label: String): String {
    val locale = LocalConfiguration.current.locales[0].language
    if (locale != "ar") return label
    val value = label.trim()
    val fixed = when (value.lowercase()) {
        "games", "game" -> "الألعاب"
        "apps", "app" -> "التطبيقات"
        "browse" -> "تصفح"
        "categories", "category" -> "الأقسام"
        "popular", "popular games", "popular apps" -> "الأكثر رواجًا"
        "featured", "recommended" -> "المميزة"
        "latest", "last update", "latest updates", "last updated", "recent", "recently updated" -> "آخر التحديثات"
        "new", "new apps", "new games" -> "الجديدة"
        "new & updated", "new and updated", "updated" -> "الجديدة والمحدثة"
        "top charts", "top rated" -> "الأعلى ترتيبًا"
        "trending", "trending searches" -> "الرائجة"
        "action" -> "أكشن"
        "board" -> "ألعاب الطاولة"
        "card" -> "ألعاب الورق"
        "casino" -> "كازينو"
        "educational" -> "تعليمية"
        "nsfw" -> "للبالغين"
        "role playing games" -> "تقمص الأدوار"
        "music games" -> "ألعاب موسيقية"
        "word" -> "كلمات"
        "trivia" -> "معلومات عامة"
        "weather" -> "الطقس"
        "business" -> "الأعمال"
        "finance" -> "المالية"
        "shopping" -> "التسوق"
        "communication" -> "الاتصالات"
        "personalization" -> "تخصيص"
        "health & fitness", "health and fitness" -> "الصحة واللياقة"
        "lifestyle" -> "نمط الحياة"
        "maps & navigation", "maps and navigation" -> "الخرائط والملاحة"
        "news & magazines", "news and magazines" -> "الأخبار والمجلات"
        "books & reference", "books and reference" -> "الكتب والمراجع"
        "adventure" -> "مغامرات"
        "role playing", "role-playing", "rpg" -> "تقمص الأدوار"
        "simulation" -> "محاكاة"
        "casual" -> "خفيفة"
        "tools" -> "الأدوات"
        "music", "music & audio" -> "الموسيقى والصوت"
        "racing" -> "سباقات"
        "arcade" -> "أركيد"
        "puzzle" -> "ألغاز"
        "strategy" -> "استراتيجية"
        "sports" -> "رياضة"
        "entertainment" -> "ترفيه"
        "education" -> "تعليم"
        "productivity" -> "إنتاجية"
        "social" -> "تواصل اجتماعي"
        "photography" -> "تصوير"
        "auto & vehicles", "auto and vehicles" -> "السيارات والمركبات"
        "beauty" -> "الجمال"
        "dating" -> "التعارف"
        "events" -> "الفعاليات"
        "food & drink", "food and drink" -> "الطعام والشراب"
        "house & home", "house and home" -> "المنزل"
        "libraries & demo", "libraries and demo" -> "المكتبات والعروض التجريبية"
        "medical" -> "الطب"
        "parenting" -> "الأبوة والأمومة"
        "travel & local", "travel and local" -> "السفر والمحليات"
        "video players & editors", "video players and editors" -> "مشغلات ومحررات الفيديو"
        "comics" -> "القصص المصورة"
        "art & design", "art and design" -> "الفن والتصميم"
        else -> null
    }
    if (fixed != null) return fixed
    return value
        .replace("Games", "الألعاب", ignoreCase = true)
        .replace("Apps", "التطبيقات", ignoreCase = true)
        .replace("Latest Updates", "آخر التحديثات", ignoreCase = true)
        .replace("New & Updated", "الجديدة والمحدثة", ignoreCase = true)
        .replace("Recently updated", "المحدثة مؤخرًا", ignoreCase = true)
        .replace("Popular", "الأكثر رواجًا", ignoreCase = true)
        .replace("Featured", "المميزة", ignoreCase = true)
        .replace("Trending", "الرائجة", ignoreCase = true)
}
