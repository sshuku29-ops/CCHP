import "server-only";
import { db } from "@/lib/db";

/** Admin inbox: every feedback item, optionally filtered by status. */
export async function listFeedback(status?: string) {
  return db.feedbackItem.findMany({
    where: status && status !== "ALL" ? { status } : undefined,
    include: { author: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * A volunteer's own submissions. Anonymous items are deliberately excluded:
 * once something is sent anonymously we never tie it back to a person, even
 * for the person who wrote it.
 */
export async function listMyFeedback(userId: string) {
  return db.feedbackItem.findMany({
    where: { authorId: userId, anonymous: false },
    select: { id: true, category: true, body: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}
