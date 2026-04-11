import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    splitting: false,
    shims: true,
    sourcemap: true,
    outDir: "dist",
    target: "node18",
  },
  {
    entry: { cli: "bin/cli.ts" },
    format: ["cjs"],
    dts: false,
    clean: false,
    shims: true,
    sourcemap: false,
    banner: { js: "#!/usr/bin/env node" },
    outDir: "dist",
    target: "node18",
  },
]);
