# LeetGit for Safari on macOS

The Safari app uses the same JavaScript and HTML as the Chrome extension. Safari 18 or later is required for the `MAIN` content script. The macOS deployment target is 13.0. iPhone and iPad are outside this port's scope.

## Build and install locally

Install Xcode and Node.js, then run these commands from the repository root:

```bash
npm test
./script/build_and_run.sh --install
```

The script builds the app, signs it with an ad hoc local signature, verifies the signatures, installs it at `~/Applications/LeetGit.app`, and opens it. It needs no Apple Developer certificate. Re-run the command after source changes to update the installed app. It replaces only an existing app with LeetGit's development bundle identifier.

To build without installation or launch, run `npm run build:safari`. Build output and logs are in `build/safari/`. Use `./script/build_and_run.sh --verify` to build, launch, and check that the process starts.

## Enable the local extension

1. In Safari Settings → Advanced, enable “Show features for web developers” if the Developer tab is absent.
2. In Safari Settings → Developer, select “Allow unsigned extensions” and complete macOS authentication if prompted. This allows locally built extensions without an Apple Developer signature.
3. In Safari Settings → Extensions, enable LeetGit. Local unsigned extensions may need to be allowed again after restarting Safari.
4. Open LeetGit from the Safari toolbar. Click “Allow website access” and grant access to `leetcode.com` and `api.github.com`. If Safari does not show the request, configure these websites under Safari Settings → Extensions → LeetGit → Edit Websites.
5. Open LeetGit Settings and enter your GitHub token, repository, and branch. Chrome storage is separate from Safari storage.
6. Reload any LeetCode problem tab that was open before you enabled the extension or granted access.

The app's “Open Safari Settings” button opens the extension's settings. The macOS app installs the extension; the Safari toolbar popup holds your repository configuration.

## Notifications

Safari does not implement `chrome.notifications`. The Safari package uses `nativeMessaging` to send failure titles and messages to `SafariWebExtensionHandler.swift`, which schedules macOS notifications using `UNUserNotificationCenter`. Credentials and submission code are not included in native messages.

In LeetGit Settings → Notifications, click “Enable and test macOS notifications.” If macOS denies notification permission, enable LeetGit in System Settings → Notifications. The LeetGit app also has an “Enable failure notifications” button. Notification delivery failures do not remove the failed submission from the retry queue or prevent the in-page error panel.

Safari shows the registered keyboard shortcut in LeetGit Settings → Format. Chrome's shortcut customization page is hidden in Safari. The floating LeetGit button also opens the panel.

## Test in Safari

Use a repository you are willing to write test commits to.

- Submit a solution and confirm that the solution file and history entry appear in GitHub.
- Submit the same code and notes again and confirm that duplicate detection skips the commit.
- Pause sync, submit again, and confirm that no commit appears.
- Disconnect the network after the submission is captured, then retry the failed sync after reconnecting.
- Close and reopen Safari, check extension enablement, and submit another solution.
- Test the custom commit-message prompt, difficulty masking, and macOS notification button.

The Node tests cover shared helpers, notification routing and failure handling, permission-request timing, Chrome shortcut isolation, and Safari resource packaging. They do not replace this live browser test.

## Project layout and release builds

`scripts/prepare-safari.mjs` creates `dist/safari/` from the shared extension source. It replaces Chrome's `notifications` permission with `nativeMessaging` and excludes tests, dependencies, Git files, and promotional images. The Xcode project's build phase runs the same script, so rebuilding in Xcode refreshes the resources. Node must be on Xcode's build PATH; the phase includes standard Homebrew paths.

Open `safari/LeetGit/LeetGit.xcodeproj` for development. The app and extension use `dev.local.leetgit` and `dev.local.leetgit.Extension`. For distribution, select your signing team and identifiers in Xcode and update the extension identifier in `ViewController.swift`. Use Xcode's archive workflow; the local build script deliberately uses ad hoc signing. App Store submission and notarization are not configured by this port.

Apple's converter may warn about `background.type` and `content_scripts.world`. Keep both for the module worker and page interceptor on Safari 18+. Removing `world` would isolate the interceptor from LeetCode's own network calls.

References: [Apple's Safari development workflow](https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension), [website permissions](https://developer.apple.com/documentation/safariservices/managing-safari-web-extension-permissions), and [native messaging](https://developer.apple.com/documentation/safariservices/messaging-between-the-app-and-javascript-in-a-safari-web-extension).
