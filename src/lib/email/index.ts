import "server-only";

/**
 * Minimal transactional email sender. Used ONLY for reminder digests.
 * EMAIL_PROVIDER=console logs to the server console (default in dev).
 * EMAIL_PROVIDER=resend sends through the Resend HTTP API (RESEND_API_KEY).
 * To add SES/SMTP, add another branch here — nothing else needs to change.
 */
export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  const provider = process.env.EMAIL_PROVIDER ?? "console";
  const from = process.env.EMAIL_FROM ?? "CCHP <noreply@example.org>";
  if (provider === "resend") {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not set");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text, html: html ?? undefined }),
    });
    if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
    return;
  }
  console.log(`\n[email:console] To: ${to}\nSubject: ${subject}\n\n${text}\n`);
}
