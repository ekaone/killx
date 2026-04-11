import { execSync } from "node:child_process";

/**
 * Returns direct child PIDs on Windows via WMIC.
 */
export function getChildPids(pid: number): number[] {
  try {
    const out = execSync(
      `wmic process where (ParentProcessId=${pid}) get ProcessId`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );
    return out
      .split("\n")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0 && n !== pid);
  } catch {
    return [];
  }
}

/**
 * Returns the process name on Windows via WMIC.
 */
export function getProcessName(pid: number): string | undefined {
  try {
    const out = execSync(
      `wmic process where (ProcessId=${pid}) get Name /format:value`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );
    const match = out.match(/Name=(.+)/i);
    return match?.[1]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * On Windows, taskkill /T handles the full tree natively.
 * Returns true if successful.
 */
export function taskkillTree(pid: number, force: boolean): boolean {
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
