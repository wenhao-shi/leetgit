export const WEBSITE_ORIGINS = ["https://leetcode.com/*", "https://api.github.com/*"];

export function isSafari() {
  return chrome.runtime.getURL("").startsWith("safari-web-extension:");
}

export function requestWebsiteAccess() {
  // Keep this call synchronous with the button click so Safari sees a user gesture.
  return chrome.permissions.request({ origins: WEBSITE_ORIGINS });
}

export async function openShortcutSettings() {
  if (isSafari()) throw new Error("Safari uses the shortcut shown here. Click the floating LeetGit button if the shortcut is unavailable.");
  await chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
}

export async function requestNotificationAccess() {
  if (!isSafari()) return { ok: true };
  return chrome.runtime.sendNativeMessage("dev.local.leetgit", { type: "authorize-notifications" });
}

export async function notifyFailure(title, message) {
  try {
    if (isSafari()) {
      const response = await chrome.runtime.sendNativeMessage("dev.local.leetgit", { type: "notify", title, message });
      return response?.ok === true;
    }
    await chrome.notifications.create({ type: "basic", iconUrl: "icons/icon128.png", title, message });
    return true;
  } catch {
    // Notification failures must not prevent the error panel and retry queue from working.
    return false;
  }
}
