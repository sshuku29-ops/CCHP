import { timingSafeEqual } from "node:crypto";
import { runReminders } from "@/lib/reminders/run";

/**
 * GET or POST /api/cron/reminders
 *
 * Runs the daily reminder job. Protected by CRON_SECRET:
 *   Authorization: Bearer <CRON_SECRET>      (Vercel cron sends this automatically)
 *   or ?secret=<CRON_SECRET>                 (for simple hosts / curl)
 * See docs/REMINDERS.md for scheduling.
 */

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : new URL(req.url).searchParams.get("secret") ?? "";
  // Constant-time comparison so the secret cannot be guessed byte by byte.
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(req: Request) {
  if (!process.env.CRON_SECRET) {
    return Response.json({ ok: false, error: "CRON_SECRET is not configured on the server." }, { status: 500 });
  }
  if (!isAuthorized(req)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const counts = await runReminders();
    return Response.json({ ok: true, ranAt: new Date().toISOString(), ...counts });
  } catch (err) {
    console.error("[cron/reminders] failed:", err);
    return Response.json({ ok: false, error: "Reminder job failed. Check server logs." }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
