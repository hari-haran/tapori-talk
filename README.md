# Tapori Talk

**Speak naturally. Get the smallest technically complete answer.**

Tapori Talk is a coding-assistant customization that understands Mumbai-style Hinglish and returns concise, technically precise English. It works with Claude Code and GitHub Copilot, and its Claude Code hook also removes noisy tool-output narration while preserving code, commands, paths, errors, warnings, and validation evidence.

```text
You:    abe mock toh kiya na phir test fail kyu
Claude: Mock registered after import. Hoist it before the module loads.
```

tapori-talk is the interface, not the compression algorithm. Savings are expected to come from shorter responses, less narration, fewer avoidable follow-up turns, and conservative reduction of noisy tool output. The project does not claim that romanized Hindi inherently tokenizes better than English.

## Install

### From GitHub before npm publication

```bash
npx -y github:shantcoder/tapori-talk
```

### From npm after publication

```bash
npx -y tapori-talk
```

The default installation copies the plugin to:

```text
~/.claude/skills/tapori-talk
```

Claude Code auto-loads plugins from that directory in future sessions.

### Options

```bash
npx -y tapori-talk install --scope project
npx -y tapori-talk install --minimal
npx -y tapori-talk install --on-demand
npx -y tapori-talk status
npx -y tapori-talk doctor
npx -y tapori-talk uninstall
```

- `--scope user`: install for all projects on this machine. Default.
- `--scope project`: copy into the current repository under `.claude/skills/`.
- `--minimal`: omit the Bash-output compression hook.
- `--on-demand`: install the output style without forcing it for every response.
- `--dry-run`: show the target without writing files.
- `--force`: overwrite an unmanaged target directory.

Restart Claude Code or run `/reload-plugins` after installation.

## Native Claude marketplace install

The repository is also a valid Claude marketplace. After it is on GitHub:

```bash
claude plugin marketplace add shantcoder/tapori-talk
claude plugin install tapori-talk@tapori-talk
```

## GitHub Copilot

This repository includes `.github/copilot-instructions.md`. GitHub Copilot automatically reads it when the repository is open in VS Code, GitHub.com, or another supported environment. It provides the Tapori Talk input interpretation and concise-response rules without requiring a separate installation.

The tool-output compression hook is Claude Code-specific; Copilot still receives the input and response behavior from the instructions file.

## What ships

- **tapori-talk intent skill**: understands informal Hinglish, abbreviations, fragments, and profanity without making the user translate into formal English.
- **Compact output style**: leads with results and removes preambles, repeated context, narration, and closing filler while retaining Claude Code's engineering instructions.
- **Local tool-output hook**: compacts large test, build, lint, typecheck, and install output before Claude reads it. Exact original output is stored under `~/.cache/tapori-talk/raw/`.
- **Benchmark harness**: runs paired baseline and plugin prompts and records response length plus any token or cost fields returned by Claude Code.

## Hook controls

```bash
export tapori-talk_BOLTI_HOOK=0
export tapori-talk_BOLTI_MIN_CHARS=10000
export tapori-talk_BOLTI_MIN_LINES=200
export tapori-talk_BOLTI_HEAD_LINES=18
export tapori-talk_BOLTI_TAIL_LINES=28
export tapori-talk_BOLTI_CACHE=/custom/path
```

The hook skips commands used to inspect source or data, including `cat`, `sed`, `grep`, `rg`, `git diff`, and `git show`. It targets noisy test, build, lint, typecheck, and package-manager commands.

## Development

```bash
npm install
npm run check
node bin/tapori-talk.mjs install --scope project --force
claude --plugin-dir ./plugins/tapori-talk
```

Run the A/B harness with an authenticated Claude CLI:

```bash
npm run benchmark -- --runs 3 --out benchmark-results/pilot.json
```

See [docs/MEASUREMENT.md](docs/MEASUREMENT.md) before publishing any savings claim.

## Product principles

1. Natural dialect input is an accessibility and usability feature.
2. Compact output is the primary token optimization.
3. Code, identifiers, commands, paths, exact errors, numbers, warnings, and evidence are never compressed away.
4. A shorter answer is not successful if it causes another clarification turn.
5. Measure cost per successful task, not tokens in isolation.

## Status

This is an experimental `0.1.0` foundation. The installer and hook are tested locally, but the plugin should be validated with the target Claude Code version before a public release.

## License

MIT
