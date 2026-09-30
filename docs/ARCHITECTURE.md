# Architecture

## Goal

Let a user communicate in natural tapori-talk or Hinglish while Claude returns compact, technically complete output.

## Layers

### 1. Input interpretation

`plugins/tapori-talk/skills/tapori-talk/SKILL.md` maps dialect cues to task intent. It does not translate the user's sentence before working; it treats the dialect as the command interface.

### 2. Output policy

`plugins/tapori-talk/output-styles/tapori-talk.md` applies concise technical English to every response by default. It keeps Claude Code's built-in engineering instructions enabled.

### 3. Tool-output compaction

The PostToolUse hook receives Bash tool events. It rewrites only large output from known noisy commands. It preserves:

- first and last lines
- diagnostic lines and nearby context
- summaries
- exact original response in a local recovery file

It does not compact source-reading commands.

### 4. Distribution

The repository is both:

- an npm package with a zero-dependency installer
- a Claude marketplace with a plugin under `plugins/tapori-talk`

The npm installer copies the plugin into a stable skills directory. Native marketplace installation remains available for GitHub-hosted updates.
