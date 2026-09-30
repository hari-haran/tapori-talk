# Releasing

## Before the first npm publish

1. Choose the final GitHub repository owner.
2. Add `repository`, `homepage`, and `bugs` fields to `package.json`.
3. Confirm the npm package name is available, or use a scope.
4. Replace `YOUR_GITHUB_USERNAME` in `README.md`.
5. Validate the plugin with the current Claude Code CLI:

```bash
claude plugin validate ./plugins/tapori-talk --strict
```

6. Run:

```bash
npm run check
npm pack
```

7. Test the tarball in a temporary home directory.
8. Publish:

```bash
npm publish --access public
```

## Versioning

Keep these versions aligned:

- `package.json`
- `plugins/tapori-talk/.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`

`npm run check:versions` enforces this.
