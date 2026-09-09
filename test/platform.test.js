import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import * as platform from "../src/platform.js";

afterEach(() => { delete globalThis.chrome; });

test("Chrome failure alerts use the browser notification API", async () => {
  let alert;
  globalThis.chrome = {
    runtime: { getURL: () => "chrome-extension://test/" },
    notifications: { create: async (options) => { alert = options; return "id"; } }
  };
  assert.equal(await platform.notifyFailure("Sync failed", "Offline"), true);
  assert.equal(alert.title, "Sync failed");
  assert.equal(alert.message, "Offline");
});

test("Safari failure alerts reach the native handler without sending credentials", async () => {
  let request;
  globalThis.chrome = {
    runtime: {
      getURL: () => "safari-web-extension://test/",
      sendNativeMessage: async (host, message) => { request = { host, message }; return { ok: true }; }
    }
  };
  assert.equal(await platform.notifyFailure("Sync failed", "Offline"), true);
  assert.deepEqual(request.message, { type: "notify", title: "Sync failed", message: "Offline" });
});

test("notification delivery failure does not throw into submission error handling", async () => {
  globalThis.chrome = {
    runtime: {
      getURL: () => "safari-web-extension://test/",
      sendNativeMessage: async () => { throw new Error("Native host unavailable"); }
    }
  };
  assert.equal(await platform.notifyFailure("Sync failed", "Offline"), false);
});

test("Safari denied notifications are reported as undelivered", async () => {
  globalThis.chrome = {
    runtime: {
      getURL: () => "safari-web-extension://test/",
      sendNativeMessage: async () => ({ ok: false, error: "Notifications denied" })
    }
  };
  assert.equal(await platform.notifyFailure("Sync failed", "Offline"), false);
});

test("website access requests run during the click and ask only for the two required hosts", async () => {
  let requested = false;
  globalThis.chrome = {
    permissions: { request: (permissions) => {
      requested = true;
      assert.deepEqual(permissions.origins, ["https://leetcode.com/*", "https://api.github.com/*"]);
      return Promise.resolve(false);
    } }
  };
  const result = platform.requestWebsiteAccess();
  assert.equal(requested, true);
  assert.equal(await result, false);
});

test("Safari shortcut action never opens a Chrome internal URL", async () => {
  const urls = [];
  globalThis.chrome = {
    runtime: { getURL: () => "safari-web-extension://test/" },
    tabs: { create: async ({ url }) => urls.push(url) }
  };
  await assert.rejects(platform.openShortcutSettings(), /Safari/);
  assert.deepEqual(urls, []);
});
