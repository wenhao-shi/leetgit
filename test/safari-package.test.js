import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, readdir, access, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

test("Safari package contains executable resources and excludes development files", async () => {
  const output = await mkdtemp(join(tmpdir(), "leetgit-package-"));
  try {
    execFileSync(process.execPath, ["scripts/prepare-safari.mjs", "--output", output]);
    const manifest = JSON.parse(await readFile(join(output, "manifest.json"), "utf8"));
    assert.ok(manifest.permissions.includes("nativeMessaging"));
    assert.ok(!manifest.permissions.includes("notifications"));
    assert.equal(manifest.background.type, "module");
    assert.equal(manifest.content_scripts[0].world, "MAIN");
    assert.equal(manifest.browser_specific_settings?.safari?.strict_min_version, "18.0");
    for (const file of [manifest.background.service_worker, manifest.action.default_popup, manifest.options_page,
      ...manifest.content_scripts.flatMap((entry) => entry.js), "src/platform.js", "src/browser-access.js"]) {
      await access(join(output, file));
    }
    const files = await readdir(output);
    assert.ok(!files.includes("test"));
    assert.ok(!files.includes("node_modules"));
    assert.ok(!files.includes(".git"));
    assert.ok(!(await readdir(join(output, "src"))).includes("assets"));
    const chromeManifest = JSON.parse(await readFile("manifest.json", "utf8"));
    assert.ok(chromeManifest.permissions.includes("notifications"));
    assert.ok(!chromeManifest.permissions.includes("nativeMessaging"));
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
