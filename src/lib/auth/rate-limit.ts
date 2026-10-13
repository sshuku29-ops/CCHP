import "server-only";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Fixed-window rate limiter backed by the database so it works on serverless
 * hosts with many instances. Returns { ok:false } when the limit is exceeded.
 */
export async function rateLimit(opts: { key: string; limit: number; windowSeconds: number }) {
  const now = new Date();
  const row = await db.rateLimit.findUnique({ where: { key: opts.key } });
  if (!row || row.resetAt < now) {
    await db.rateLimit.upsert({
      where: { key: opts.key },
      create: { key: opts.key, count: 1, resetAt: new Date(now.getTime() + opts.windowSeconds * 1000) },
      update: { count: 1, resetAt: new Date(now.getTime() + opts.windowSeconds * 1000) },
    });
    return { ok: true, remaining: opts.limit - 1 };
  }
  if (row.count >= opts.limit) {
    return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000) };
  }
  await db.rateLimit.update({ where: { key: opts.key }, data: { count: { increment: 1 } } });
  return { ok: true, remaining: opts.limit - row.count - 1 };
}

/** Hashed client IP (we never store raw IPs). */
export async function clientIpKey() {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}
