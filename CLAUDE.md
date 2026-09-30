# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Tapori Talk is a Claude Code plugin that accepts Mumbai-style Hinglish input and produces compact, technically precise English output. It ships as both an npm package (zero-dependency installer) and a Claude marketplace plugin.

## Commands

```bash
npm install                # install deps (none currently, but needed for node --test)
npm test                   # run all tests (node --test, discovers tests/*.test.mjs)
npm run check              # full CI: check-versions + test + pack --dry-run
npm run benchmark -- --runs 3 --out results.json  # A/B harness (needs authenticated claude CLI)
node bin/tapori-talk.mjs install --scope project --force  # local plugin install
```

Run a single test file: `node --test tests/installer.test.mjs`

## Architecture

Four layers, each in a separate file:

1. **Input interpretation** — `plugins/tapori-talk/skills/tapori-talk/SKILL.md` maps Hinglish dialect cues to task intent without translating the user's message.

2. **Output policy** — `plugins/tapori-talk/output-styles/tapori-talk.md` enforces concise technical English on every response while keeping Claude Code's built-in engineering instructions (`keep-coding-instructions: true`).

3. **Tool-output compaction hook** — `plugins/tapori-talk/hooks/compact-bash-output.mjs` is a PostToolUse hook that rewrites large noisy Bash output (test/build/lint/install) down to head + tail + diagnostic lines. Skips source-reading commands (cat, grep, git diff, etc.). Saves full original output to `~/.cache/tapori-talk/raw/`. Configured via `hooks.json` in the same directory.

4. **Installer** — `src/installer.mjs` + `bin/tapori-talk.mjs`. Copies the plugin directory into `~/.claude/skills/tapori-talk` (user scope) or `.claude/skills/tapori-talk` (project scope). Uses atomic rename with rollback on failure. Tracks ownership via `.tapori-talk-install.json` marker file to avoid overwriting unmanaged directories.

## Key design constraints

- The hook must never compact source-reading commands (`CONTENT_COMMAND` regex in the hook).
- Code, identifiers, commands, paths, exact errors, numbers, warnings, and destructive-action confirmations must never be compressed away.
- The plugin has zero npm dependencies — the installer and hook use only `node:*` built-in modules.
- Node >= 18 required. CI tests on Node 18, 20, 22.

## Testing

Tests use Node's built-in test runner (`node:test` + `node:assert`). Three test files:
- `tests/installer.test.mjs` — install/uninstall/status with temp directories
- `tests/hook.test.mjs` — eligibility checks, compaction logic, recovery file creation
- `tests/structure.test.mjs` — verifies plugin directory structure and required files exist

## Benchmark / evals

- `evals/prompts.jsonl` — paired prompts for A/B comparison (baseline vs. plugin)
- `scripts/benchmark.mjs` — runs each prompt with and without the plugin, records word count and term-check pass rate
- See `docs/MEASUREMENT.md` before publishing any savings claims
