# Deploying CCHP on Vercel + Supabase (cheapest safe setup)

Both have free tiers that cover a program this size. YC Startup School credits (see `docs/FREE_CREDITS.md`)
add headroom. Total expected cost: **$0/month** until usage grows well beyond ~50 users.

## 0. What goes where

| Piece | Service | Tier |
| --- | --- | --- |
| Web app + API + cron | Vercel (Hobby, or Pro with credits) | free |
| Postgres database | Supabase (Free: 500 MB DB, 1 GB storage) | free, credits available |
| File storage (photos, PDFs, certificates) | Supabase Storage, **private** bucket | included |
| Email digests | Resend (3,000 emails/month free) or AWS SES via credits | free |
| SMS (optional, opt-in) | Twilio or AWS SNS via credits | pay per text (~$0.008) |

## 1. Supabase project

1. Create a project (region: US East). Save the database password in a password manager, nowhere else.
2. **Project Settings → Database → Connection string.** Copy two URLs:
   - *Transaction pooler* (port 6543). Append `?pgbouncer=true&connection_limit=1`. This is `DATABASE_URL` for the app.
   - *Direct / Session* (port 5432). This is `DIRECT_URL`, used only by migrations.
3. **Storage → New bucket** named `cchp-files`, **Private**. Never make it public; the app serves files through `/api/files/[key]` after checking who is asking.
4. **Project Settings → API**: copy the project URL and the **service_role** key. The service key is a server secret; it must only ever live in Vercel environment variables, never in the browser or git.
5. Turn on **Point-in-time recovery** if available on your plan, otherwise rely on daily backups (Free tier keeps 7 days) and run `pg_dump` monthly (§6).
6. Security settings: in *Authentication* disable sign-ups (we do not use Supabase Auth). In *Database → Network restrictions* you can restrict to Vercel's IP ranges later; not required because the connection uses a strong password over TLS.

## 2. Prisma setup for Supabase

`prisma/schema.prisma` already uses `provider = "postgresql"`. Add the direct URL for migrations:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Locally, `DIRECT_URL` can equal `DATABASE_URL` (the embedded Postgres has no pooler).

Run the migrations against Supabase once from your laptop:

```bash
DATABASE_URL="<pooler url>" DIRECT_URL="<direct url>" npm run db:migrate
DATABASE_URL="<pooler url>" DIRECT_URL="<direct url>" ADMIN_USERNAME="..." ADMIN_PASSWORD="..." npm run db:seed
```

Then import the real data the same way: `npm run import:drive` (needs the impact JSON; or skip and start fresh), and
`FILES_DIR=... LOGOS_DIR=... npx tsx scripts/import-drive-files.ts` with `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`
set so files land in the bucket.

## 3. Vercel project

1. Push the repo to a **private** GitHub repo. Enable *Secret scanning* and *Dependabot*.
2. Import in Vercel. Framework: Next.js. Build command: `npm run build`. Install command: `npm ci`.
3. Environment variables (Production + Preview):

| Name | Value |
| --- | --- |
| `DATABASE_URL` | Supabase transaction pooler URL (+ `?pgbouncer=true&connection_limit=1`) |
| `DIRECT_URL` | Supabase direct URL |
| `SUPABASE_URL` | https://xxxx.supabase.co |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key |
| `SUPABASE_STORAGE_BUCKET` | `cchp-files` |
| `APP_URL` | https://your-domain |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `EMAIL_PROVIDER` | `resend` |
| `RESEND_API_KEY`, `EMAIL_FROM` | from Resend, verified domain |
| `MAX_UPLOAD_MB` | `10` |
| (optional) `SMS_PROVIDER`, `TWILIO_*` | only if you turn on SMS |

   Do **not** set `ADMIN_USERNAME`/`ADMIN_PASSWORD` on Vercel; seeding is done once from a laptop.
4. Add `vercel.json` cron (already documented in `docs/REMINDERS.md`): daily `/api/cron/reminders`.
5. Domain: add your domain in Vercel; HTTPS is automatic. Keep `www` redirecting to the apex.
6. Deployment protection: leave Preview deployments password-protected (Vercel setting) so unfinished work is never public.

## 4. Email that does not land in spam

1. Use a domain you control (e.g. `cchp.org` or a subdomain of a club domain). Colby mail (`@colby.edu`) cannot be sent through Resend.
2. In Resend: add the domain, then create the DNS records it gives you: **SPF** (TXT), **DKIM** (CNAME ×3), and **DMARC** (`v=DMARC1; p=quarantine; rua=mailto:...`). Wait for "Verified".
3. Send from a real-looking address (`team@yourdomain`), with a plain-text part (the app already sends text + HTML), and keep volume low and consistent. Include "You receive this because you have a CCHP account" in the footer (already in the digest).
4. Warm up: first week send only to the board.
5. Never send marketing. Transactional reminders only, which is what the app does.

## 5. SMS without being flagged

US carriers require registration for application-to-person texting. Cheapest compliant path: Twilio with a
**toll-free number** verified for your program (free verification, ~2 weeks), or AWS SNS with an origination
number. Only text people who opted in (the app enforces `smsOptIn`), keep texts short, identify the sender
("CCHP:"), include "Reply STOP to opt out", and send only session reminders. Expect ~$0.008 per text plus
~$1–2/month for the number. SMS is optional; email + in-app notifications cover everything.

## 6. Backups and restore test

- Supabase: *Database → Backups* (daily on Free). Monthly, download a logical backup:
  `pg_dump "$DIRECT_URL" --no-owner -Fc > cchp-$(date +%F).dump` and keep it in the CCHP Drive (private).
- Storage: files are small; once a semester download the bucket with the Supabase CLI (`supabase storage cp -r`).
- Restore test (once a year): create a throwaway Supabase project, `pg_restore` the dump, point a local `.env` at it, run `npm run dev`, sign in.

## 7. Security checklist before go-live

- [ ] Repo private, secret scanning on, no `.env` committed (`git log -p | grep -i password` returns nothing).
- [ ] Supabase bucket private; service key only in Vercel.
- [ ] `CRON_SECRET` set and the cron URL includes it.
- [ ] Two Main Admin accounts; seed admin password rotated after the first login.
- [ ] All imported accounts received their temporary passwords in person; `scripts/.import-temp-passwords.json` deleted.
- [ ] CSP/HSTS headers present (`curl -I https://yourdomain | grep -i strict`).
- [ ] Rate limits exercised: 6 failed logins lock the account for 15 minutes.
- [ ] Backups verified once.
