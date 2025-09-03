import { defineConfig } from "drizzle-kit";

// Usar novo Supabase via Pooler
const SUPABASE_POOLER = 'postgresql://postgres.upxximikhoshaxbmshee:Faneco235***@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';
const dbUrl = SUPABASE_POOLER;

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
