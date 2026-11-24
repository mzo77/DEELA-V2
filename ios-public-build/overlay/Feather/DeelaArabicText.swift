//
// DEELA native Arabic catalogue localization.
// App titles remain original. Source descriptions are translated on device with
// Apple's Translation framework where available (iOS 18+); no fabricated mod claims.
//

import Foundation
import SwiftUI
import Translation

enum DeelaArabic {
    private static let categories: [String: String] = [
        "games":"ألعاب","game":"ألعاب","gaming":"ألعاب","arcade":"ألعاب","action":"أكشن","adventure":"مغامرات",
        "simulation":"محاكاة","strategy":"استراتيجية","puzzle":"ألغاز","racing":"سباقات","sports":"رياضة",
        "role playing":"تقمص الأدوار","role-playing":"تقمص الأدوار","casual":"ألعاب خفيفة",
        "entertainment":"ترفيه","developer":"أدوات المطورين","developers":"أدوات المطورين",
        "development":"تطوير","utilities":"أدوات مساعدة","utility":"أدوات مساعدة","tools":"أدوات",
        "social":"تواصل اجتماعي","social networking":"تواصل اجتماعي","social media":"تواصل اجتماعي",
        "social networks":"تواصل اجتماعي","communication":"اتصالات","messaging":"مراسلة",
        "productivity":"إنتاجية","business":"أعمال","finance":"مالية","education":"تعليم",
        "books":"كتب","book":"كتب","reference":"مراجع","news":"أخبار","magazines":"مجلات",
        "music":"موسيقى","audio":"صوتيات","video":"فيديو","photo":"تصوير","photography":"تصوير",
        "photo & video":"صور وفيديو","photo and video":"صور وفيديو","graphics":"رسوميات",
        "graphics & design":"تصميم ورسوميات","design":"تصميم","lifestyle":"نمط الحياة",
        "health":"الصحة","health & fitness":"الصحة واللياقة","fitness":"لياقة",
        "medical":"طبي","food":"طعام","food & drink":"طعام ومشروبات",
        "shopping":"تسوق","travel":"سفر","navigation":"خرائط وتنقل","maps":"خرائط",
        "weather":"الطقس","information":"معلومات","internet":"إنترنت","browsers":"متصفحات",
        "browser":"متصفح","security":"الأمان","privacy":"الخصوصية",
        "customization":"تخصيص","tweaks":"تعديلات","modded":"تطبيقات معدلة",
        "jailbreak":"أدوات النظام","emulators":"محاكيات","emulator":"محاكيات",
        "other":"أخرى","others":"أخرى","applications":"تطبيقات","apps":"تطبيقات",
        "all":"الكل","uncategorized":"أخرى"
    ]

    static func category(_ input: String) -> String {
        let normalized = input.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "_", with: " ")
            .replacingOccurrences(of: "-", with: " ")
            .lowercased()
        if normalized.isEmpty { return "تطبيقات" }
        if let translated = categories[normalized] { return translated }
        if normalized.unicodeScalars.contains(where: { (0x0600...0x06FF).contains(Int($0.value)) }) {
            return input
        }
        return "تطبيقات أخرى"
    }

    static func source(_ input: String) -> String {
        input == "ديلا" ? "ديلا" : "مكتبة تطبيقات ديلا"
    }

    static func modLabels(_ text: String) -> [String] {
        let v = text.lowercased()
        var found: [String] = []
        if v.contains("patched") || v.contains("modded") || v.contains("mod version") {
            found.append("نسخة معدّلة")
        }
        if v.contains("no ads") || v.contains("ad free") || v.contains("ad-free") || v.contains("remove ads") {
            found.append("إزالة الإعلانات")
        }
        if v.contains("premium unlocked") || v.contains("unlocked premium")
            || v.contains("premium features unlocked") {
            found.append("فتح المزايا المدفوعة")
        }
        if v.contains("in-app purchase unlocked") || v.contains("iap unlocked") {
            found.append("فتح بعض عمليات الشراء داخل التطبيق")
        }
        if v.contains("no watermark") || v.contains("remove watermark") {
            found.append("إزالة العلامة المائية")
        }
        return found
    }

    static func requiresTranslation(_ value: String) -> Bool {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return !trimmed.isEmpty
            && trimmed.unicodeScalars.contains(where: { (65...90).contains(Int($0.value)) || (97...122).contains(Int($0.value)) })
            && !trimmed.unicodeScalars.contains(where: { (0x0600...0x06FF).contains(Int($0.value)) })
    }
}

@available(iOS 18.0, *)
private struct DeelaAppleArabicTranslation: View {
    let source: String
    let maxLines: Int?
    @State private var translated: String = ""
    @State private var failed = false
    @State private var configuration = TranslationSession.Configuration(
        source: Locale.Language(identifier: "en"),
        target: Locale.Language(identifier: "ar")
    )

    var body: some View {
        Group {
            if !translated.isEmpty {
                Text(translated).lineLimit(maxLines).textSelection(.enabled)
            } else if failed {
                Text("لا تتوفر ترجمة عربية موثوقة لهذا الوصف من المصدر حاليًا.")
                    .lineLimit(maxLines)
                    .foregroundStyle(.secondary)
            } else {
                Text("جارٍ تعريب وصف التطبيق…")
                    .lineLimit(maxLines)
                    .foregroundStyle(.secondary)
            }
        }
        .translationTask(configuration) { session in
            guard !source.isEmpty else { return }
            do {
                let response = try await session.translate(source)
                let answer = response.targetText.trimmingCharacters(in: .whitespacesAndNewlines)
                if !answer.isEmpty { translated = answer }
                else { failed = true }
            } catch {
                failed = true
            }
        }
    }
}

struct DeelaArabicDescription: View {
    let original: String
    var maxLines: Int? = nil

    var body: some View {
        Group {
            if original.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                Text("لا توجد معلومات إضافية من مطوّر التطبيق.")
                    .lineLimit(maxLines)
                    .foregroundStyle(.secondary)
            } else if !DeelaArabic.requiresTranslation(original) {
                Text(original).lineLimit(maxLines).textSelection(.enabled)
            } else if #available(iOS 18.0, *) {
                DeelaAppleArabicTranslation(source: original, maxLines: maxLines)
            } else {
                Text("الترجمة العربية التلقائية للأوصاف تتطلب iOS 18 أو أحدث.")
                    .lineLimit(maxLines)
                    .foregroundStyle(.secondary)
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }
}
