import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "schema/index": "src/schema/index.ts",
    "markdown/index": "src/markdown/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: false,
  clean: true,
  minify: true,
  treeshake: true,
  external: ["zod"],
});
