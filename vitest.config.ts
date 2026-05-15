import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/backend/src/**/*.test.ts"],
    env: {
      TABLE_NAME: "test-table",
      DATABASE_URL: "postgres://user:pass@localhost:5432/db",
      RP_ID: process.env.RP_ID,
      RP_NAME: process.env.RP_NAME,
      JWT_SECRET: "test-secret",
    },
  },
});
