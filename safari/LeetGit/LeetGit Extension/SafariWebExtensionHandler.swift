import SafariServices
import UserNotifications

final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        guard let item = context.inputItems.first as? NSExtensionItem,
              let message = item.userInfo?[SFExtensionMessageKey] as? [String: Any],
              let type = message["type"] as? String else {
            reply(context, error: "Invalid LeetGit request.")
            return
        }
        let center = UNUserNotificationCenter.current()
        switch type {
        case "authorize-notifications":
            center.requestAuthorization(options: [.alert, .sound]) { granted, error in
                self.reply(context, error: error?.localizedDescription ?? (granted ? nil : "Allow LeetGit in System Settings → Notifications, then try again."))
            }
        case "notify":
            guard let title = message["title"] as? String, !title.isEmpty,
                  let body = message["message"] as? String, !body.isEmpty else {
                reply(context, error: "The notification needs a title and a message.")
                return
            }
            center.getNotificationSettings { settings in
                guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else {
                    self.reply(context, error: "Enable notifications in LeetGit Settings → Notifications.")
                    return
                }
                let content = UNMutableNotificationContent()
                content.title = String(title.prefix(200))
                content.body = String(body.prefix(2000))
                content.sound = .default
                let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
                center.add(request) { error in
                    self.reply(context, error: error?.localizedDescription)
                }
            }
        default:
            reply(context, error: "Unknown LeetGit request.")
        }
    }

    private func reply(_ context: NSExtensionContext, error: String? = nil) {
        let response = NSExtensionItem()
        var message: [String: Any] = ["ok": error == nil]
        if let error { message["error"] = error }
        response.userInfo = [SFExtensionMessageKey: message]
        context.completeRequest(returningItems: [response])
    }
}
