import UIKit

/// Classic UIKit app lifecycle, not SwiftUI's App/WindowGroup — see EmuRMApp.swift's
/// previous comment for why that mattered: it's one more untested layer between "the
/// window exists" and "WebViewController's view actually fills it", and the symptom
/// reported on a real device (the whole app letterboxed into a small centered
/// rectangle, as if running at some compatibility-mode resolution) points at exactly
/// that kind of sizing ambiguity. A UIWindow created and sized here directly, with
/// WebViewController set as its rootViewController, is the plain, long-established
/// way to guarantee the window's frame is the full screen — no SwiftUI hosting
/// controller, no WindowGroup scene configuration, nothing else that could disagree
/// about what size the app is supposed to be.
///
/// No UIApplicationSceneManifest in Info.plist is deliberate: declaring one would hand
/// window creation to a SceneDelegate instead, reintroducing the exact class of
/// indirection this exists to remove. Without it, iOS keeps using this single-window,
/// AppDelegate-owned flow.
@UIApplicationMain
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = WebViewController()
        window.makeKeyAndVisible()
        self.window = window
        return true
    }
}
