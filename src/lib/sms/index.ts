import "server-only";

/**
 * Minimal SMS sender. Used ONLY for session reminders, and only for people who
 * ticked "Text me reminders" on their Account page (smsOptIn) and have a phone.
 *
 *   SMS_PROVIDER=console  (default) prints the text to the server log, sends nothing.
 *   SMS_PROVIDER=twilio   sends through the Twilio REST API using
 *                         TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM.
 *
 * To add another provider, add one more `if (provider === "...")` branch here.
 */

/**
 * Turns whatever the person typed ("(555) 123-4567", "555.123.4567",
 * "+1 555 123 4567") into E.164, which Twilio requires. US numbers are
 * assumed when no country code is given. Returns null if it cannot be a number.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) {
    const rest = digits.slice(1).replace(/\D/g, "");
    return rest.length >= 8 && rest.length <= 15 ? `+${rest}` : null;
  }
  const only = digits.replace(/\D/g, "");
  if (only.length === 10) return `+1${only}`;
  if (only.length === 11 && only.startsWith("1")) return `+${only}`;
  return null;
}

export async function sendSms(to: string, text: string): Promise<void> {
  const provider = process.env.SMS_PROVIDER ?? "console";
  const number = normalizePhone(to);
  if (!number) throw new Error(`Cannot text "${to}": not a valid phone number.`);
  // Keep texts short; carriers split anything over 160 characters.
  const body = text.length > 320 ? `${text.slice(0, 317)}...` : text;

  if (provider === "twilio") {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;
    if (!sid || !token || !from) throw new Error("TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM must all be set.");
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: number, From: from, Body: body }).toString(),
    });
    if (!res.ok) throw new Error(`Twilio error ${res.status}: ${await res.text()}`);
    return;
  }

  console.log(`\n[sms:console] To: ${number}\n${body}\n`);
}
