import { defineConfig } from "drizzle-kit";

// Usar banco local
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("Database URL required");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});
