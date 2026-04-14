---
name: killx
description: Project skill for @ekaone/killx (killx CLI) — a zero-dependency, cross-platform process tree killer. Use when changing the CLI, process inspection/tree building, kill strategy/escalation, Windows taskkill/wmic logic, packaging (tsup), tests (vitest), or README/docs for this repo.
---

# `killx` project skill

This repository is `@ekaone/killx`: a **zero-runtime-dependency** Node.js + TypeScript library and CLI for killing a **process tree** cross-platform.

## Project invariants (do not break)

- **Zero runtime deps**: keep the runtime dependency list empty; prefer Node built-ins only.
- **Node target**: Node **>= 18** (`target: node18` in `tsup.config.ts`).
- **ESM package**: `"type": "module"` in `package.json`.
- **Dual library output**: `dist/index.mjs` (ESM) + `dist/index.js` (CJS) + `.d.ts`.
- **CLI output**: `dist/cli.cjs` (CJS) with a shebang in source (`bin/cli.ts`).
- **Cross-platform**: Linux/macOS/Windows supported with platform-specific inspection + kill paths.
- **Safe-by-default**: default signal is `SIGTERM`; force escalation is opt-in.
- **Structured output**: CLI supports `--json` and stable, machine-readable output.

## Repo map (where to change what)

- **CLI UX / flags / help / JSON output**: `bin/cli.ts`
  - Commands: `kill` (default), `tree`, `inspect`
  - Flags: `--dry-run`, `--signal`, `--force`, `--json`, `--version/-v`
- **Public API surface**: `src/index.ts` (exports + types)
- **Kill behavior**: `src/kill.ts`
  - Windows: `taskkill /PID <pid> /T [/F]`
  - Unix: `process.kill` + optional escalation strategy
- **Process tree inspection**: `src/inspect.ts`
  - Linux: `ps -o pid --ppid`
  - macOS: `pgrep -P`
  - Windows: `wmic process where (ParentProcessId=PID) get ProcessId`
- **Types**: `src/types.ts` (`KillOptions`, `KillResult`, `ProcessInfo`, `SignalStep`)
- **Build**: `tsup.config.ts` (library ESM+CJS + CLI CJS)
- **Tests**: `tests/*.test.ts` (vitest)

## When implementing changes

### CLI changes

- Keep parsing **zero-dep** (no `minimist`, `yargs`, etc.).
- Update both:
  - the usage text in `bin/cli.ts` (`printUsageAndExit()`)
  - `README.md` CLI section if flags/commands change
- Preserve exit codes:
  - `--version` and help: exit `0`
  - kill failures: exit `1`
  - `--json` mode should still exit based on `result.success`

### Kill semantics

- **Children-first** killing order must remain (see `flattenTree()` behavior).
- `dryRun` must never kill; it should return a stable "would kill" list.
- `force` on Unix means escalation from provided/default signal → `SIGKILL` after a timeout.
- On Windows, prefer `taskkill` for tree termination; use retry-with-force behavior when not forced initially.

### Inspection semantics

- `inspect(pid)` must throw on invalid PID or missing process.
- Cycle protection: keep `visited` set in `buildTree()` to avoid infinite recursion.
- Keep the "inline platform implementations" approach (avoid dynamic import/require path issues across TS source, vitest, and bundled dist).

## Testing expectations

Prefer tests that validate:

- Argument parsing and output formatting (especially `--json`, `--dry-run`, and subcommands).
- Platform-specific branches (mock `node:os` platform + `execSync` / `process.kill` where needed).
- Kill strategy behavior: step escalation, timeouts, and "already dead" (`ESRCH`) handling.

Common commands:

- `pnpm test` / `pnpm test:watch`
- `pnpm typecheck`
- `pnpm build`

## Packaging / release checklist

When changing public API, CLI behavior, or outputs:

- Update `README.md` examples to match behavior.
- Ensure `pnpm prepublishOnly` would pass (clean → typecheck → test → build).
- Keep the `package.json` `exports` map consistent with built artifacts.

## High-signal sources (CLI + Node best practices)

If you need general CLI UX guidance (errors, signals, stdout/stderr conventions, etc.), use:

- `https://github.com/lirantal/nodejs-cli-apps-best-practices`

