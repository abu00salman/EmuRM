import UIKit
import WebKit
import SafariServices
import AVFoundation
import Photos

/// The entire native shell — one WKWebView pointed at the real deployed site, same
/// architecture as android-app/: EmuRM's existing service worker (public/sw.js) already
/// gives it an offline-capable app shell and a permanent core cache, so there is no
/// second copy of the web build bundled here to drift out of sync with what's actually
/// live. Everything below is strictly what a browser tab can't do on its own: immersive
/// fullscreen, audio session handling, a blob-download workaround (WKWebView can't
/// resolve blob: URLs any more than Android's WebView can), and a native fallback for
/// the one failure a page can't render its own error screen for — failing before it
/// ever loaded.
final class WebViewController: UIViewController {
    /// The real, deployed site. To point a local build at `npm run dev` instead (e.g.
    /// for testing against your own machine on the same network), change this to your
    /// machine's LAN IP — App Transport Security blocks plain http:// by default, so
    /// that only works against a server with a certificate, or with a temporary,
    /// narrowly-scoped ATS exception you add back out before shipping anywhere.
    private static let baseURL = URL(string: "https://www.emurm.com/")!
    private static let baseHost = baseURL.host

    private var webView: WKWebView!
    private let loadingSpinner = UIActivityIndicatorView(style: .medium)
    private let errorView = UIView()
    private let errorTitleLabel = UILabel()
    private let errorBodyLabel = UILabel()
    private let retryButton = UIButton(type: .system)

    private var isPlaying = false { didSet { if isPlaying != oldValue { setNeedsStatusBarAppearanceUpdate() } } }
    private var isMenuOpen = false
    private var pageReady = false

    override var prefersStatusBarHidden: Bool { isPlaying }
    override var prefersHomeIndicatorAutoHidden: Bool { isPlaying }
    override var preferredStatusBarUpdateAnimation: UIStatusBarAnimation { .fade }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        configureAudioSession()
        configureWebView()
        configureErrorOverlay()
        configureLoadingSpinner()
        webView.load(URLRequest(url: Self.baseURL))

        NotificationCenter.default.addObserver(
            self, selector: #selector(audioSessionInterrupted(_:)),
            name: AVAudioSession.interruptionNotification, object: nil,
        )
    }

    // MARK: - WebView setup

    private func configureWebView() {
        let config = WKWebViewConfiguration()
        // Autoplay without a prior user gesture on *this* page — the tap that starts a
        // game already happened on the library page before it, a genuine user gesture,
        // just not one WKWebView's own per-navigation gesture tracking carries over.
        config.mediaTypesRequiringUserActionForPlayback = []
        config.allowsInlineMediaPlayback = true
        config.websiteDataStore = .default() // persistent — IndexedDB/localStorage survive relaunches

        let contentController = WKUserContentController()
        contentController.add(LeakAvoidingScriptMessageHandler(self), name: "emurmNative")
        config.userContentController = contentController

        webView = WKWebView(frame: .zero, configuration: config)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
    }

    private func configureLoadingSpinner() {
        loadingSpinner.translatesAutoresizingMaskIntoConstraints = false
        loadingSpinner.color = .systemGray
        view.addSubview(loadingSpinner)
        NSLayoutConstraint.activate([
            loadingSpinner.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            loadingSpinner.centerYAnchor.constraint(equalTo: view.centerYAnchor),
        ])
    }

    // MARK: - Native error screen
    // Only for a failure *before* the page ever loaded (no network on first-ever
    // launch, before the service worker had anything cached) — once a page has loaded
    // once, any further failure is its own job (src/app/error.tsx / global-error.tsx).

    private func configureErrorOverlay() {
        errorView.translatesAutoresizingMaskIntoConstraints = false
        errorView.backgroundColor = .black
        errorView.isHidden = true
        view.addSubview(errorView)
        NSLayoutConstraint.activate([
            errorView.topAnchor.constraint(equalTo: view.topAnchor),
            errorView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            errorView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            errorView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])

        let stack = UIStackView(arrangedSubviews: [errorTitleLabel, errorBodyLabel, retryButton])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 10
        stack.translatesAutoresizingMaskIntoConstraints = false
        errorView.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: errorView.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: errorView.centerYAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: errorView.leadingAnchor, constant: 32),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: errorView.trailingAnchor, constant: -32),
        ])

        errorTitleLabel.textColor = .white
        errorTitleLabel.font = .boldSystemFont(ofSize: 22)
        errorTitleLabel.textAlignment = .center
        errorTitleLabel.numberOfLines = 0

        errorBodyLabel.textColor = .lightGray
        errorBodyLabel.font = .systemFont(ofSize: 14)
        errorBodyLabel.textAlignment = .center
        errorBodyLabel.numberOfLines = 0

        retryButton.setTitle("Retry", for: .normal)
        retryButton.setTitleColor(.black, for: .normal)
        retryButton.backgroundColor = .white
        retryButton.layer.cornerRadius = 18
        retryButton.contentEdgeInsets = UIEdgeInsets(top: 10, left: 24, bottom: 10, right: 24)
        retryButton.addTarget(self, action: #selector(retryTapped), for: .touchUpInside)
    }

    private func showError(httpFailure: Bool) {
        loadingSpinner.stopAnimating()
        errorTitleLabel.text = httpFailure ? "Something went wrong" : "Can't reach EmuRM"
        errorBodyLabel.text = httpFailure
            ? "EmuRM didn't load correctly. This is usually temporary."
            : "No internet connection, and nothing is cached yet for offline use. Connect once to load the app, then it keeps working offline."
        errorView.isHidden = false
    }

    @objc private func retryTapped() {
        errorView.isHidden = true
        loadingSpinner.startAnimating()
        webView.reload()
    }

    // MARK: - Audio session
    // GAME-usage playback category, same spirit as Android's AudioFocusController:
    // on an interruption (a call, another app), pause through the pause menu's own
    // Escape handling instead of inventing a second mechanism — and don't auto-resume
    // when the interruption ends, so the game doesn't start moving again while the
    // player isn't looking at the screen.

    private func configureAudioSession() {
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, mode: .default, options: [])
        try? session.setActive(true)
    }

    @objc private func audioSessionInterrupted(_ note: Notification) {
        guard let info = note.userInfo,
              let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else { return }
        if type == .began, isPlaying, !isMenuOpen {
            dispatchSyntheticEscape()
        }
    }

    private func dispatchSyntheticEscape() {
        webView.evaluateJavaScript(
            "window.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true}))",
            completionHandler: nil,
        )
    }

    // MARK: - Native bridge (called from WKScriptMessageHandler, see LeakAvoidingScriptMessageHandler)

    fileprivate func handleScriptMessage(_ body: Any) {
        guard let dict = body as? [String: Any], let action = dict["action"] as? String else { return }
        switch action {
        case "notifyPlaying":
            isPlaying = (dict["playing"] as? Bool) ?? false
        case "notifyMenuOpen":
            isMenuOpen = (dict["open"] as? Bool) ?? false
        case "saveBlob":
            guard let base64 = dict["base64Data"] as? String,
                  let filename = dict["filename"] as? String,
                  let mime = dict["mimeType"] as? String else { return }
            saveBlob(base64Data: base64, filename: filename, mimeType: mime)
        default:
            break
        }
    }

    // MARK: - Blob downloads (screenshots, etc.)
    // WKWebView can't resolve blob: URLs through its own download machinery any more
    // than Android's WebView can — src/lib/native-bridge.ts intercepts the click and
    // hands the bytes here as base64 instead.

    private func saveBlob(base64Data: String, filename: String, mimeType: String) {
        guard let data = Data(base64Encoded: base64Data) else { return }
        if mimeType.hasPrefix("image/"), let image = UIImage(data: data) {
            PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
                guard status == .authorized || status == .limited else { return }
                UIImageWriteToSavedPhotosAlbum(image, nil, nil, nil)
            }
            return
        }
        // Non-image blobs: the app's own Documents directory, reachable from the Files
        // app since this isn't a photo the system Photos permission covers.
        guard let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { return }
        try? data.write(to: dir.appendingPathComponent(filename))
    }
}

// MARK: - WKNavigationDelegate

extension WebViewController: WKNavigationDelegate {
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }
        if navigationAction.targetFrame?.isMainFrame == true, url.host != Self.baseHost, url.scheme == "https" || url.scheme == "http" {
            decisionHandler(.cancel)
            let safari = SFSafariViewController(url: url)
            present(safari, animated: true)
            return
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        pageReady = true
        loadingSpinner.stopAnimating()
        errorView.isHidden = true
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        pageReady = true
        showError(httpFailure: false)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        pageReady = true
        if !((error as NSError).domain == NSURLErrorDomain && (error as NSError).code == NSURLErrorCancelled) {
            showError(httpFailure: false)
        }
    }

    // Deliberately NOT implemented: the default, server-trust-only TLS behavior is
    // exactly the required one — fail closed, no exceptions, no custom challenge
    // handler that could be made to accept anything. Not implementing this delegate
    // method at all is how that default stays in effect.
}

// MARK: - WKUIDelegate

extension WebViewController: WKUIDelegate {
    // Not implementing webView(_:createWebViewWith:for:windowFeatures:) means
    // window.open()/target="_blank" is a no-op instead of spawning a second WebView —
    // matches Android's setSupportMultipleWindows(false).
}

/// WKUserContentController retains its message handlers strongly, and a WKWebView
/// retains its configuration — a WebViewController that added itself directly as the
/// handler would hold a retain cycle through the WKWebView it owns. This thin,
/// weakly-referencing wrapper is the standard way to break that cycle.
private final class LeakAvoidingScriptMessageHandler: NSObject, WKScriptMessageHandler {
    private weak var target: WebViewController?
    init(_ target: WebViewController) { self.target = target }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.handleScriptMessage(message.body)
    }
}
