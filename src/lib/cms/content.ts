import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/auth/guards";
import { CONTENT_DEFAULTS } from "./defaults";

/** All overrides, loaded once per request. */
export const getAllContent = cache(async () => {
  const rows = await db.contentBlock.findMany();
  return new Map(rows.map((r) => [r.key, r.value]));
});

/** Text for a key: the admin override if any, else the default from defaults.ts. */
export async function getContent(key: string): Promise<string> {
  const map = await getAllContent();
  return map.get(key) ?? CONTENT_DEFAULTS[key] ?? "";
}

/** True when the signed-in user may edit public-site text (module "site"). */
export const canEditContent = cache(async () => {
  const user = await getCurrentUser();
  return !!user && canAccessModule(user, "site");
});
