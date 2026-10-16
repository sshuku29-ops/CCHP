import { PrismaClient } from "@prisma/client";

// Reuse one Prisma client across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// ---- Production on Turso (libsql) ----
// If you deploy to Vercel with Turso, replace the `new PrismaClient({...})`
// below with the driver-adapter version (see docs/ADMIN_GUIDE.md §4):
//
//   import { PrismaLibSQL } from "@prisma/adapter-libsql";
//   import { createClient } from "@libsql/client";
//   const libsql = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN });
//   new PrismaClient({ adapter: new PrismaLibSQL(libsql) })
//
// Nothing else in the app needs to change.

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
