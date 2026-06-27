// Shared PrismaClient singleton — the single DB entry point for the whole app.
// Cached on globalThis so dev hot-reload reuses one connection instead of
// leaking a new client per reload. Configures the SQLite adapter (Prisma 7
// requirement) and a global omit so heavy StudyPdf blobs never load implicitly.
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const datasourceUrl = process.env.DATABASE_URL;
if (!datasourceUrl) {
  throw new Error("Missing DATABASE_URL");
}

function createPrismaClient() {
  // Prisma 7 with SQLite requires an explicit adapter at runtime.
  const adapter = new PrismaBetterSqlite3({ url: datasourceUrl });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    // Never load the StudyPdf blob unless a query explicitly selects it (the
    // download route does). Keeps it out of every list/render/include query so
    // study pages and admin lists don't drag multi-MB buffers through memory.
    omit: { studyPdf: { data: true } },
  });
}

// `typeof createPrismaClient` preserves the omit-configured client type so the
// cached instance and the export share the same shape.
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  // Reuse the same client during hot reload in development.
  globalForPrisma.prisma = prisma;
}
