import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["tests/native/**", "tests/browser/**"],
    globals: true,
    restoreMocks: true,
  },
});
