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

      /**
       * The floor is scoped to the pure analysis and parsing modules. These
       * are where a silent error becomes a wrong trading signal, and they are
       * testable without network or database.
       *
       * The excluded modules are I/O wiring: they compose the covered logic
       * against Postgres and the Sectors API. Chasing a line-coverage number
       * there would mean asserting against mocks of our own mocks, which
       * proves the mock works rather than the system does. They are verified
       * by running the application instead.
       */
      include: [
        "src/lib/shadow/**/*.ts",
        "src/lib/smartmoney/**/*.ts",
        "src/lib/analysis/reality-check.ts",
        "src/lib/analysis/corporate-actions.ts",
        "src/lib/analysis/seasonality.ts",
        "src/lib/notifications/rules.ts",
        "src/lib/notifications/email.ts",
        "src/lib/sectors/schemas.ts",
        "src/lib/sectors/cache.ts",
        "src/lib/sectors/credits.ts",
        "src/lib/sectors/client.ts",
        "src/lib/sectors/endpoints.ts",
      ],
      exclude: ["**/*.test.ts", "**/types.ts"],
      thresholds: { lines: 85, functions: 85, branches: 75, statements: 85 },
    },
  },
});
