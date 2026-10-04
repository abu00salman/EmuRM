import SwiftUI

/// One screen, one WebView — see WebViewController.swift for everything that actually
/// matters. SwiftUI's App lifecycle only hosts it; a plain UIViewController gives
/// direct, unambiguous control over things like status bar visibility and the WKWebView
/// delegate methods that SwiftUI has no native wrapper for.
@main
struct EmuRMApp: App {
    var body: some Scene {
        WindowGroup {
            WebViewControllerRepresentable()
                .ignoresSafeArea()
        }
    }
}

struct WebViewControllerRepresentable: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> WebViewController {
        WebViewController()
    }

    func updateUIViewController(_ uiViewController: WebViewController, context: Context) {}
}
