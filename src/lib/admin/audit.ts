import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Records an admin change. Best effort: a failed audit write is logged but
 * does not undo or block the change it describes, which already succeeded.
 */
export async function audit(
  actor: { id: string; email: string },
  action: string,
  target: string,
  detail?: Prisma.InputJsonValue,
): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: { actorId: actor.id, actorEmail: actor.email, action, target, detail },
    });
  } catch (error) {
    console.error("Audit log write failed:", error instanceof Error ? error.message : error);
  }
}
