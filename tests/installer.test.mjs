import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { installPlugin, installationStatus, resolveTarget, uninstallPlugin } from "../src/installer.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function sandbox() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "tapori-talk-installer-"));
}

test("resolves user and project targets", () => {
  assert.equal(resolveTarget({ scope: "user", home: "/home/test" }), path.join("/home/test", ".claude", "skills", "tapori-talk"));
  assert.equal(resolveTarget({ scope: "project", cwd: "/repo" }), path.join("/repo", ".claude", "skills", "tapori-talk"));
});

test("installs, reports status, and uninstalls", () => {
  const home = sandbox();
  const result = installPlugin({ packageRoot, home, scope: "user" });
  assert.equal(result.action, "installed");
  assert.ok(fs.existsSync(path.join(result.target, ".claude-plugin", "plugin.json")));
  const status = installationStatus({ home, scope: "user" });
  assert.equal(status.installed, true);
  assert.equal(status.managed, true);
  assert.equal(status.pluginVersion, "0.1.0");
  const removed = uninstallPlugin({ home, scope: "user" });
  assert.equal(removed.action, "uninstalled");
  assert.equal(fs.existsSync(result.target), false);
  fs.rmSync(home, { recursive: true, force: true });
});

test("minimal and on-demand installation modifies only installed copy", () => {
  const home = sandbox();
  const result = installPlugin({ packageRoot, home, minimal: true, onDemand: true });
  assert.equal(fs.existsSync(path.join(result.target, "hooks")), false);
  const style = fs.readFileSync(path.join(result.target, "output-styles", "tapori-talk.md"), "utf8");
  assert.match(style, /force-for-plugin: false/);
  const sourceStyle = fs.readFileSync(path.join(packageRoot, "plugins", "tapori-talk", "output-styles", "tapori-talk.md"), "utf8");
  assert.match(sourceStyle, /force-for-plugin: true/);
  fs.rmSync(home, { recursive: true, force: true });
});

test("refuses to overwrite unmanaged directory without force", () => {
  const home = sandbox();
  const target = resolveTarget({ home });
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, "user-file.txt"), "keep", "utf8");
  assert.throws(() => installPlugin({ packageRoot, home }), /unmanaged directory/);
  fs.rmSync(home, { recursive: true, force: true });
});
