#!/usr/bin/env node
import { killx } from "../src/kill.js";
import { inspect, flattenTree } from "../src/inspect.js";
import type { KillOptions, ProcessInfo } from "../src/types.js";

// ─── Arg parsing (zero-dep, no minimist) ─────────────────────────────────────

type ParsedArgs = {
  command: "kill" | "tree" | "inspect";
  pid: number;
  dryRun: boolean;
  signal: NodeJS.Signals;
  force: boolean;
  json: boolean;
};

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2); // strip node + script

  let command: ParsedArgs["command"] = "kill";
  let rawPid: string | undefined;
  let dryRun = false;
  let signal: NodeJS.Signals = "SIGTERM";
  let force = false;
  let json = false;

  let i = 0;
  while (i < args.length) {
    const arg = args[i]!;

    if (arg === "tree" || arg === "inspect") {
      command = arg;
      i++;
      rawPid = args[i];
      i++;
      continue;
    }

    if (arg === "--dry-run") { dryRun = true; i++; continue; }
    if (arg === "--force")   { force = true;  i++; continue; }
    if (arg === "--json")    { json = true;   i++; continue; }

    if (arg === "--signal") {
      i++;
      signal = (args[i] ?? "SIGTERM") as NodeJS.Signals;
      i++;
      continue;
    }

    if (arg.startsWith("--signal=")) {
      signal = arg.split("=")[1] as NodeJS.Signals;
      i++;
      continue;
    }

    // positional — treat as pid for kill command
    if (!rawPid && /^\d+$/.test(arg)) {
      rawPid = arg;
    }

    i++;
  }

  if (!rawPid) {
    printUsageAndExit();
  }

  const pid = parseInt(rawPid!, 10);
  if (isNaN(pid) || pid <= 0) {
    die(`Invalid PID: ${rawPid}`);
  }

  return { command, pid, dryRun, signal, force, json };
}

// ─── Output helpers ───────────────────────────────────────────────────────────

function printUsageAndExit(): never {
  console.log(`
killx — zero-dependency process tree killer

Usage:
  killx <pid>                     Kill process and all children
  killx <pid> --dry-run           Preview without killing
  killx <pid> --signal SIGKILL    Send specific signal
  killx <pid> --force             Escalate to SIGKILL if needed
  killx <pid> --json              JSON output
  killx tree <pid>                Print process tree
  killx inspect <pid> --json      Return tree as JSON

Flags:
  --dry-run     Preview only, do not kill
  --signal      Signal to send (default: SIGTERM)
  --force       Force kill with SIGKILL fallback
  --json        Output as JSON
`);
  process.exit(0);
}

function die(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

function renderTree(node: ProcessInfo, prefix = "", isLast = true): void {
  const connector = isLast ? "└── " : "├── ";
  const label = node.name ? `${node.pid} (${node.name})` : `${node.pid}`;
  console.log(`${prefix}${prefix ? connector : ""}${label}`);

  const children = node.children ?? [];
  const childPrefix = prefix + (isLast ? "    " : "│   ");
  children.forEach((child, idx) => {
    renderTree(child, childPrefix, idx === children.length - 1);
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { command, pid, dryRun, signal, force, json } = parseArgs(process.argv);

  // ── tree / inspect ──
  if (command === "tree" || command === "inspect") {
    let tree: ProcessInfo;
    try {
      tree = inspect(pid);
    } catch (err: unknown) {
      die(err instanceof Error ? err.message : String(err));
    }

    if (json) {
      console.log(JSON.stringify(tree, null, 2));
    } else {
      console.log(`Process tree for PID ${pid}:`);
      renderTree(tree!);
    }
    return;
  }

  // ── kill ──
  const opts: KillOptions = { signal, dryRun, force };

  let result;
  try {
    result = await killx(pid, opts);
  } catch (err: unknown) {
    die(err instanceof Error ? err.message : String(err));
  }

  if (json) {
    if (result!.dryRun) {
      console.log(
        JSON.stringify(
          {
            dryRun: true,
            willKill: (result!.skipped ?? []).map((p) => ({ pid: p.pid, name: p.name })),
          },
          null,
          2
        )
      );
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
    process.exit(result!.success ? 0 : 1);
    return;
  }

  // Human output
  if (dryRun) {
    const list = result!.skipped ?? [];
    console.log(`Dry run — would kill ${list.length} process(es):`);
    list.forEach((p) => {
      const label = p.name ? `${p.pid} (${p.name})` : String(p.pid);
      console.log(`  - ${label}`);
    });
    return;
  }

  if (result!.killed.length > 0) {
    console.log("Killed:");
    result!.killed.forEach((p) => {
      const label = p.name ? `${p.pid} (${p.name})` : String(p.pid);
      console.log(`  - ${label}`);
    });
  }

  if (result!.failed && result!.failed.length > 0) {
    console.error("Failed:");
    result!.failed.forEach((f) => {
      console.error(`  - ${f.pid}: ${f.error}`);
    });
  }

  if (!result!.success) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
