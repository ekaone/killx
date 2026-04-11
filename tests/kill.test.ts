import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { killx } from "../src/kill.js";
import { isAlive } from "../src/inspect.js";

/**
 * Spawns a long-running child process (sleep) and returns its PID.
 */
function spawnSleepProcess(): Promise<number> {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === "win32";
    const child = isWin
      ? spawn("ping", ["-n", "60", "127.0.0.1"], { stdio: "ignore", detached: false })
      : spawn("sleep", ["60"], { stdio: "ignore", detached: false });

    child.on("error", reject);
    child.on("spawn", () => resolve(child.pid!));
  });
}

describe("killx — invalid input", () => {
  it("throws on negative PID", async () => {
    await expect(killx(-1)).rejects.toThrow("Invalid PID");
  });

  it("throws on zero PID", async () => {
    await expect(killx(0)).rejects.toThrow("Invalid PID");
  });

  it("throws on float PID", async () => {
    await expect(killx(1.5)).rejects.toThrow("Invalid PID");
  });
});

describe("killx — dry-run", () => {
  it("returns dryRun:true without killing", async () => {
    const pid = await spawnSleepProcess();
    try {
      const result = await killx(pid, { dryRun: true });
      expect(result.dryRun).toBe(true);
      expect(result.killed).toHaveLength(0);
      // The process should still be alive
      expect(isAlive(pid)).toBe(true);
    } finally {
      // cleanup
      try { process.kill(pid, "SIGKILL"); } catch {}
    }
  });

  it("dry-run returns skipped processes", async () => {
    const pid = await spawnSleepProcess();
    try {
      const result = await killx(pid, { dryRun: true });
      expect(result.skipped).toBeDefined();
      expect(result.skipped!.length).toBeGreaterThan(0);
      const pids = result.skipped!.map((p) => p.pid);
      expect(pids).toContain(pid);
    } finally {
      try { process.kill(pid, "SIGKILL"); } catch {}
    }
  });
});

describe("killx — actual kill", () => {
  it("kills a process and reports it", async () => {
    const pid = await spawnSleepProcess();
    const result = await killx(pid, { signal: "SIGKILL" });

    expect(result.success).toBe(true);
    expect(result.killed.map((p) => p.pid)).toContain(pid);

    // Give OS a moment
    await new Promise((r) => setTimeout(r, 100));
    expect(isAlive(pid)).toBe(false);
  });

  it("throws when process is already dead", async () => {
    const pid = await spawnSleepProcess();
    process.kill(pid, "SIGKILL");
    await new Promise((r) => setTimeout(r, 150));

    await expect(killx(pid, { signal: "SIGTERM" })).rejects.toThrow("Process not found");
  });
});

describe("killx — filter", () => {
  it("puts filtered-out processes in skipped and does not kill them", async () => {
    const pid = await spawnSleepProcess();
    try {
      // filter returns false → all processes go to skipped, none killed
      const result = await killx(pid, {
        signal: "SIGKILL",
        filter: () => false,
      });
      // All processes were filtered → skipped should be populated
      expect(result.skipped?.length).toBeGreaterThan(0);
      expect(result.killed).toHaveLength(0);
      // Process still alive since we skipped everything
      expect(isAlive(pid)).toBe(true);
    } finally {
      try { process.kill(pid, "SIGKILL"); } catch {}
    }
  });
});
