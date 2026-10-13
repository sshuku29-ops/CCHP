import { actionModule, AuthError } from "@/lib/auth/guards";
import { csvResponse, toCsv } from "@/lib/csv";
import { certificatesForExport, isTermLabel } from "@/lib/certificates/queries";

/** GET /api/export/certificates?term=Fall%202026 — every issued certificate (all terms when no term given). Admins with the volunteers module. */
export async function GET(req: Request) {
  try {
    await actionModule("volunteers");
  } catch (e) {
    if (e instanceof AuthError) return new Response("Forbidden", { status: e.status });
    throw e;
  }
  const termRaw = new URL(req.url).searchParams.get("term");
  const term = isTermLabel(termRaw) ? termRaw : undefined;
  const rows = await certificatesForExport(term);
  const stamp = new Date().toISOString().slice(0, 10);
  const name = term ? `cchp-certificates-${term.toLowerCase().replace(/\s+/g, "-")}.csv` : `cchp-certificates-${stamp}.csv`;
  return csvResponse(name, toCsv(rows, ["lastName", "firstName", "email", "term", "academicYear", "hours", "sessions", "manual", "issuedAt", "issuedBy", "file", "notes", "id"]));
}
