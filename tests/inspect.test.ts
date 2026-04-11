import { describe, it, expect } from "vitest";
import { buildTree, flattenTree, isAlive, inspect } from "../src/inspect.js";

describe("isAlive", () => {
  it("returns true for current process", () => {
    expect(isAlive(process.pid)).toBe(true);
  });

  it("returns false for PID 0 / invalid", () => {
    expect(isAlive(999999999)).toBe(false);
  });
});

describe("buildTree", () => {
  it("returns a ProcessInfo node for current process", () => {
    const tree = buildTree(process.pid);
    expect(tree.pid).toBe(process.pid);
    expect(typeof tree.pid).toBe("number");
  });

  it("does not loop infinitely (visited guard)", () => {
    const visited = new Set<number>([process.pid]);
    const tree = buildTree(process.pid, visited);
    expect(tree.pid).toBe(process.pid);
    // No children because the node was already visited
    expect(tree.children).toBeUndefined();
  });
});

describe("flattenTree", () => {
  it("flattens a simple tree", () => {
    const tree = {
      pid: 1,
      children: [
        { pid: 2, children: [{ pid: 4 }] },
        { pid: 3 },
      ],
    };
    const flat = flattenTree(tree);
    const pids = flat.map((p) => p.pid);
    // Children appear before parents (bottom-up)
    expect(pids.indexOf(4)).toBeLessThan(pids.indexOf(2));
    expect(pids.indexOf(2)).toBeLessThan(pids.indexOf(1));
    expect(pids.indexOf(3)).toBeLessThan(pids.indexOf(1));
    expect(pids).toHaveLength(4);
  });

  it("handles leaf node", () => {
    const flat = flattenTree({ pid: 42 });
    expect(flat).toHaveLength(1);
    expect(flat[0]!.pid).toBe(42);
  });
});

describe("inspect", () => {
  it("throws on invalid PID", () => {
    expect(() => inspect(-1)).toThrow("Invalid PID");
    expect(() => inspect(0)).toThrow("Invalid PID");
    expect(() => inspect(1.5)).toThrow("Invalid PID");
  });

  it("throws on non-existent PID", () => {
    expect(() => inspect(999999999)).toThrow("Process not found");
  });

  it("returns tree for current process", () => {
    const tree = inspect(process.pid);
    expect(tree.pid).toBe(process.pid);
  });
});
