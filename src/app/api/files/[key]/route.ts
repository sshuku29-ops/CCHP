import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/guards";
import { readUpload, isSafeKey, contentTypeForKey } from "@/lib/uploads";

/**
 * GET /api/files/[key] — serves every stored file after an access check.
 * Resolution order:
 *  1. Public documents (brochures, logos, team photos): anyone.
 *  2. Profile photos and partner logos: anyone (they appear on the public site).
 *  3. Other documents: any signed-in user (admins and volunteers).
 *  4. Assignment attachments: the submitter or an admin.
 * Unknown or forbidden keys return 404 so keys cannot be probed.
 * `?download=1` forces a download instead of inline display.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/files/[key]">) {
  const { key } = await ctx.params;
  if (!isSafeKey(key)) return new NextResponse("Not found", { status: 404 });
  const user = await getCurrentUser();

  let fileName = key;
  let allowed = false;

  const doc = await db.document.findFirst({ where: { fileKey: key }, select: { fileName: true, isPublic: true, category: true } });
  if (doc) {
    fileName = doc.fileName;
    allowed = doc.isPublic || doc.category === "LOGO" || !!user;
  } else if (await db.user.findFirst({ where: { photoKey: key }, select: { id: true } })) {
    allowed = true;
  } else if (await db.communityPartner.findFirst({ where: { logoKey: key }, select: { id: true } })) {
    allowed = true;
  } else {
    const submission = await db.submission.findFirst({ where: { fileKey: key }, select: { userId: true, fileName: true } });
    if (submission) {
      fileName = submission.fileName ?? key;
      allowed = !!user && (submission.userId === user.id || isAdmin(user));
    }
  }
  if (!allowed) return new NextResponse("Not found", { status: 404 });

  const bytes = await readUpload(key);
  if (!bytes) return new NextResponse("Not found", { status: 404 });
  const download = new URL(req.url).searchParams.get("download") === "1";
  const safeName = fileName.replace(/[^\w. -]+/g, "_");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentTypeForKey(key),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
      "Cache-Control": doc?.isPublic ? "public, max-age=3600" : "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
