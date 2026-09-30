#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const NOISY_COMMAND = /(?:^|[;&|]\s*)(?:(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:test|build|lint|typecheck|check|install|ci)\b|(?:npx\s+)?(?:jest|vitest|mocha|eslint|tsc)\b|pytest\b|python(?:3)?\s+-m\s+pytest\b|cargo\s+(?:test|build|check|clippy)\b|go\s+test\b|mvn(?:w)?\s+.*(?:test|verify|package)\b|gradle(?:w)?\s+.*(?:test|build|check)\b|dotnet\s+(?:test|build)\b)/i;
const CONTENT_COMMAND = /^\s*(?:cat|sed|awk|perl|head|tail|less|more|grep|rg|find|git\s+(?:diff|show|log|blame)|jq|yq|sqlite3|psql|mysql)\b/i;
const DIAGNOSTIC = /(?:\b(?:error|failed|failure|exception|traceback|panic|fatal|warning|warn|assertion|expected|received|timeout|timed out|segmentation fault|unhandled|rejected|not ok)\b|^\s*(?:FAIL|FAILED|ERROR|WARN|\u00d7|\u2717|\u2718)|\bat\s+[^\s].*:\d+(?::\d+)?\b|\b[^\s:]+\.(?:js|jsx|ts|tsx|py|java|kt|go|rs|cs|rb|php):\d+(?::\d+)?\b)/i;
const SUMMARY = /(?:\b(?:passed|passing|failed|skipped|tests?|suites?|build|compiled|warnings?|errors?)\b.*\b\d+\b|\b\d+\s+(?:passed|failed|skipped|warnings?|errors?)\b|^\s*(?:Test Suites:|Tests:|Snapshots:|Time:|Ran all test suites|BUILD SUCCESS|BUILD FAILURE))/i;
const PROGRESS_ONLY = /^\s*(?:[.\u00b7\u2022#=>-]{8,}|\d{1,3}%|\[[=> .-]+\]|Downloading\s+\d+%|Progress:\s*\d+%)\s*$/i;

function envInt(env, name, fallback) {
  const value = Number.parseInt(env[name] ?? "", 10);
  return Number.isFinite(value) ? value : fallback;
}

function enabled(env) {
  return !new Set(["0", "false", "off", "no"]).has(String(env.tapori-talk_BOLTI_HOOK ?? "1").toLowerCase());
}

export function isEligible(command, text, options = {}) {
  const env = options.env ?? process.env;
  const minChars = options.minChars ?? envInt(env, "tapori-talk_BOLTI_MIN_CHARS", 6000);
  const minLines = options.minLines ?? envInt(env, "tapori-talk_BOLTI_MIN_LINES", 120);

  if (!enabled(env) || CONTENT_COMMAND.test(command) || !NOISY_COMMAND.test(command)) {
    return false;
  }

  return text.length >= minChars || text.split("\n").length >= minLines;
}

function indexesWithContext(lineCount, indexes, radius) {
  const keep = new Set();
  for (const index of indexes) {
    const start = Math.max(0, index - radius);
    const end = Math.min(lineCount, index + radius + 1);
    for (let current = start; current < end; current += 1) {
      keep.add(current);
    }
  }
  return keep;
}

export function compactText(text, options = {}) {
  const env = options.env ?? process.env;
  const headLines = options.headLines ?? envInt(env, "tapori-talk_BOLTI_HEAD_LINES", 18);
  const tailLines = options.tailLines ?? envInt(env, "tapori-talk_BOLTI_TAIL_LINES", 28);
  const contextLines = options.contextLines ?? 2;
  const lines = text.split(/\r?\n/);

  if (lines.length === 0) {
    return text;
  }

  const important = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (DIAGNOSTIC.test(lines[index]) || SUMMARY.test(lines[index])) {
      important.push(index);
    }
  }

  const keep = new Set();
  for (let index = 0; index < Math.min(headLines, lines.length); index += 1) {
    keep.add(index);
  }
  for (let index = Math.max(0, lines.length - tailLines); index < lines.length; index += 1) {
    keep.add(index);
  }
  for (const index of indexesWithContext(lines.length, important, contextLines)) {
    keep.add(index);
  }

  const output = [];
  let omitted = 0;
  let previous = null;

  const flushOmitted = () => {
    if (omitted > 0) {
      output.push(`... [${omitted} low-signal lines omitted] ...`);
      omitted = 0;
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const normalized = lines[index].replace(/\s+$/u, "");
    if (!keep.has(index) || PROGRESS_ONLY.test(normalized)) {
      omitted += 1;
      continue;
    }
    if (normalized === previous && !DIAGNOSTIC.test(normalized)) {
      omitted += 1;
      continue;
    }
    flushOmitted();
    output.push(normalized);
    previous = normalized;
  }

  flushOmitted();
  return output.join("\n");
}

function defaultCacheDir(env) {
  if (env.tapori-talk_BOLTI_CACHE) {
    return path.resolve(env.tapori-talk_BOLTI_CACHE.replace(/^~(?=$|[\\/])/, os.homedir()));
  }
  return path.join(os.homedir(), ".cache", "tapori-talk", "raw");
}

export function saveOriginal(event, response, options = {}) {
  const env = options.env ?? process.env;
  const cacheDir = options.cacheDir ?? defaultCacheDir(env);
  const normalizedPayload = JSON.stringify({
    tool_input: event.tool_input ?? {},
    tool_response: response,
  });
  const digest = crypto.createHash("sha256").update(normalizedPayload).digest("hex").slice(0, 20);
  fs.mkdirSync(cacheDir, { recursive: true });
  const recoveryPath = path.join(cacheDir, `${digest}.json`);
  if (!fs.existsSync(recoveryPath)) {
    fs.writeFileSync(recoveryPath, `${normalizedPayload}\n`, "utf8");
  }
  return recoveryPath;
}

export function buildRewrite(event, options = {}) {
  if (event?.tool_name !== "Bash") {
    return null;
  }

  const toolInput = event.tool_input;
  const response = event.tool_response;
  const command = toolInput?.command;
  const stdout = response?.stdout;

  if (!toolInput || !response || typeof command !== "string" || typeof stdout !== "string") {
    return null;
  }
  if (!isEligible(command, stdout, options)) {
    return null;
  }

  const compact = compactText(stdout, options);
  if (compact.length >= stdout.length * 0.9) {
    return null;
  }

  const recoveryPath = saveOriginal(event, response, options);
  const originalLines = stdout.length === 0 ? 0 : stdout.split(/\r?\n/).length;
  const compactLines = compact.length === 0 ? 0 : compact.split(/\r?\n/).length;
  const header = `[tapori-talk: ${originalLines} -> ${compactLines} lines; full output: ${recoveryPath}]`;

  return {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      updatedToolOutput: {
        ...response,
        stdout: `${header}\n${compact}`,
      },
    },
  };
}

async function readStdin() {
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }
  try {
    const parsed = JSON.parse(input);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function main() {
  const event = await readStdin();
  const rewrite = buildRewrite(event);
  if (rewrite) {
    process.stdout.write(JSON.stringify(rewrite));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(() => {
    process.exitCode = 0;
  });
}
