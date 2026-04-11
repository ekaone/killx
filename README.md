# > Under Development, not release yet, currently Test Files: 3 passed & Tests: 20 passed

# @ekaone/killx

> Zero-dependency cross-platform process tree killer with dry-run, structured output, and modern Promise API.

[![npm](https://img.shields.io/npm/v/@ekaone/killx)](https://www.npmjs.com/package/@ekaone/killx)
[![license](https://img.shields.io/npm/l/@ekaone/killx)](./LICENSE)

---

## Features

- 🔪 Kill a process and **all its children** recursively
- 🧪 **Dry-run mode** — preview without killing
- 🌳 **Inspect** the full process tree
- ⚡ **Signal strategy** — escalate from SIGTERM → SIGKILL
- 📦 **Zero runtime dependencies**
- 🖥️ Works on **Linux, macOS, Windows**
- 🔧 **Promise-based API** + **CLI**
- 📄 **Structured JSON output**

---

## Install

```bash
# As a dependency
pnpm add @ekaone/killx

# Global CLI
pnpm add -g @ekaone/killx
```

---

## CLI Usage

```bash
# Kill process + all children
killx 1234

# Preview without killing
killx 1234 --dry-run

# Send specific signal
killx 1234 --signal SIGKILL

# Force kill (SIGTERM → SIGKILL escalation)
killx 1234 --force

# JSON output
killx 1234 --json

# Inspect process tree
killx tree 1234
killx inspect 1234 --json
```

### Example Output

```
Killed:
  - 1235 (node)
  - 1234 (npm)
```

```json
{
  "success": true,
  "killed": [
    { "pid": 1235, "name": "node" },
    { "pid": 1234, "name": "npm" }
  ]
}
```

---

## Programmatic API

### `killx(pid, options?)`

```ts
import { killx } from "@ekaone/killx";

// Simple kill
const result = await killx(1234);

// Dry run
const preview = await killx(1234, { dryRun: true });

// Force with escalation
const forced = await killx(1234, { force: true, timeout: 3000 });

// Custom strategy
const strategic = await killx(1234, {
  strategy: [
    { signal: "SIGTERM", wait: 2000 },
    { signal: "SIGKILL" },
  ],
});

// Filter specific processes
const filtered = await killx(1234, {
  filter: (proc) => proc.pid !== 9999,
});
```

#### `KillOptions`

| Option     | Type                     | Default     | Description                              |
|------------|--------------------------|-------------|------------------------------------------|
| `signal`   | `NodeJS.Signals\|number` | `"SIGTERM"` | Signal to send                           |
| `dryRun`   | `boolean`                | `false`     | Preview only, do not kill                |
| `force`    | `boolean`                | `false`     | Escalate to SIGKILL after timeout        |
| `timeout`  | `number`                 | `3000`      | ms to wait before SIGKILL (with `force`) |
| `strategy` | `SignalStep[]`           | —           | Multi-step escalation override           |
| `filter`   | `(proc) => boolean`      | —           | Skip processes returning false           |

#### `KillResult`

```ts
type KillResult = {
  success: boolean;
  killed: ProcessInfo[];
  skipped?: ProcessInfo[];
  failed?: { pid: number; error: string }[];
  dryRun?: boolean;
};
```

---

### `inspect(pid)`

Returns the full process tree.

```ts
import { inspect } from "@ekaone/killx";

const tree = inspect(1234);
// {
//   pid: 1234,
//   name: "node",
//   children: [
//     { pid: 1235, name: "worker" }
//   ]
// }
```

---

## Design Principles

- **Safe by default** — SIGTERM first, opt-in to SIGKILL
- **Dry-run first** — always preview before kill
- **JSON-first** — structured output for piping
- **No hidden side effects** — what you call is what happens
- **Minimal** — no framework, no deps, just Node.js primitives

---

## License

MIT © [Eka Prasetia](https://prasetia.me/)

## Links

- [npm Package](https://www.npmjs.com/package/@ekaone/killx)
- [GitHub Repository](https://github.com/ekaone/killx)
- [Issue Tracker](https://github.com/ekaone/killx/issues)

---

⭐ If this library helps you, please consider giving it a star on GitHub!
