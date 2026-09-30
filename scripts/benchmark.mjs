#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const options = {
    prompts: path.join(root, "evals", "prompts.jsonl"),
    plugin: path.join(root, "plugins", "tapori-talk"),
    cwd: process.cwd(),
    claude: "claude",
    runs: 1,
    out: path.resolve("tapori-talk-benchmark.json"),
  };
  const args = [...argv];
  while (args.length > 0) {
    const key = args.shift();
    const value = args.shift();
    if (!value) throw new Error(`Missing value for ${key}`);
    if (key === "--prompts") options.prompts = path.resolve(value);
    else if (key === "--plugin") options.plugin = path.resolve(value);
    else if (key === "--cwd") options.cwd = path.resolve(value);
    else if (key === "--claude") options.claude = value;
    else if (key === "--runs") options.runs = Number.parseInt(value, 10);
    else if (key === "--out") options.out = path.resolve(value);
    else throw new Error(`Unknown option: ${key}`);
  }
  return options;
}

function loadPrompts(filePath) {
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line, index) => {
      const value = JSON.parse(line);
      if (typeof value.prompt !== "string") throw new Error(`Invalid prompt at line ${index + 1}`);
      return value;
    });
}

function numericFields(value, prefix = "", output = {}) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => numericFields(child, `${prefix}[${index}]`, output));
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      numericFields(child, prefix ? `${prefix}.${key}` : key, output);
    }
  } else if (typeof value === "number" && /(token|cost)/i.test(prefix)) {
    output[prefix] = value;
  }
  return output;
}

function runClaude(options, prompt, plugin) {
  const args = ["--bare"];
  if (plugin) args.push("--plugin-dir", plugin);
  args.push("-p", prompt, "--output-format", "json");
  const started = performance.now();
  const completed = spawnSync(options.claude, args, {
    cwd: options.cwd,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  const elapsedSeconds = (performance.now() - started) / 1000;
  if (completed.error || completed.status !== 0) {
    throw new Error(completed.error?.message ?? completed.stderr ?? completed.stdout);
  }
  return { payload: JSON.parse(completed.stdout), elapsedSeconds };
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

const options = parseArgs(process.argv.slice(2));
const prompts = loadPrompts(options.prompts);
const records = [];

for (const item of prompts) {
  for (let run = 1; run <= options.runs; run += 1) {
    for (const arm of ["baseline", "compact"]) {
      const plugin = arm === "compact" ? options.plugin : null;
      const { payload, elapsedSeconds } = runClaude(options, item.prompt, plugin);
      const result = String(payload.result ?? "");
      const expected = (item.must_include_any ?? []).map(String);
      const termCheck = expected.length === 0 || expected.some((term) => result.toLowerCase().includes(term.toLowerCase()));
      const record = {
        id: item.id ?? item.prompt.slice(0, 40),
        run,
        arm,
        result,
        resultChars: result.length,
        resultWords: result.trim() ? result.trim().split(/\s+/).length : 0,
        elapsedSeconds,
        termCheck,
        metrics: numericFields(payload),
      };
      records.push(record);
      console.log(`${record.id} run=${run} ${arm}: words=${record.resultWords} term_check=${termCheck}`);
    }
  }
}

fs.writeFileSync(options.out, `${JSON.stringify(records, null, 2)}\n`, "utf8");
console.log(`\nRaw results: ${options.out}`);

for (const arm of ["baseline", "compact"]) {
  const subset = records.filter((record) => record.arm === arm);
  console.log(`${arm}: mean_words=${mean(subset.map((record) => record.resultWords))?.toFixed(1)}; term_checks=${subset.filter((record) => record.termCheck).length}/${subset.length}`);
}

const baseline = mean(records.filter((record) => record.arm === "baseline").map((record) => record.resultWords));
const compact = mean(records.filter((record) => record.arm === "compact").map((record) => record.resultWords));
if (baseline && compact !== null) {
  console.log(`Output-word reduction: ${(1 - compact / baseline).toLocaleString(undefined, { style: "percent", maximumFractionDigits: 1 })}`);
}
