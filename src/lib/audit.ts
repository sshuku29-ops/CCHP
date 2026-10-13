import "server-only";
import { db } from "@/lib/db";

export async function audit(actorId: string | null, action: string, target?: string, meta?: unknown) {
  try {
    await db.auditLog.create({
      data: { actorId, action, target: target ?? null, meta: meta ? JSON.stringify(meta) : null },
    });
  } catch {
    // Auditing must never break the main action.
  }
}
