import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Node environment: jsdom would break the Anthropic SDK (browser-like
    // detection) and does not provide CompressionStream.
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
