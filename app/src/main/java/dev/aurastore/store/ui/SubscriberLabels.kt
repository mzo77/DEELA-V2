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

/**
 * Built-in Arabic rendering for common catalogue mod labels and feature statements.
 * Unknown text stays verbatim rather than fabricating a translation or dropping details.
 * The remote catalogue, downloads and underlying descriptions are never modified.
 */
@Composable
fun modDescriptionArabic(source: String): String {
    if (LocalConfiguration.current.locales[0].language != "ar" || source.isBlank()) return source
    val phrases = linkedMapOf(
        "mod features" to "مميزات التعديل",
        "mod info" to "معلومات التعديل",
        "mod information" to "معلومات التعديل",
        "mod menu" to "قائمة التعديل",
        "menu mod" to "قائمة التعديل",
        "zoom multiplier" to "مضاعفة التقريب",
        "editor\u0027s choice" to "اختيار المحررين",
        "editor’s choice" to "اختيار المحررين",
        "mod apk" to "نسخة معدّلة",
        "premium unlocked" to "فتح المميزات المدفوعة",
        "pro unlocked" to "فتح مميزات برو",
        "vip unlocked" to "فتح مميزات VIP",
        "all unlocked" to "فتح جميع المميزات",
        "unlocked all" to "فتح جميع المميزات",
        "unlimited money" to "أموال غير محدودة",
        "unlimited coins" to "عملات غير محدودة",
        "unlimited gems" to "جواهر غير محدودة",
        "unlimited resources" to "موارد غير محدودة",
        "unlimited lives" to "محاولات غير محدودة",
        "unlimited energy" to "طاقة غير محدودة",
        "no ads" to "بدون إعلانات",
        "ads removed" to "إزالة الإعلانات",
        "ad free" to "بدون إعلانات",
        "remove ads" to "إزالة الإعلانات",
        "unlocked" to "مفتوح",
        "full version" to "النسخة الكاملة",
        "paid features" to "المميزات المدفوعة",
        "offline" to "بدون إنترنت",
        "online" to "عبر الإنترنت",
        "anti ban" to "مضاد للحظر",
        "anti-ban" to "مضاد للحظر",
        "root not required" to "لا يحتاج روت",
        "no root" to "بدون روت",
        "latest version" to "أحدث إصدار",
        "bug fixes" to "إصلاح الأخطاء",
        "performance improvements" to "تحسين الأداء",
        "new features" to "مميزات جديدة",
        "fixed crashes" to "إصلاح التعطل",
        "updated" to "محدّث",
        "features" to "المميزات",
        "description" to "الوصف",
        "installation" to "التثبيت",
        "requirements" to "المتطلبات",
        "note" to "ملاحظة"
    )
    var output = source
    for ((english, arabic) in phrases) {
        val pattern = Regex("(?i)(?<![A-Za-z])" + Regex.escape(english) + "(?![A-Za-z])")
        output = output.replace(pattern, arabic)
    }
    return output
}
