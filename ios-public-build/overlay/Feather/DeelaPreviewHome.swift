//
//  DeelaPreviewHome.swift
//  DEELA iOS 1.0.0 — native subscriber catalogue and IPA file downloads.
//
//  Downloads use user-selected HTTPS source files; installation/signing remain separate.
//  Original Feather source files remain in the project for archival and licensing
//  purposes but are not reachable from the DEELA subscriber app entry point.
//

import Foundation
import SwiftUI

struct DeelaPreviewSource: Identifiable, Hashable, Sendable {
    let id: Int
    let name: String

    init?(_ json: [String: Any]) {
        guard let id = json["id"] as? Int,
              let name = json["name"] as? String,
              !name.isEmpty else { return nil }
        self.id = id
        self.name = DeelaArabic.source(name)
    }
}

struct DeelaPreviewApp: Identifiable, Hashable, Sendable {
    let id: String
    let title: String
    let description: String
    let version: String
    let category: String
    let developer: String
    let sourceName: String
    let catalogKey: String
    let upstreamID: Int?
    let downloadAvailable: Bool
    let iconURL: URL?
    let screenshots: [URL]

    init?(_ json: [String: Any], sourceName: String) {
        guard let rawName = json["title"] as? String else { return nil }
        let title = rawName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !title.isEmpty else { return nil }

        self.title = title
        self.description = json["description"] as? String ?? ""
        self.version = json["version"] as? String
            ?? json["version_name"] as? String ?? "غير محدد"
        self.category = DeelaArabic.category(json["category"] as? String ?? "تطبيقات")
        self.developer = json["developer"] as? String ?? ""
        self.sourceName = DeelaArabic.source(sourceName)
        self.catalogKey = json["catalog_key"] as? String ?? ""
        self.upstreamID = json["id"] as? Int
        self.downloadAvailable = json["download_available"] as? Bool ?? false
        let identity = (json["bundle_id"] as? String).flatMap { $0.isEmpty ? nil : $0 }
            ?? (json["id"] as? String)
            ?? (json["id"] as? Int).map(String.init)
            ?? title.lowercased()
        self.id = "\(sourceName)|\(identity)"
        self.iconURL = Self.httpsURL(json["icon_url"])
        self.screenshots = ((json["screenshots"] as? [String]) ?? [])
            .prefix(6).compactMap { Self.httpsURL($0) }
    }

    private static func httpsURL(_ raw: Any?) -> URL? {
        guard let string = raw as? String,
              let url = URL(string: string),
              url.scheme?.lowercased() == "https",
              url.host != nil,
              url.user == nil,
              url.password == nil else { return nil }
        return url
    }
}

@MainActor
final class DeelaPreviewCatalogue: ObservableObject {
    @Published private(set) var apps: [DeelaPreviewApp] = []
    @Published private(set) var sources: [DeelaPreviewSource] = []
    @Published private(set) var loading = false
    @Published private(set) var sourcesChecked = 0
    @Published private(set) var failedSources = 0
    @Published private(set) var warning = ""

    func reload(using session: DeelaSubscriberSession) async {
        guard !loading else { return }
        loading = true
        apps = []
        sources = []
        sourcesChecked = 0
        failedSources = 0
        warning = ""
        defer { loading = false }

        do {
            let sourceData = try await session.previewJSON("/api/sources")
            let rawSources = sourceData["sources"] as? [[String: Any]] ?? []
            sources = rawSources.compactMap(DeelaPreviewSource.init)
        } catch {
            warning = "تعذر جلب مصادر البرامج: \(error.localizedDescription)"
        }

        // The DEELA-maintained iOS catalogue can coexist with the public Accretion source.
        // The backend strips storage locations and IPA URLs from both responses.
        if let result = try? await session.previewJSON("/api/catalog"),
           let records = result["apps"] as? [[String: Any]] {
            apps = records.compactMap { DeelaPreviewApp($0, sourceName: "ديلا") }
        }

        guard !sources.isEmpty else {
            if apps.isEmpty && warning.isEmpty {
                warning = "لا توجد مصادر متاحة الآن. جرّب تحديث القائمة."
            }
            return
        }

        var seen = Set(apps.map(\.id))
        let batchSize = 3

        // Bounded concurrency prevents overloading the sources and allows
        // live, gradual rendering even if individual repositories are offline.
        for start in stride(from: 0, to: sources.count, by: batchSize) {
            let end = min(start + batchSize, sources.count)
            let batch = Array(sources[start..<end])

            await withTaskGroup(of: [DeelaPreviewApp]?.self) { group in
                for source in batch {
                    group.addTask {
                        do {
                            let data = try await session.previewJSON("/api/source?id=\(source.id)")
                            let records = data["apps"] as? [[String: Any]] ?? []
                            return records.compactMap {
                                DeelaPreviewApp($0, sourceName: source.name)
                            }
                        } catch {
                            return nil
                        }
                    }
                }
                for await groupApps in group {
                    sourcesChecked += 1
                    guard let groupApps else {
                        failedSources += 1
                        continue
                    }
                    let fresh = groupApps.filter { seen.insert($0.id).inserted }
                    if !fresh.isEmpty { apps.append(contentsOf: fresh) }
                }
            }
        }
        if apps.isEmpty {
            warning = "لم تصل بيانات تطبيقات من المصادر المتاحة حاليًا."
        }
    }
}


@MainActor
private final class DeelaIPATransfer: ObservableObject {
    @Published private(set) var busy = false
    @Published private(set) var savedFile: URL?
    @Published private(set) var failure = ""
    @Published private(set) var note = ""

    func download(_ app: DeelaPreviewApp, using session: DeelaSubscriberSession) async {
        guard !busy, app.downloadAvailable, let id = app.upstreamID,
              !app.catalogKey.isEmpty else { return }
        busy = true
        savedFile = nil
        failure = ""
        note = "جاري تنزيل الملف من مصدر التطبيق الخارجي..."
        defer { busy = false }
        do {
            let source = try await session.ipaDownloadURL(id: id, catalogKey: app.catalogKey)
            let (temp, response) = try await URLSession.shared.download(from: source)
            guard let http = response as? HTTPURLResponse,
                  (200...299).contains(http.statusCode),
                  response.url?.scheme?.lowercased() == "https" else {
                throw NSError(domain: "DEELA", code: 502, userInfo: [
                    NSLocalizedDescriptionKey: "المصدر لم يرجع ملفًا عبر اتصال HTTPS آمن"
                ])
            }
            let attributes = try FileManager.default.attributesOfItem(atPath: temp.path)
            let size = (attributes[.size] as? NSNumber)?.int64Value ?? 0
            guard size >= 128, size <= 1_500_000_000 else {
                throw NSError(domain: "DEELA", code: 413, userInfo: [
                    NSLocalizedDescriptionKey: "ملف المصدر فارغ أو كبير جدًا"
                ])
            }
            // IPA is a ZIP archive. This is a header check, not a code-signing or malware audit.
            let handle = try FileHandle(forReadingFrom: temp)
            let header = try handle.read(upToCount: 4) ?? Data()
            try handle.close()
            guard Array(header) == [0x50, 0x4b, 0x03, 0x04] else {
                throw NSError(domain: "DEELA", code: 415, userInfo: [
                    NSLocalizedDescriptionKey: "الرابط لا يعيد ملف IPA صالحًا مبدئيًا"
                ])
            }
            let folder = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
            let name = String(app.title.prefix(36).map { character in
                (character.isLetter || character.isNumber) ? character : "-"
            })
            let destination = folder.appendingPathComponent("DEELA-\(name)-\(UUID().uuidString.prefix(8)).ipa")
            try FileManager.default.moveItem(at: temp, to: destination)
            savedFile = destination
            note = "تم تنزيل IPA. اضغط مشاركة الملف لحفظه في تطبيق الملفات أو نقله للكمبيوتر."
        } catch {
            failure = error.localizedDescription
            note = ""
        }
    }
}

private struct DeelaPreviewIcon: View {
    let url: URL?
    var size: CGFloat = 60

    var body: some View {
        Group {
            if let url {
                AsyncImage(url: url) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFit()
                    } else {
                        placeholder
                    }
                }
            } else {
                placeholder
            }
        }
        .frame(width: size, height: size)
        .background(Color(uiColor: .tertiarySystemFill))
        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
        .accessibilityHidden(true)
    }

    private var placeholder: some View {
        Image(systemName: "square.stack.3d.up.fill")
            .font(.system(size: size * 0.42))
            .foregroundStyle(.pink)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

private struct DeelaPreviewAppRow: View {
    let app: DeelaPreviewApp

    var body: some View {
        HStack(spacing: 12) {
            DeelaPreviewIcon(url: app.iconURL)
            VStack(alignment: .leading, spacing: 4) {
                Text(app.title)
                    .font(.headline)
                    .foregroundStyle(.primary)
                    .lineLimit(2)
                Text("الإصدار \(app.version) · \(app.sourceName)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                if !app.description.isEmpty {
                    DeelaArabicDescription(original: app.description, maxLines: 2)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.backward")
                .foregroundStyle(.tertiary)
                .font(.caption)
        }
        .padding(12)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

private struct DeelaPreviewAppDetails: View {
    let app: DeelaPreviewApp
    @ObservedObject var session: DeelaSubscriberSession
    @StateObject private var transfer = DeelaIPATransfer()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    HStack(spacing: 14) {
                        DeelaPreviewIcon(url: app.iconURL, size: 90)
                        VStack(alignment: .leading, spacing: 5) {
                            Text(app.title)
                                .font(.title2.bold())
                                .fixedSize(horizontal: false, vertical: true)
                            Text("الإصدار: \(app.version)")
                                .foregroundStyle(.secondary)
                            Text("المصدر: \(app.sourceName)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer(minLength: 0)
                    }
                    Divider()
                    Text("التفاصيل")
                        .font(.headline)
                    DeelaArabicDescription(original: app.description)
                        .font(.body)
                    Text("معلومات التعديل")
                        .font(.headline)
                    if DeelaArabic.modLabels(app.description).isEmpty {
                        Text("لم يوضح المصدر مزايا تعديل محددة يمكن تأكيدها.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(DeelaArabic.modLabels(app.description), id: \.self) { feature in
                            Label(feature, systemImage: "checkmark.circle")
                                .font(.subheadline)
                        }
                    }
                    Text("التصنيف: \(app.category)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    if !app.developer.isEmpty {
                        Text("المطور: \(app.developer)")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    if !app.screenshots.isEmpty {
                        Text("صور التطبيق")
                            .font(.headline)
                        ScrollView(.horizontal) {
                            HStack(spacing: 10) {
                                ForEach(app.screenshots, id: \.self) { url in
                                    AsyncImage(url: url) { phase in
                                        if let image = phase.image {
                                            image.resizable().scaledToFit()
                                        } else {
                                            RoundedRectangle(cornerRadius: 12)
                                                .fill(Color(uiColor: .secondarySystemFill))
                                        }
                                    }
                                    .frame(width: 170, height: 310)
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                                }
                            }
                        }
                    }
                    Label("تنزيل ملف التطبيق متاح. يحتاج تثبيته إلى توقيع صالح.",
                          systemImage: "info.circle")
                        .font(.footnote)
                        .foregroundStyle(.orange)
                        .fixedSize(horizontal: false, vertical: true)
                    if app.downloadAvailable && app.upstreamID != nil {
                        Button {
                            Task { await transfer.download(app, using: session) }
                        } label: {
                            Label(transfer.busy ? "جاري تنزيل IPA..." : "تنزيل ملف IPA",
                                  systemImage: "arrow.down.to.line")
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(transfer.busy)
                        .frame(maxWidth: .infinity)
                    } else {
                        Label("لا يوفر المصدر رابط IPA لهذا التطبيق حاليًا",
                              systemImage: "exclamationmark.triangle")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    if transfer.busy { ProgressView() }
                    if !transfer.note.isEmpty {
                        Text(transfer.note).font(.footnote).foregroundStyle(.secondary)
                    }
                    if !transfer.failure.isEmpty {
                        Text(transfer.failure).font(.footnote).foregroundStyle(.red)
                    }
                    if let savedFile = transfer.savedFile {
                        ShareLink(item: savedFile, preview: SharePreview(app.title)) {
                            Label("مشاركة الملف / حفظ في الملفات", systemImage: "square.and.arrow.up")
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.green)
                    }
                }
                .padding()
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .navigationTitle("تفاصيل التطبيق")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("إغلاق") { dismiss() }
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }
}

private struct DeelaSourcePreview: View {
    let source: DeelaPreviewSource
    @ObservedObject var catalogue: DeelaPreviewCatalogue
    @ObservedObject var session: DeelaSubscriberSession
    @State private var search = ""
    @State private var selectedApp: DeelaPreviewApp?

    private var apps: [DeelaPreviewApp] {
        catalogue.apps.filter {
            $0.sourceName == source.name
                && (search.isEmpty || $0.title.localizedCaseInsensitiveContains(search)
                    || $0.description.localizedCaseInsensitiveContains(search))
        }
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 11) {
                Text("يمكن تنزيل IPA إذا وفر المصدر رابطًا؛ التثبيت على الآيفون يتطلب توقيعًا منفصلًا.")
                    .font(.footnote)
                    .foregroundStyle(.orange)
                    .frame(maxWidth: .infinity, alignment: .leading)
                if apps.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "square.stack")
                            .font(.largeTitle)
                            .foregroundStyle(.secondary)
                        Text("لا توجد برامج من هذا المصدر الآن")
                            .font(.headline)
                        Text("جرّب مرة أخرى بعد اكتمال تحديث المصادر.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, minHeight: 130)
                }
                ForEach(apps) { app in
                    Button { selectedApp = app } label: {
                        DeelaPreviewAppRow(app: app)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(14)
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle(source.name)
        .searchable(text: $search, prompt: "ابحث في المصدر")
        .sheet(item: $selectedApp) { app in
            DeelaPreviewAppDetails(app: app, session: session)
        }
    }
}

struct DeelaPreviewHome: View {
    @ObservedObject var session: DeelaSubscriberSession
    @StateObject private var catalogue = DeelaPreviewCatalogue()
    @State private var selectedApp: DeelaPreviewApp?
    @State private var search = ""
    @State private var category = "الكل"
    @State private var visibleLimit = 50

    private var categories: [String] {
        ["الكل"] + Array(Set(catalogue.apps.map(\.category))).sorted()
    }

    private var filteredApps: [DeelaPreviewApp] {
        catalogue.apps.filter { app in
            (category == "الكل" || app.category == category)
                && (search.isEmpty
                    || app.title.localizedCaseInsensitiveContains(search)
                    || app.description.localizedCaseInsensitiveContains(search)
                    || app.developer.localizedCaseInsensitiveContains(search)
                    || app.sourceName.localizedCaseInsensitiveContains(search))
        }
    }

    var body: some View {
        TabView {
            NavigationStack {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 15) {
                        VStack(alignment: .leading, spacing: 7) {
                            Text("DEELA iOS")
                                .font(.largeTitle.bold())
                            Text("متجر المشتركين للآيفون")
                                .foregroundStyle(.secondary)
                            Label("تنزيل الملفات من المصادر الداعمة متاح؛ التثبيت يحتاج توقيعًا صالحًا",
                                  systemImage: "lock.shield.fill")
                                .font(.footnote)
                                .foregroundStyle(.orange)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)

                        HStack {
                            Label("\(catalogue.apps.count) تطبيق في المكتبة", systemImage: "square.grid.2x2")
                            Spacer()
                            if catalogue.loading {
                                ProgressView()
                                Text("\(catalogue.sourcesChecked)/\(catalogue.sources.count)")
                                    .font(.caption)
                                    .monospacedDigit()
                            }
                        }
                        .font(.subheadline)

                        TextField("ابحث عن تطبيق أو مطور أو مصدر", text: $search)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .textFieldStyle(.roundedBorder)
                            .onChange(of: search) { _ in visibleLimit = 50 }

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(categories, id: \.self) { name in
                                    Button {
                                        category = name
                                        visibleLimit = 50
                                    } label: {
                                        Text(name)
                                            .font(.footnote.weight(.semibold))
                                            .padding(.horizontal, 13)
                                            .padding(.vertical, 7)
                                            .background(category == name ? Color.pink : Color(uiColor: .secondarySystemFill))
                                            .foregroundStyle(category == name ? Color.white : Color.primary)
                                            .clipShape(Capsule())
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }

                        if !catalogue.warning.isEmpty {
                            Label(catalogue.warning, systemImage: "exclamationmark.triangle")
                                .font(.footnote)
                                .foregroundStyle(.orange)
                        }

                        if filteredApps.isEmpty {
                            VStack(spacing: 12) {
                                Image(systemName: "square.stack.3d.up.slash")
                                    .font(.largeTitle)
                                    .foregroundStyle(.secondary)
                                Text(catalogue.loading ? "نجلب البرامج من مصادر الآيفون..." : "لا توجد تطبيقات مطابقة الآن")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                            .frame(maxWidth: .infinity, minHeight: 150)
                        }

                        ForEach(Array(filteredApps.prefix(visibleLimit))) { app in
                            Button { selectedApp = app } label: {
                                DeelaPreviewAppRow(app: app)
                            }
                            .buttonStyle(.plain)
                        }

                        if filteredApps.count > visibleLimit {
                            Button("عرض المزيد من التطبيقات") {
                                visibleLimit += 50
                            }
                            .buttonStyle(.bordered)
                            .frame(maxWidth: .infinity)
                        }
                    }
                    .padding(14)
                }
                .background(Color(uiColor: .systemGroupedBackground))
                .navigationTitle("التطبيقات")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button {
                            Task { await catalogue.reload(using: session) }
                        } label: { Image(systemName: "arrow.clockwise") }
                        .disabled(catalogue.loading)
                        .accessibilityLabel("تحديث تطبيقات الآيفون")
                    }
                }
                .refreshable { await catalogue.reload(using: session) }
                .sheet(item: $selectedApp) { app in
                    DeelaPreviewAppDetails(app: app, session: session)
                }
            }
            .tabItem { Label("الرئيسية", systemImage: "house.fill") }

            NavigationStack {
                List {
                    Section {
                        ForEach(catalogue.sources) { source in
                            NavigationLink {
                                DeelaSourcePreview(source: source, catalogue: catalogue, session: session)
                            } label: {
                                HStack {
                                    Image(systemName: "square.stack.3d.up")
                                        .foregroundStyle(.pink)
                                    Text(source.name)
                                    Spacer()
                                    Text("\(catalogue.apps.filter { $0.sourceName == source.name }.count)")
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    } header: {
                        Text("مكتبة تطبيقات ديلا · \(catalogue.sources.count) مصدر")
                    } footer: {
                        Text("يظهر محتوى مكتبة التطبيقات مع تنزيل الملفات المتاحة. التثبيت يحتاج توقيعًا صالحًا.")
                    }
                }
                .navigationTitle("مكتبة تطبيقات ديلا")
            }
            .tabItem { Label("المصادر", systemImage: "square.stack.3d.up.fill") }

            NavigationStack {
                Form {
                    Section("حساب المشترك") {
                        Label(session.accountLabel.isEmpty ? "اشتراك الآيفون" : session.accountLabel,
                              systemImage: "person.crop.circle")
                        Label("اشتراك iOS معتمد", systemImage: "checkmark.shield")
                            .foregroundStyle(.green)
                    }
                    Section("حالة التطبيق") {
                        Label("تصفح التطبيقات والتفاصيل", systemImage: "checkmark.circle")
                            .foregroundStyle(.green)
                        Label("تنزيل ملفات IPA متاح للتطبيقات الداعمة", systemImage: "arrow.down.circle")
                            .foregroundStyle(.green)
                        Label("تثبيت IPA يحتاج توقيعًا صالحًا", systemImage: "lock.shield")
                            .foregroundStyle(.orange)
                        Text("هذا التطبيق بنظام iOS، وليس تطبيق APK للأندرويد. لكل جهاز نسخته، لكن الحسابات والاشتراكات تدار من نظام ديلا المشترك.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    Section {
                        Button(role: .destructive) { session.logout() } label: {
                            Label("تسجيل الخروج", systemImage: "rectangle.portrait.and.arrow.right")
                        }
                    }
                }
                .navigationTitle("حسابي")
            }
            .tabItem { Label("حسابي", systemImage: "person.crop.circle.fill") }
        }
        .tint(.pink)
        .environment(\.layoutDirection, .rightToLeft)
        .task {
            await catalogue.reload(using: session)
        }
    }
}
