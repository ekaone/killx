import { platform } from "node:os";
import { execSync } from "node:child_process";
import type { ProcessInfo } from "./types.js";

type PlatformModule = {
  getChildPids: (pid: number) => number[];
  getProcessName: (pid: number) => string | undefined;
};

// Inline platform implementations — avoids dynamic require path issues
// across bundler, vitest (TS source), and CJS/ESM dist targets.

const linuxImpl: PlatformModule = {
  getChildPids(pid) {
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
      return [];
    }
  },
  getProcessName(pid) {
    try {
      const out = execSync(`ps -o comm= -p ${pid}`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      return out.trim() || undefined;
    } catch {
      return undefined;
    }
  },
};

const darwinImpl: PlatformModule = {
  getChildPids(pid) {
    try {
      const out = execSync(`pgrep -P ${pid}`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      return out
        .trim()
        .split("\n")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n > 0);
    } catch {
      return [];
    }
  },
  getProcessName(pid) {
    try {
      const out = execSync(`ps -o comm= -p ${pid}`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      return out.trim() || undefined;
    } catch {
      return undefined;
    }
  },
};

const win32Impl: PlatformModule = {
  getChildPids(pid) {
    try {
      const out = execSync(
        `wmic process where (ParentProcessId=${pid}) get ProcessId`,
        { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
      );
      return out
        .split("\n")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n > 0 && n !== pid);
    } catch {
      return [];
    }
  },
  getProcessName(pid) {
    try {
      const out = execSync(
        `wmic process where (ProcessId=${pid}) get Name /format:value`,
        { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
      );
      const match = out.match(/Name=(.+)/i);
      return match?.[1]?.trim() || undefined;
    } catch {
      return undefined;
    }
  },
};

function loadPlatform(): PlatformModule {
  const plat = platform();
  if (plat === "win32") return win32Impl;
  if (plat === "darwin") return darwinImpl;
  return linuxImpl;
}

/**
 * Checks if a process is alive by sending signal 0.
 */
export function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Recursively builds the process tree rooted at `pid`.
 * Tracks visited PIDs to prevent cycles.
 */
export function buildTree(
  pid: number,
  visited: Set<number> = new Set(),
): ProcessInfo {
  if (visited.has(pid)) {
    return { pid };
  }
  visited.add(pid);

  const plat = loadPlatform();
  const name = plat.getProcessName(pid);
  const childPids = plat.getChildPids(pid);

  const children: ProcessInfo[] = childPids
    .filter((childPid) => !visited.has(childPid))
    .map((childPid) => buildTree(childPid, visited));

  const node: ProcessInfo = { pid };
  if (name) node.name = name;
  if (children.length > 0) node.children = children;

  return node;
}

/**
 * Flattens a ProcessInfo tree into a list (bottom-up, children first).
 * Bottom-up ordering ensures children are killed before parents.
 */
export function flattenTree(
  tree: ProcessInfo,
  result: ProcessInfo[] = [],
): ProcessInfo[] {
  if (tree.children) {
    for (const child of tree.children) {
      flattenTree(child, result);
    }
  }
  result.push(tree);
  return result;
}

/**
 * Public API: inspect the process tree at a given PID.
 */
export function inspect(pid: number): ProcessInfo {
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new Error(`Invalid PID: ${pid}`);
  }
  if (!isAlive(pid)) {
    throw new Error(`Process not found: ${pid}`);
  }
  return buildTree(pid);
}
