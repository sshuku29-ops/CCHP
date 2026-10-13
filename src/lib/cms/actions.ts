"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { actionModule } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { CONTENT_DEFAULTS } from "./defaults";

const schema = z.object({
  key: z.string().regex(/^[a-z0-9]+(\.[a-zA-Z0-9]+)+$/, "Bad key"),
  value: z.string().max(5000),
});

/** Save an inline edit from the public site. Returns { ok } or { error }. */
export async function saveContent(key: string, value: string) {
  try {
    const user = await actionModule("site");
    const parsed = schema.safeParse({ key, value });
    if (!parsed.success) return { error: "That text could not be saved." };
    const clean = parsed.data.value.trim();
    if (clean === (CONTENT_DEFAULTS[key] ?? "")) {
      // Back to the default: drop the override so defaults.ts stays the source of truth.
      await db.contentBlock.deleteMany({ where: { key } });
    } else {
      await db.contentBlock.upsert({
        where: { key },
        create: { key, value: clean, updatedById: user.id },
        update: { value: clean, updatedById: user.id },
      });
    }
    await audit(user.id, "content.edit", key);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Not allowed." };
  }
}

/** Remove every override (used from the admin page). */
export async function resetAllContent() {
  const user = await actionModule("site");
  await db.contentBlock.deleteMany({});
  await audit(user.id, "content.resetAll");
  revalidatePath("/", "layout");
  return { ok: true };
}
