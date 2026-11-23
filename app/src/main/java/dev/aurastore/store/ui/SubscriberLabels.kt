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
        "about", "about this app", "description" -> "وصف التطبيق"
        "mod info", "mod information", "mod features", "mod features:" -> "مميزات التعديل"
        "note", "notes" -> "ملاحظات"
        "what\u0027s new", "changelog" -> "ما الجديد"
        "categories", "category" -> "الأقسام"
        "popular", "popular games", "popular apps" -> "الأكثر رواجًا"
        "featured", "recommended" -> "المميزة"
        "latest", "last update", "latest updates", "last updated", "recent", "recently updated" -> "آخر التحديثات"
        "new", "new apps", "new games" -> "الجديدة"
        "new & updated", "new and updated", "updated" -> "الجديدة والمحدثة"
        "top charts", "top rated" -> "الأعلى ترتيبًا"
        "trending", "trending searches" -> "الرائجة"
        "action" -> "أكشن"
        "editor\u0027s choice", "editors choice", "editor’s choice" -> "اختيار المحررين"
        "mod" -> "معدّل"
        "offline" -> "بدون إنترنت"
        "online" -> "عبر الإنترنت"
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
    return arabicCatalogueText(value)
}


/** Translate complete free-text notes, mod lists and descriptions from any remote source. */
@Composable
fun modDescriptionArabic(source: String): String = arabicCatalogueText(source)
