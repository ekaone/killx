import { execSync } from "node:child_process";
import { platform } from "node:os";
import type {
  KillOptions,
  KillResult,
  ProcessInfo,
  SignalStep,
} from "./types.js";
import { buildTree, flattenTree, isAlive } from "./inspect.js";

// ─── Helpers

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sendSignal(
  pid: number,
  signal: NodeJS.Signals | number,
): "sent" | "gone" | "error" {
  try {
    process.kill(pid, signal as NodeJS.Signals);
    return "sent";
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    // ESRCH = no such process — already dead, treat as success
    if (code === "ESRCH") return "gone";
    return "error";
  }
}

/**
 * Poll until the process is gone or maxWait (ms) elapses.
 * Returns true if process is gone.
 */
async function waitForDeath(
  pid: number,
  maxWait: number,
  interval = 50,
): Promise<boolean> {
  const deadline = Date.now() + maxWait;
  while (Date.now() < deadline) {
    if (!isAlive(pid)) return true;
    await sleep(interval);
  }
  return !isAlive(pid);
}

// ─── Single process kill with optional strategy

async function killWithStrategy(
  pid: number,
  steps: SignalStep[],
): Promise<{ success: boolean; error?: string }> {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    const result = sendSignal(pid, step.signal);

    if (result === "gone") return { success: true };
    if (result === "error") {
      // Unexpected error sending signal — check if gone anyway
      return isAlive(pid)
        ? { success: false, error: `Failed to send signal to PID ${pid}` }
        : { success: true };
    }

    // Signal sent — wait if requested or give a small grace period
    const waitMs = step.wait ?? (i < steps.length - 1 ? 100 : 200);
    const dead = await waitForDeath(pid, waitMs);
    if (dead) return { success: true };

    // Still alive — continue to next signal step
  }

  return isAlive(pid)
    ? {
        success: false,
        error: `Process ${pid} still alive after all signal steps`,
      }
    : { success: true };
}

// ─── Windows path

function taskkillTree(pid: number, force: boolean): boolean {
  try {
    const forceFlag = force ? " /F" : "";
    execSync(`taskkill /PID ${pid} /T${forceFlag}`, {
      stdio: ["pipe", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

async function killWindows(
  pid: number,
  opts: KillOptions,
): Promise<KillResult> {
  const tree = buildTree(pid);
  const flat = flattenTree(tree);

  const toKill: ProcessInfo[] = [];
  const skipped: ProcessInfo[] = [];

  for (const proc of flat) {
    if (opts.filter && !opts.filter(proc)) {
      skipped.push(proc);
    } else {
      toKill.push(proc);
    }
  }

  if (opts.dryRun) {
    return { success: true, killed: [], skipped: toKill, dryRun: true };
  }

  // If all filtered, nothing to kill
  if (toKill.length === 0) {
    return { success: true, killed: [], skipped };
  }

  // Treat SIGKILL as force on Windows
  const force = opts.force || opts.signal === "SIGKILL";
  const ok = taskkillTree(pid, force);
  if (ok) {
    const result: KillResult = { success: true, killed: toKill };
    if (skipped.length > 0) result.skipped = skipped;
    return result;
  }
  const result: KillResult = {
    success: false,
    killed: [],
    failed: [{ pid, error: "taskkill failed" }],
  };
  if (skipped.length > 0) result.skipped = skipped;
  return result;
}

// ─── Unix path

async function killUnix(pid: number, opts: KillOptions): Promise<KillResult> {
  const {
    signal = "SIGTERM",
    dryRun = false,
    force = false,
    strategy,
    filter,
  } = opts;

  const tree = buildTree(pid);
  const flat = flattenTree(tree); // children first, root last

  const toKill: ProcessInfo[] = [];
  const skipped: ProcessInfo[] = [];

  for (const proc of flat) {
    if (filter && !filter(proc)) {
      skipped.push(proc);
    } else {
      toKill.push(proc);
    }
  }

  if (dryRun) {
    const result: KillResult = { success: true, killed: [], dryRun: true };
    result.skipped = toKill; // "would kill" list in dry-run
    return result;
  }

  const steps: SignalStep[] = strategy
    ? strategy
    : force
      ? [{ signal, wait: opts.timeout ?? 3000 }, { signal: "SIGKILL" }]
      : [{ signal }];

  const killed: ProcessInfo[] = [];
  const failed: { pid: number; error: string }[] = [];

  for (const proc of toKill) {
    if (!isAlive(proc.pid)) {
      killed.push(proc);
      continue;
    }
    const res = await killWithStrategy(proc.pid, steps);
    if (res.success) {
      killed.push(proc);
    } else {
      failed.push({ pid: proc.pid, error: res.error ?? "unknown error" });
    }
  }

  const success = failed.length === 0;
  const result: KillResult = { success, killed };
  if (skipped.length > 0) result.skipped = skipped;
  if (failed.length > 0) result.failed = failed;
  return result;
}

// ─── Public API

export async function killx(
  pid: number,
  options: KillOptions = {},
): Promise<KillResult> {
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new Error(`Invalid PID: ${pid}`);
  }
  if (!isAlive(pid)) {
    throw new Error(`Process not found: ${pid}`);
  }

  return platform() === "win32"
    ? killWindows(pid, options)
    : killUnix(pid, options);
}
