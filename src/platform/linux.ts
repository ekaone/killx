import { execSync } from "node:child_process";

/**
 * Returns direct child PIDs of the given PID on Linux via `ps`.
 */
export function getChildPids(pid: number): number[] {
  try {
    const out = execSync(`ps -o pid --no-headers --ppid ${pid}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return out
      .trim()
      .split("\n")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);
  } catch {
    // No children or process not found
    return [];
  }
}

/**
 * Returns the process name on Linux via /proc or ps.
 */
export function getProcessName(pid: number): string | undefined {
  try {
    const out = execSync(`ps -o comm= -p ${pid}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return out.trim() || undefined;
  } catch {
    return undefined;
  }
}
