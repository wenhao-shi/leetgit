import Cocoa
import SafariServices
import UserNotifications
import WebKit

private let extensionBundleIdentifier = "dev.local.leetgit.Extension"

final class ViewController: NSViewController, WKNavigationDelegate, WKScriptMessageHandler {
    @IBOutlet var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()
        webView.navigationDelegate = self
        webView.configuration.userContentController.add(self, name: "controller")
        guard let page = Bundle.main.url(forResource: "Main", withExtension: "html"),
              let resources = Bundle.main.resourceURL else { return }
        webView.loadFileURL(page, allowingReadAccessTo: resources)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) { state, error in
            DispatchQueue.main.async {
                if let state {
                    webView.evaluateJavaScript("show(\(state.isEnabled), true)")
                } else if (error as NSError?)?.code == SFErrorCode.noExtensionFound.rawValue {
                    self.showStatus("For this local build, enable Show features for web developers in Safari Settings → Advanced. Then enable Allow unsigned extensions in the Developer tab and select LeetGit in Extensions.")
                } else {
                    self.showStatus(error?.localizedDescription ?? "Open Safari Settings to enable LeetGit.")
                }
            }
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let action = message.body as? String else { return }
        switch action {
        case "open-preferences":
            SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
                if let error { DispatchQueue.main.async { self.showStatus(error.localizedDescription) } }
            }
        case "authorize-notifications":
            UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { granted, error in
                DispatchQueue.main.async {
                    self.showStatus(error?.localizedDescription ?? (granted ? "Notifications are enabled." : "Allow LeetGit in System Settings → Notifications."))
                }
            }
        default:
            break
        }
    }

    private func showStatus(_ message: String) {
        guard let data = try? JSONSerialization.data(withJSONObject: [message]),
              let json = String(data: data, encoding: .utf8) else { return }
        webView.evaluateJavaScript("document.getElementById('status').textContent = \(json)[0]")
    }
}
