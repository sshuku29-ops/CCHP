import { actionAdmin, AuthError } from "@/lib/auth/guards";
import { listFeedback } from "@/lib/feedback/queries";
import { toCsv, csvResponse } from "@/lib/csv";

/** GET /api/export/feedback — CSV of the whole feedback inbox (admins only). */
export async function GET() {
  try {
    await actionAdmin();
  } catch (e) {
    if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
  const items = await listFeedback("ALL");
  const rows = items.map((i) => ({
    createdAt: i.createdAt,
    from: i.anonymous || !i.author ? "Anonymous" : `${i.author.firstName} ${i.author.lastName}`,
    category: i.category,
    status: i.status,
    body: i.body,
    adminNotes: i.adminNotes ?? "",
  }));
  return csvResponse("feedback.csv", toCsv(rows));
}
