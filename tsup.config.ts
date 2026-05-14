import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts", "src/wiki-compiler.ts", "src/index.ts"],
  format: ["esm"],
  target: "node24",
  outDir: "dist",
  clean: true,
  splitting: false,
  sourcemap: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
