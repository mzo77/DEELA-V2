//
// DEELA iOS — full owner controls within the same independently installed app.
// Uses the existing DEELA Control Center, not a second application or account.
// Owner identity is verified by the DEELA iOS server before this view is reachable.
//

import SwiftUI
import WebKit
import UIKit

private enum DeelaOwnerControl {
    static let origin = "https://mzo77.github.io"
    static let pathPrefix = "/DEELA-V2/control/"
    static let dashboard = URL(string: origin + pathPrefix)!
}

struct DeelaOwnerPanel: View {
    @ObservedObject var session: DeelaSubscriberSession
    @State private var manualRefresh = 0
    @State private var showSignOut = false

    var body: some View {
        NavigationStack {
            Group {
                if session.authorized, session.isOwner,
                   let ownerToken = session.ownerWebToken {
                    // Use the exact DEELA owner panel with requests, subscribers,
                    // Android/iOS catalogs, Apple certificates and operator controls.
                    DeelaOwnerControlBrowser(token: ownerToken)
                        .id("\(session.tokenRevision)-\(manualRefresh)")
                        .ignoresSafeArea(edges: .bottom)
                } else {
                    VStack(spacing: 12) {
                        Image(systemName: "lock.shield")
                            .font(.largeTitle)
                            .foregroundStyle(.secondary)
                        Text("الصلاحية غير متاحة")
                            .font(.headline)
                        Text("حساب المالك فقط يمكنه فتح لوحة الإدارة.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    .padding()
                }
            }
            .navigationTitle("إدارة المالك — ديلا")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .navigationBarTrailing) {
                    Button {
                        Task {
                            await session.refreshOwnerAccess()
                            manualRefresh += 1
                        }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .accessibilityLabel("تحديث لوحة المالك")

                    Button {
                        showSignOut = true
                    } label: {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                    }
                    .accessibilityLabel("تسجيل خروج المالك")
                }
            }
            .confirmationDialog("الخروج من حساب مالك ديلا؟",
                                isPresented: $showSignOut,
                                titleVisibility: .visible) {
                Button("تسجيل الخروج", role: .destructive) {
                    session.logout()
                }
            }
        }
        .tint(.pink)
        .environment(\.layoutDirection, .rightToLeft)
    }
}

private struct DeelaOwnerControlBrowser: UIViewRepresentable {
    let token: String

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        // Never persist the access token in a shared browser container.
        config.websiteDataStore = .nonPersistent()
        config.defaultWebpagePreferences.allowsContentJavaScript = true

        // Inject only into the exact DEELA owner dashboard main frame.
        // The dashboard already reads this first-party sessionStorage key.
        // No token is added to a URL, query string, cookie or third-party request.
        let jsonData = (try? JSONSerialization.data(
            withJSONObject: ["token": token], options: [])) ?? Data("{}".utf8)
        let credentials = String(data: jsonData, encoding: .utf8) ?? "{}"
        let script = """
        (function() {
          if (location.origin === "https://mzo77.github.io" &&
              location.pathname.startsWith("/DEELA-V2/control/")) {
            const deelaOwnerSession = \(credentials);
            if (deelaOwnerSession.token) {
              sessionStorage.setItem("deela-token", deelaOwnerSession.token);
            }
          }
        })();
        """
        let userScript = WKUserScript(
            source: script,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(userScript)

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = UIColor.systemBackground
        webView.scrollView.backgroundColor = UIColor.systemBackground
        webView.allowsBackForwardNavigationGestures = false
        webView.load(URLRequest(url: DeelaOwnerControl.dashboard,
                                cachePolicy: .reloadIgnoringLocalCacheData))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        private func isOwnerPage(_ url: URL) -> Bool {
            url.scheme == "https" &&
            url.host == "mzo77.github.io" &&
            url.path.hasPrefix(DeelaOwnerControl.pathPrefix) &&
            url.user == nil && url.password == nil
        }

        func webView(_ webView: WKWebView,
                     decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let target = action.request.url else {
                decisionHandler(.cancel)
                return
            }
            if target.scheme == "about" || isOwnerPage(target) {
                decisionHandler(.allow)
                return
            }

            // External links (e.g. Supabase dashboard) open in Safari only
            // after an explicit tap; never expose the owner's web session.
            if action.navigationType == .linkActivated &&
               target.scheme == "https" && target.user == nil && target.password == nil {
                UIApplication.shared.open(target)
            }
            decisionHandler(.cancel)
        }

        func webView(_ webView: WKWebView,
                     createWebViewWith configuration: WKWebViewConfiguration,
                     for navigationAction: WKNavigationAction,
                     windowFeatures: WKWindowFeatures) -> WKWebView? {
            if navigationAction.targetFrame == nil,
               let url = navigationAction.request.url,
               url.scheme == "https",
               navigationAction.navigationType == .linkActivated,
               url.user == nil && url.password == nil {
                UIApplication.shared.open(url)
            }
            return nil
        }
    }
}
