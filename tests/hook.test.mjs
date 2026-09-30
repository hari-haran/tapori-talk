import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildRewrite } from "../plugins/tapori-talk/hooks/compact-bash-output.mjs";

function event(command, stdout) {
  return {
    tool_name: "Bash",
    tool_input: { command },
    tool_response: {
      stdout,
      stderr: "",
      interrupted: false,
      isImage: false,
    },
  };
}

function options(cacheDir) {
  return { minChars: 100, minLines: 10, cacheDir };
}

test("compacts noisy output and preserves failures", () => {
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "tapori-talk-hook-"));
  const lines = Array.from({ length: 80 }, (_, index) => `progress line ${index}`);
  lines[40] = "FAIL src/auth.test.ts:42 Expected 200 Received 500";
  lines[79] = "Tests: 1 failed, 49 passed, 50 total";
  const rewrite = buildRewrite(event("pnpm test", lines.join("\n")), options(cacheDir));
  assert.ok(rewrite);
  const stdout = rewrite.hookSpecificOutput.updatedToolOutput.stdout;
  assert.match(stdout, /Expected 200 Received 500/);
  assert.match(stdout, /Tests: 1 failed, 49 passed, 50 total/);
  const recovery = stdout.match(/full output: (.+)]/)?.[1];
  assert.ok(recovery && fs.existsSync(recovery));
  fs.rmSync(cacheDir, { recursive: true, force: true });
});

test("skips source-reading commands", () => {
  const output = Array.from({ length: 100 }, (_, index) => `line ${index}`).join("\n");
  assert.equal(buildRewrite(event("cat huge.log", output), options(os.tmpdir())), null);
  assert.equal(buildRewrite(event("git diff", output), options(os.tmpdir())), null);
});

test("skips small output", () => {
  assert.equal(buildRewrite(event("pytest", "3 passed in 0.2s"), options(os.tmpdir())), null);
});

test("preserves unknown response fields", () => {
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "tapori-talk-hook-"));
  const sample = event("npm run build", Array.from({ length: 100 }, () => "building package").concat("Build: 100 modules compiled").join("\n"));
  sample.tool_response.exitCode = 0;
  const rewrite = buildRewrite(sample, options(cacheDir));
  assert.equal(rewrite.hookSpecificOutput.updatedToolOutput.exitCode, 0);
  fs.rmSync(cacheDir, { recursive: true, force: true });
});
