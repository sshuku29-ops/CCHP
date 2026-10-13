import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/guards";
import { readUpload } from "@/lib/uploads";

/**
 * GET /api/files/[key] — download an assignment attachment.
 * Allowed for the volunteer who submitted it and for admins. Everyone else gets 404
 * (not 403) so file keys cannot be probed.
 */
const SAFE_KEY = /^[A-Za-z0-9._-]+$/;

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain; charset=utf-8",
  md: "text/plain; charset=utf-8",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

export async function GET(_req: Request, ctx: RouteContext<"/api/files/[key]">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { key } = await ctx.params;
  if (!SAFE_KEY.test(key)) return new NextResponse("Not found", { status: 404 });

  const submission = await db.submission.findFirst({
    where: { fileKey: key },
    select: { userId: true, fileName: true },
  });
  if (!submission) return new NextResponse("Not found", { status: 404 });
  if (submission.userId !== user.id && !isAdmin(user)) return new NextResponse("Not found", { status: 404 });

  const data = await readUpload(key);
  if (!data) return new NextResponse("Not found", { status: 404 });

  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  // Keep the download name simple and header-safe.
  const safeName = (submission.fileName ?? key).replace(/[^\w.\- ()]/g, "_").slice(0, 150) || key;
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Content-Length": String(data.byteLength),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
