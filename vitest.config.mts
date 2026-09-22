import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // The engine is the part where a silent error becomes a wrong trading
      // signal, so it carries a hard coverage floor.
      include: ["src/lib/**/*.ts"],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
  },
});
