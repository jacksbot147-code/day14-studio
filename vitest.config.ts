import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // tsconfig sets "jsx": "preserve" for Next's own compiler, which leaves
  // vitest's esbuild on the CLASSIC transform — it emits React.createElement
  // and every component render dies with "React is not defined". Nothing here
  // rendered JSX until the /dashboard/marque render test, so this had never
  // surfaced. `automatic` uses the jsx-runtime import instead, which is what
  // Next ships in production anyway.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 10_000,
  },
});
