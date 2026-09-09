import { isSafari, WEBSITE_ORIGINS, requestWebsiteAccess, requestNotificationAccess, notifyFailure } from "./platform.js";

// This module is loaded only by extension pages, never by the LeetCode content script.
if (isSafari()) {
  const card = document.getElementById("browser-access");
  card.hidden = false;
  card.innerHTML = `<strong>Safari website access</strong>
    <p role="status">Checking access to LeetCode and the GitHub API…</p>
    <button type="button">Allow website access</button>`;
  const status = card.querySelector("p");
  const button = card.querySelector("button");
  async function refresh() {
    try {
      const allowed = await chrome.permissions.contains({ origins: WEBSITE_ORIGINS });
      status.textContent = allowed
        ? "Website access is allowed. Reload any LeetCode tab that was open before you enabled LeetGit."
        : "Allow access to leetcode.com and api.github.com so LeetGit can capture submissions and save commits.";
      button.hidden = allowed;
    } catch {
      status.textContent = "Check website access in Safari Settings → Extensions → LeetGit.";
    }
  }
  button.addEventListener("click", async () => {
    try {
      const allowed = await requestWebsiteAccess();
      await refresh();
      if (!allowed) status.textContent = "Website access was not granted. In Safari Settings → Extensions → LeetGit, allow LeetCode and the GitHub API.";
    } catch (error) {
      status.textContent = `Safari could not grant access: ${error.message}. Check Safari Settings → Extensions → LeetGit.`;
    }
  });
  chrome.permissions.onAdded.addListener(refresh);
  chrome.permissions.onRemoved.addListener(refresh);
  refresh();

  const shortcutButton = document.getElementById("open-shortcuts");
  if (shortcutButton) {
    shortcutButton.hidden = true;
    document.getElementById("shortcut-help").textContent = "Safari uses the shortcut shown above. You can also click the floating LeetGit button on the problem page.";
  }

  const notificationControls = document.getElementById("safari-notifications");
  if (notificationControls) {
    notificationControls.hidden = false;
    const notificationStatus = notificationControls.querySelector("p");
    notificationControls.querySelector("button").addEventListener("click", async () => {
      try {
        const response = await requestNotificationAccess();
        if (!response?.ok) throw new Error(response?.error || "Notification access was not granted.");
        const sent = await notifyFailure("LeetGit test notification", "LeetGit can notify you when a sync fails.");
        notificationStatus.textContent = sent
          ? "Test notification sent. If no banner appears, check LeetGit in System Settings → Notifications."
          : "The notification could not be sent. Open the LeetGit app and check System Settings → Notifications.";
      } catch (error) {
        notificationStatus.textContent = error.message;
      }
    });
  }
}
