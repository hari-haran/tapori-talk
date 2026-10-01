import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("marketplace points to a valid plugin", () => {
  const marketplace = JSON.parse(fs.readFileSync(path.join(root, ".claude-plugin", "marketplace.json"), "utf8"));
  const entry = marketplace.plugins.find((plugin) => plugin.name === "tapori-talk");
  assert.ok(entry);
  const pluginRoot = path.resolve(root, entry.source);
  const manifest = JSON.parse(fs.readFileSync(path.join(pluginRoot, ".claude-plugin", "plugin.json"), "utf8"));
  assert.equal(manifest.name, entry.name);
  assert.ok(fs.existsSync(path.join(pluginRoot, "skills", "tapori-talk", "SKILL.md")));
  assert.ok(fs.existsSync(path.join(pluginRoot, "output-styles", "tapori-talk.md")));
});

test("Copilot instructions are included", () => {
  const instructions = path.join(root, ".github", "copilot-instructions.md");
  assert.ok(fs.existsSync(instructions));
  assert.match(fs.readFileSync(instructions, "utf8"), /Mumbai-style Hinglish/);
});
