import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== "--output")) {
  throw new Error("Usage: node scripts/prepare-safari.mjs [--output directory]");
}
const output = args.length ? resolve(args[1]) : join(root, "dist/safari");
// Refuse destructive destinations; only the dedicated package directory is replaced.
if (output === root || root.startsWith(output + "/")) throw new Error("Output must not contain the project.");
await mkdir(output, { recursive: true });
for (const folder of ["src", "icons"]) {
  await rm(join(output, folder), { recursive: true, force: true });
  await mkdir(join(output, folder), { recursive: true });
  for (const entry of await readdir(join(root, folder), { withFileTypes: true })) {
    if (entry.isFile() && /\.(js|css|png|svg)$/.test(entry.name)) {
      await copyFile(join(root, folder, entry.name), join(output, folder, entry.name));
    }
  }
}
for (const file of ["popup.html", "options.html", "onboarding.html", "LICENSE"]) {
  await copyFile(join(root, file), join(output, file));
}
const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
manifest.permissions = manifest.permissions.filter((permission) => permission !== "notifications");
manifest.permissions.push("nativeMessaging");
manifest.browser_specific_settings = { safari: { strict_min_version: "18.0" } };
await writeFile(join(output, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`Safari resources: ${output}`);
