// Side-effect env loader for standalone tsx scripts. Imported first (before any
// module that reads process.env at import time, e.g. the Prisma client). Mirrors
// Next's precedence: .env.local (real secrets like TRANSLATE_API_KEY) wins over
// .env. dotenv does not override already-set vars, so load .local first.
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });
