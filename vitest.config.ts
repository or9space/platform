import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: false,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 20000,
    // Integration suites share one Postgres; parallel workers cross-contaminate
    // via resetDb(). The whole suite runs in ~2s, so serialize files.
    fileParallelism: false,
    // Inline next-auth so Vite transforms it and applies the next/server alias
    // below — externalized, Node can't resolve its nested-pnpm `next/server`.
    server: { deps: { inline: ["next-auth", "@auth/core"] } },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["node_modules/", "tests/", "*.config.*"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // next-auth (beta) is installed in a nested pnpm dir where its internal
      // `import "next/server"` can't resolve the hoisted next. Pin it so any
      // module that pulls the auth chain (e.g. app/page) imports under vitest.
      "next/server": path.resolve(__dirname, "node_modules/next/server.js"),
    },
  },
});
