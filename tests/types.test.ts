import { describe, it, expect } from "vitest";
import type { KillResult, ProcessInfo, KillOptions } from "../src/types.js";

describe("type shapes (runtime duck-typing)", () => {
  it("ProcessInfo has required pid field", () => {
    const p: ProcessInfo = { pid: 1234 };
    expect(p.pid).toBe(1234);
  });

  it("KillResult structure is correct", () => {
    const r: KillResult = {
      success: true,
      killed: [{ pid: 1 }, { pid: 2 }],
      skipped: [],
      failed: [],
      dryRun: false,
    };
    expect(r.success).toBe(true);
    expect(r.killed).toHaveLength(2);
  });

  it("KillOptions accepts all fields", () => {
    const opts: KillOptions = {
      signal: "SIGTERM",
      dryRun: false,
      force: false,
      timeout: 3000,
      strategy: [
        { signal: "SIGTERM", wait: 2000 },
        { signal: "SIGKILL" },
      ],
      filter: (p) => p.pid > 0,
    };
    expect(opts.strategy).toHaveLength(2);
  });
});
