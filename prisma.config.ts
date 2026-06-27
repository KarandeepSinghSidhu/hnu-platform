// Prisma 7's config loader does NOT auto-load .env files (unlike Prisma <=6),
// so `env("DATABASE_URL")` below only sees real process env. Load the repo's
// env files first (.env.local wins over .env; never overrides real env vars,
// so hosted platforms like Render are unaffected).
import "./prisma/load-env";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});