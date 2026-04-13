/**
 * @file index.ts
 * @description Core entry point for @ekaone/killx.
 * @author Eka Prasetia
 * @website https://prasetia.me
 * @license MIT
 */

export { killx } from "./kill.js";
export { inspect, buildTree, flattenTree, isAlive } from "./inspect.js";
export type {
  ProcessInfo,
  KillOptions,
  KillResult,
  SignalStep,
} from "./types.js";
