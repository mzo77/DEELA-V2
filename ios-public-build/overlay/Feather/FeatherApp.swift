//
//  FeatherApp.swift
//  Feather
//
//  Created by samara on 10.04.2025.
//

import SwiftUI
import Nuke
import IDeviceSwift
import OSLog
import Security

@main
struct FeatherApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var deelaSession = DeelaSubscriberSession()

    var body: some Scene {
        WindowGroup {
            Group {
                if deelaSession.authorized {
                    if deelaSession.isOwner {
                        // One DEELA application, server-verified owner role:
                        // grant the existing complete DEELA owner controls.
                        DeelaOwnerPanel(session: deelaSession)
                    } else {
                        // Subscriber role: only the iOS catalogue and permitted IPA downloads.
                        DeelaPreviewHome(session: deelaSession)
                    }
                } else {
                    DeelaSubscriberGate(session: deelaSession)
                }
            }
            .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
                Task { await deelaSession.checkOnResume() }
            }
        }
    }
}

class AppDelegate: NSObject, UIApplicationDelegate {
	func application(
		_ application: UIApplication,
		didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
	) -> Bool {
		// The subscriber app uses a document folder for user-initiated IPA downloads; never store certificates here.
		_createPipeline()
		return true
	}
	
	private func _createPipeline() {
		DataLoader.sharedUrlCache.diskCapacity = 0
		
		let pipeline = ImagePipeline {
			let dataLoader: DataLoader = {
				let config = URLSessionConfiguration.default
				config.urlCache = nil
				return DataLoader(configuration: config)
			}()
			let dataCache = try? DataCache(name: "thewonderofyou.Feather.datacache") // disk cache
			let imageCache = Nuke.ImageCache() // memory cache
			dataCache?.sizeLimit = 500 * 1024 * 1024
			imageCache.costLimit = 100 * 1024 * 1024
			$0.dataCache = dataCache
			$0.imageCache = imageCache
			$0.dataLoader = dataLoader
			$0.dataCachePolicy = .automatic
			$0.isStoringPreviewsInMemoryCache = false
		}
		
		ImagePipeline.shared = pipeline
	}
	

}


// MARK: - DEELA subscriber gate
// Intentionally self-contained. The DEELA entry point shows only a native
// DEELA catalogue and user-initiated IPA file saving for authorized iOS subscribers.
// Native installation requires separate valid signing; legacy
// Feather components remain archived in source but are not exposed in the UI.
@MainActor
final class DeelaSubscriberSession: ObservableObject {
    @Published private(set) var authorized = false
    @Published private(set) var isOwner = false
    @Published private(set) var tokenRevision = 0
    var ownerWebToken: String? {
        authorized && isOwner && !accessToken.isEmpty ? accessToken : nil
    }
    @Published private(set) var loading = true
    @Published private(set) var submitting = false
    @Published private(set) var message = ""
    @Published private(set) var accountLabel = ""
    private var accessToken = ""
    private var sessionRefreshInProgress = false
    private var accessTokenExpiry = Date.distantPast
    private static let origin = "https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-ios-web"
    private static let keychainService = "com.mzo77.deela.ios.session"
    private static let keychainAccount = "refresh-token"

    init() {
        Task { await restore() }
    }

    private func request(_ endpoint: String, payload: [String: Any]? = nil, bearer: Bool = false) async throws -> [String: Any] {
        guard let url = URL(string: Self.origin + endpoint) else { throw NSError(domain: "DEELA", code: -1) }
        var req = URLRequest(url: url)
        req.cachePolicy = .reloadIgnoringLocalCacheData
        req.timeoutInterval = 25
        if let payload {
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONSerialization.data(withJSONObject: payload)
        }
        if bearer && !accessToken.isEmpty {
            req.setValue("Bearer " + accessToken, forHTTPHeaderField: "Authorization")
        }
        let (data, response) = try await URLSession.shared.data(for: req)
        let result = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw NSError(domain: "DEELA", code: 401, userInfo: [
                NSLocalizedDescriptionKey: (result["error"] as? String) ?? "تعذر الاتصال بخدمة ديلا"
            ])
        }
        return result
    }

    /// Reads subscriber-visible catalogue metadata only. No IPA file URLs,
    /// signing certificates or installation commands are exposed through this API.
    func previewJSON(_ endpoint: String) async throws -> [String: Any] {
        guard authorized else {
            throw NSError(domain: "DEELA", code: 403,
                          userInfo: [NSLocalizedDescriptionKey: "اشتراك الآيفون غير نشط"])
        }
        do {
            return try await request(endpoint, bearer: true)
        } catch {
            guard let saved = readRefresh() else { throw error }
            let tokens = try await request("/api/refresh", payload: ["refresh_token": saved])
            apply(tokens)
            try await verify()
            guard authorized else {
                throw NSError(domain: "DEELA", code: 403,
                              userInfo: [NSLocalizedDescriptionKey: "انتهت صلاحية اشتراك الآيفون"])
            }
            return try await request(endpoint, bearer: true)
        }
    }

    /// A subscriber can request an original publisher URL for a visible Accretion entry.
    /// No signing certificates or installation rights are issued by this endpoint.
    func ipaDownloadURL(id: Int, catalogKey: String) async throws -> URL {
        guard authorized else {
            throw NSError(domain: "DEELA", code: 403, userInfo: [
                NSLocalizedDescriptionKey: "اشتراك الآيفون غير نشط"
            ])
        }
        let payload: [String: Any] = ["id": id, "catalog_key": catalogKey]
        let result: [String: Any]
        do {
            result = try await request("/api/ipa-link", payload: payload, bearer: true)
        } catch {
            guard let saved = readRefresh() else { throw error }
            let tokens = try await request("/api/refresh", payload: ["refresh_token": saved])
            apply(tokens)
            try await verify()
            guard authorized else { throw error }
            result = try await request("/api/ipa-link", payload: payload, bearer: true)
        }
        guard let raw = result["download_url"] as? String,
              let url = URL(string: raw),
              url.scheme?.lowercased() == "https",
              url.user == nil, url.password == nil else {
            throw NSError(domain: "DEELA", code: 422, userInfo: [
                NSLocalizedDescriptionKey: "مصدر التحميل لا يوفر رابط HTTPS صالحًا"
            ])
        }
        return url
    }

    @discardableResult
    private func saveRefresh(_ value: String) -> Bool {
        guard let bytes = value.data(using: .utf8), !value.isEmpty else { return false }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Self.keychainService,
            kSecAttrAccount as String: Self.keychainAccount
        ]
        let updated = SecItemUpdate(query as CFDictionary, [kSecValueData as String: bytes] as CFDictionary)
        if updated == errSecSuccess { return true }
        guard updated == errSecItemNotFound else { return false }
        let item: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Self.keychainService,
            kSecAttrAccount as String: Self.keychainAccount,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
            kSecValueData as String: bytes
        ]
        return SecItemAdd(item as CFDictionary, nil) == errSecSuccess
    }

    private func readRefresh() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Self.keychainService,
            kSecAttrAccount as String: Self.keychainAccount,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let bytes = item as? Data else { return nil }
        return String(data: bytes, encoding: .utf8)
    }

    private func deleteRefresh() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Self.keychainService,
            kSecAttrAccount as String: Self.keychainAccount
        ]
        SecItemDelete(query as CFDictionary)
    }

    private func apply(_ result: [String: Any]) {
        if let access = result["access_token"] as? String, access != accessToken {
            accessToken = access
            tokenRevision += 1
        }
        if let refresh = result["refresh_token"] as? String {
            if !saveRefresh(refresh) {
                // Never discard the previous valid refresh token on Keychain failure.
                message = "تعذر حفظ الجلسة على هذا الجهاز. تحقق من إعدادات الحماية."
            }
        }
        if let seconds = result["expires_in"] as? Int, seconds > 0 {
            accessTokenExpiry = Date().addingTimeInterval(TimeInterval(seconds))
        }
    }

    private func verify() async throws {
        let response = try await request("/api/me", bearer: true)
        let account = response["account"] as? [String: Any] ?? [:]
        // Do not authorize an owner based on input text or local preferences.
        // Role is verified by Supabase Auth + profiles on DEELA's backend.
        isOwner = account["owner"] as? Bool ?? false
        authorized = account["active"] as? Bool ?? false
        accountLabel = (account["display_name"] as? String ?? "").isEmpty && isOwner
            ? "مالك ديلا" : (account["display_name"] as? String ?? "")
        if !authorized {
            message = "حسابك موجود، لكن اشتراك iOS لم يُعتمد أو انتهت صلاحيته. يمكنك طلب الاشتراك من متجر ديلا عبر الويب."
        } else {
            message = ""
        }
    }

    func login(email: String, password: String) async {
        guard !submitting else { return }
        submitting = true
        message = ""
        defer { submitting = false }
        do {
            let result = try await request("/api/login", payload: ["email": email, "password": password])
            apply(result)
            try await verify()
        } catch {
            authorized = false
            isOwner = false
            message = error.localizedDescription
        }
    }

    private func restore() async {
        // Supabase rotates refresh tokens. Concurrent refresh attempts can invalidate
        // each other and cause a persistent login loop. Only one may run at a time.
        guard !sessionRefreshInProgress else { return }
        sessionRefreshInProgress = true
        defer {
            sessionRefreshInProgress = false
            loading = false
        }
        guard let refresh = readRefresh() else { return }
        do {
            let tokens = try await request("/api/refresh", payload: ["refresh_token": refresh])
            apply(tokens)
            try await verify()
        } catch {
            // Do not log out on temporary connection failure, offline mode or
            // a 5xx response. Preserve Keychain so next launch can retry.
            if (error as NSError).domain == "DEELA",
               (error as NSError).code == 401 {
                authorized = false
                isOwner = false
                accessToken = ""
                tokenRevision += 1
                deleteRefresh()
                message = "انتهت جلسة الدخول. سجّل دخولك مرة واحدة لتجديدها."
            } else if !authorized {
                message = "تعذر الاتصال مؤقتًا. سيعاد التحقق عند فتح التطبيق."
            }
        }
    }

    func checkOnResume() async {
        guard !loading, !submitting, !sessionRefreshInProgress else { return }
        guard readRefresh() != nil else { return }
        // An active session must remain on the catalogue when reopening app.
        // Refresh only when the access token is close to expiring.
        guard !authorized || accessTokenExpiry.timeIntervalSinceNow < 90 else { return }
        await restore()
    }

    func refreshOwnerAccess() async {
        guard isOwner, authorized, !sessionRefreshInProgress,
              readRefresh() != nil else { return }
        await restore()
    }

    func logout() {
        authorized = false
        isOwner = false
        accessToken = ""
        accessTokenExpiry = .distantPast
        tokenRevision += 1
        accountLabel = ""
        message = ""
        deleteRefresh()
    }
}


// Optional local login autofill. Only saved with explicit opt-in, after successful
// Supabase login. Stored using iOS Keychain (device-only); never in source or logs.
private enum DeelaSavedLogin {
    private static let service = "com.mzo77.deela.ios.saved-login"
    private static let account = "optional-password"
    private struct Credentials: Codable {
        let login: String
        let password: String
    }

    static func read() -> (login: String, password: String)? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecMatchLimit as String: kSecMatchLimitOne,
            kSecReturnData as String: true
        ]
        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data,
              let credentials = try? JSONDecoder().decode(Credentials.self, from: data)
        else { return nil }
        return (credentials.login, credentials.password)
    }

    @discardableResult
    static func save(login: String, password: String) -> Bool {
        guard !login.isEmpty, !password.isEmpty,
              let data = try? JSONEncoder().encode(Credentials(login: login, password: password))
        else { return false }
        delete()
        let item: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            kSecValueData as String: data
        ]
        return SecItemAdd(item as CFDictionary, nil) == errSecSuccess
    }

    static func delete() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        SecItemDelete(query as CFDictionary)
    }
}

private struct DeelaSubscriberGate: View {
    @ObservedObject var session: DeelaSubscriberSession
    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false
    @State private var rememberPassword = false
    @State private var didLoadStoredLogin = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    Image(systemName: "square.stack.3d.up.fill")
                        .font(.system(size: 48, weight: .semibold))
                        .foregroundStyle(.pink)
                        .padding(.top, 35)
                    Text("DEELA iOS")
                        .font(.largeTitle.bold())
                    Text("متجر المشتركين ولوحة المالك في تطبيق واحد")
                        .foregroundStyle(.secondary)
                    if session.loading {
                        ProgressView("التحقق من حساب ديلا...")
                            .padding()
                    } else {
                        TextField("البريد الإلكتروني أو اسم مستخدم المالك", text: $email)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .textContentType(.username)
                            .keyboardType(.emailAddress)
                            .textFieldStyle(.roundedBorder)
                        HStack(spacing: 8) {
                            Group {
                                if showPassword {
                                    TextField("كلمة المرور", text: $password)
                                        .textContentType(.password)
                                } else {
                                    SecureField("كلمة المرور", text: $password)
                                        .textContentType(.password)
                                }
                            }
                            .textFieldStyle(.roundedBorder)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()

                            Button {
                                showPassword.toggle()
                            } label: {
                                Image(systemName: showPassword ? "eye.slash" : "eye")
                                    .frame(width: 40, height: 40)
                            }
                            .accessibilityLabel(showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور")
                            .buttonStyle(.borderless)
                        }
                        Toggle("حفظ كلمة المرور على هذا الآيفون", isOn: $rememberPassword)
                            .font(.footnote)
                            .onChange(of: rememberPassword) { enabled in
                                if !enabled && didLoadStoredLogin {
                                    DeelaSavedLogin.delete()
                                }
                            }
                        Button {
                            Task {
                                let chosenLogin = email.trimmingCharacters(in: .whitespacesAndNewlines)
                                await session.login(email: chosenLogin, password: password)
                                if session.authorized {
                                    if rememberPassword {
                                        _ = DeelaSavedLogin.save(login: chosenLogin, password: password)
                                    } else {
                                        DeelaSavedLogin.delete()
                                    }
                                }
                            }
                        } label: {
                            if session.submitting { ProgressView() }
                            else { Text("تسجيل الدخول إلى ديلا") }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.pink)
                        .disabled(session.submitting || email.isEmpty || password.isEmpty)
                        if !session.message.isEmpty {
                            Text(session.message)
                                .font(.footnote)
                                .foregroundStyle(.orange)
                                .multilineTextAlignment(.center)
                        }
                        Link("إنشاء حساب أو طلب اشتراك iOS",
                             destination: URL(string: "https://mzo77.github.io/DEELA-V2/ios/")!)
                            .font(.footnote)
                        Link("استعادة كلمة المرور من موقع ديلا",
                             destination: URL(string: "https://mzo77.github.io/DEELA-V2/ios/")!)
                            .font(.footnote)
                    }
                    Text("حساب المالك يفتح إدارة ديلا الكاملة، وحساب المشترك يعرض مكتبة الآيفون والتنزيلات المتاحة. تثبيت IPA يتطلب توقيعًا صالحًا.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.top, 20)
                }
                .padding(24)
                .frame(maxWidth: 480)
                .frame(maxWidth: .infinity)
            }
            .navigationTitle("تطبيقات ديلا")
        }
        .onAppear {
            guard !didLoadStoredLogin else { return }
            didLoadStoredLogin = true
            if let saved = DeelaSavedLogin.read() {
                email = saved.login
                password = saved.password
                rememberPassword = true
            }
        }
    }
}
