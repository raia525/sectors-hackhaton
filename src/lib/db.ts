import "server-only";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton.
 *
 * Next.js clears module state on hot reload in development, which would open a
 * new connection pool on every edit and exhaust the database's connection
 * limit. Parking the instance on globalThis avoids that.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
