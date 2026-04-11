export type ProcessInfo = {
  pid: number;
  ppid?: number;
  name?: string;
  children?: ProcessInfo[];
};

export type SignalStep = {
  signal: NodeJS.Signals | number;
  wait?: number;
};

export type KillOptions = {
  /** Signal to send (default: SIGTERM) */
  signal?: NodeJS.Signals | number;
  /** Preview mode — do not actually kill */
  dryRun?: boolean;
  /** Force kill with SIGKILL as final fallback */
  force?: boolean;
  /** Timeout (ms) before force-killing, used with force flag */
  timeout?: number;
  /**
   * Multi-step escalation strategy.
   * Each step sends a signal, waits, then proceeds to next if still alive.
   */
  strategy?: SignalStep[];
  /** Optional filter — return false to skip a process */
  filter?: (proc: ProcessInfo) => boolean;
};

export type KillResult = {
  success: boolean;
  killed: ProcessInfo[];
  skipped?: ProcessInfo[];
  failed?: { pid: number; error: string }[];
  dryRun?: boolean;
};
