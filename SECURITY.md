# Security

## Hook behavior

The Bash PostToolUse hook receives the tool event from Claude Code, compacts eligible stdout locally, and writes the full original event under `~/.cache/tapori-talk/raw/` by default. It makes no network request.

The recovery files may contain source code, paths, secrets printed by commands, or other sensitive output. Protect the cache with normal user-account permissions and delete it according to your retention needs.

Disable the hook with:

```bash
export tapori-talk_BOLTI_HOOK=0
```

Or install without it:

```bash
npx -y tapori-talk --minimal
```

## Reporting

Do not include secrets, proprietary source, or raw cached tool output in a public issue. Report vulnerabilities privately to the repository maintainer after the repository has a security contact configured.
