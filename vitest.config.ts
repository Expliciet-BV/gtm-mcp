import { defineConfig } from "vitest/config";

// Unit tests only. AuthSession and writeGuard are deliberately free of
// Workers-runtime globals (they use fetch, which Node provides), so the
// default node environment is enough and we avoid pulling in
// @cloudflare/vitest-pool-workers for two modules.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
