import "server-only";
import { db } from "@/lib/db";

export async function notify(
  userIds: string | string[],
  data: { type?: string; title: string; body?: string; href?: string },
) {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  if (ids.length === 0) return;
  await db.notification.createMany({
    data: ids.map((userId) => ({
      userId,
      type: data.type ?? "INFO",
      title: data.title,
      body: data.body ?? null,
      href: data.href ?? null,
    })),
  });
}
