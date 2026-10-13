# CCHP Platform — Admin & Handoff Guide

This is written for the Systems & Data Management Director (or whoever inherits the site),
assuming you are comfortable with a terminal but are **not** a professional developer.
If something here is out of date, fix the doc — it is part of the product.

---

## 1. What runs where

| Piece | What it is | Where |
| --- | --- | --- |
| App | Next.js (React) app — public site + platform | Vercel (or Railway / Fly / any Node host) |
| Database | SQLite file locally; Turso (libsql) or Postgres in production | see §3 |
| Email | Reminder digests only, via Resend (optional) | `EMAIL_PROVIDER` env var |
| Files | Small assignment attachments | local folder, or S3/R2 bucket (see §6) |
| Video | YouTube unlisted links only | YouTube |

There is **no** Google integration, no Colby SSO, no Moodle. Qualtrics (IRB surveys) and
Instagram stay separate.

## 2. Accounts and roles

- **Main Admin** — full access, creates users, assigns roles, can scope what each Admin sees.
  Keep at least two Main Admins (e.g. Executive Director + Systems Director).
- **Admin** — leadership board. Sees the platform modules. Main Admin can restrict modules per
  Admin at *Settings → Users → edit*.
- **Volunteer** — sees only their own tasks, training courses, submissions, and hours log.

Applicants never get accounts. They apply at `/apply`; when accepted, an Admin creates their
account (*Settings → Users → Create user*), gets a one-time temporary password, and passes it
to the volunteer in person or by email. The volunteer must change it on first login.

**Forgot password?** Main Admin → *Settings → Users → [person] → Reset password*. There is no
self-service reset (no email verification by design).

**Someone left?** Deactivate (keeps their history) rather than delete.

## 3. Environment variables

All secrets come from environment variables. Locally they live in `.env` (never committed).
On Vercel: *Project → Settings → Environment Variables*.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | `file:./dev.db` locally. Production: see §4. |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_EMAIL` | first seed only | Read by `npm run db:seed` to create the first Main Admin. Remove from the host after seeding. **Wrap values in double quotes** — an unquoted `#` starts a comment. |
| `APP_URL` | yes | Public URL, used in email links. |
| `CRON_SECRET` | if using reminders | Random string; `openssl rand -hex 32`. |
| `EMAIL_PROVIDER` | no | `console` (default, logs only) or `resend`. |
| `RESEND_API_KEY`, `EMAIL_FROM` | if `resend` | From address must be a verified domain in Resend. |
| `UPLOAD_DIR`, `MAX_UPLOAD_MB` | no | Local upload folder and size cap (default 10 MB). |

If a secret ever lands in git: rotate it immediately (new DB password / API key), then clean history.

## 4. Deploying

### Option A — Vercel + Turso (free tiers)
1. Push the repo to a **private** GitHub repo. Enable *Secret scanning* and *Dependabot alerts* in repo settings.
2. Create a Turso database (`turso db create cchp`) and get its URL + auth token.
   Prisma + SQLite on Vercel needs the libsql driver adapter; follow Prisma's "Turso" guide:
   install `@prisma/adapter-libsql @libsql/client`, enable `previewFeatures = ["driverAdapters"]`
   in `prisma/schema.prisma`, and construct the client with the adapter in `src/lib/db.ts`
   (the file has a comment showing where). Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
3. Import the repo in Vercel. Build command `npm run build`. Add env vars from §3.
4. Run migrations against production once: `DATABASE_URL=... npm run db:migrate` (Turso: use `turso db shell` to apply the SQL in `prisma/migrations/*/migration.sql`), then `npm run db:seed`.
5. Set the cron (§5) and uploads (§6).

### Option B — Railway / Fly / a VPS with Postgres
1. Change `provider = "sqlite"` to `"postgresql"` in `prisma/schema.prisma`, delete `prisma/migrations/`, run `npm run db:migrate:dev --name init` locally against a Postgres URL to regenerate migrations, commit.
2. Deploy with `DATABASE_URL` pointing at the Postgres instance; run `npm run db:migrate && npm run db:seed` once.
3. Persistent disk for `UPLOAD_DIR`, or use a bucket (§6).

### Option C — simplest possible (one small VPS)
`npm ci && npm run build && npm run db:migrate && npm run db:seed && npm start` behind Caddy/nginx with HTTPS.
SQLite file + uploads folder on the same disk. Back them up (§7).

## 5. Reminders (notifications + email digest)

A daily job calls `/api/cron/reminders` with the `CRON_SECRET`. It creates in-app notifications for
due/overdue tasks and overdue "waiting on" follow-ups and sends one digest email per person who has
something pending. Details and the exact Vercel cron snippet: `docs/REMINDERS.md`.
Main Admin can also press **Run reminders now** on the Notifications page.

## 6. File uploads

Assignment attachments (PDF/DOC/PPT/images, 10 MB max) are stored in `UPLOAD_DIR`. That is fine on a
VPS or Railway volume. **Vercel's filesystem is not persistent** — either keep uploads disabled there
(volunteers can paste links instead) or swap `src/lib/uploads.ts` for an S3-compatible bucket (Cloudflare
R2 is free at this scale): the three functions `storeUpload`, `readUpload`, `deleteUpload` are the only
things to change.

## 7. Backups — do this, and test it once

- **SQLite:** copy `prisma/dev.db` (or the production file) somewhere safe daily. `sqlite3 prod.db ".backup backup-$(date +%F).db"`.
- **Turso:** point-in-time restore is built in; also run `turso db shell cchp .dump > backup.sql` monthly.
- **Postgres:** enable the host's automated backups and download a `pg_dump` monthly.
- **Uploads:** copy the `UPLOAD_DIR` folder (or rely on the bucket's versioning).
- **Test a restore** at the start of each year: restore to a local copy, run `npm run dev`, sign in.

CSV exports exist on every admin table — download them before big changes too.

## 8. Year-end handoff checklist

1. Each leader updates their **Handoff doc** (`/handoff`).
2. Publish the **annual report** (`/reports-admin`) — metrics are computed automatically.
3. Create accounts for incoming leaders; promote one to Main Admin **before** the outgoing Main Admin leaves.
4. Deactivate graduated volunteers (keeps history).
5. Rotate: admin passwords, `CRON_SECRET`, Resend key, database token.
6. Confirm backups and the cron are still running (Settings page shows env checklist).
7. Review `/resources`: mark each resource verified or fix it (the owner is shown on the public site).

## 8b. Editing the public website text

Sign in, open any public page (home, Team, Impact…). A yellow bar appears at the top for admins with
the "Public site content" module. Press **Edit this page**, click any highlighted text, type, press
**Save** (Enter saves single-line text; ⌘/Ctrl+Enter saves paragraphs; Esc cancels). Changes go live
immediately. Lists (team members, partners, resources, reports) are managed from the **Manage** links
next to each section, which open the admin pages. The original default text lives in
`src/lib/cms/defaults.ts`; saving text identical to the default removes the override.

## 8c. Training videos and quizzes

Training → course → module. Admins see **Add a video** (paste an unlisted YouTube link), **Add a
resource**, **Add an assignment**, and **Create a quiz** directly on the module page. Quizzes are
multiple choice with a pass mark; volunteers can retake them, and passing every quiz in a module marks
it complete. Results per quiz are under the quiz's **Results** link.

## 8d. Round-3 features in one paragraph each

- **Meeting notes** (`/notes`): one note per meeting with a basic text editor (fonts, sizes, colors, lists). Past notes from the Drive are imported. Recording + transcription is planned (see `docs/MEETING_RECORDING_PLAN.md`).
- **Library** (`/library`): pages and files that training modules point to. Any admin can edit pages. Nothing links out to Google Docs anymore.
- **Session materials**: open a session → Materials. Upload brochures, slide PDFs, volunteer photos; PDFs display inline. "Public" makes a file visible on the public Impact page.
- **Roster** (`/sessions/roster`): assign volunteers to upcoming sessions; volunteers see their sessions on the dashboard and get a reminder the day before.
- **Informal sessions**: dashboard → "Log an informal session" (also `/sessions/informal/new`); it logs hours for the volunteers you tick.
- **Certificates** (`/certificates`): per term, generate PDFs for everyone with hours (Executive Director or Main Admin only), or issue one manually. Volunteers download theirs under Hours.
- **Tasks**: anyone can create a personal task; admins can leave tasks unclaimed and anyone can Claim them.
- **Photos**: everyone is asked for a photo on first login; it shows everywhere. Leaders' photos appear on the public Team page with a full profile page each.
- **Phones**: admins get a read-only view on phones (a notice explains it); volunteers can log hours from a phone.
- **SMS**: off unless a provider is configured and the person opted in (My account).

## 9. Common tasks

| Task | Where |
| --- | --- |
| Open applications | Recruitment → cycle → Open |
| Review applications anonymously | Recruitment → cycle → Applications → Review |
| Add a session record | Sessions → New |
| Change the mission text / contact email | Public site → General |
| Add a leadership photo | Public site → Leadership → photo URL (host the image anywhere public) |
| Import old spreadsheets | Volunteers → Import (see `docs/MIGRATION.md`) |
| Change wording on the public site | Sign in, open the page, Edit this page |
| Open / close applications, set the deadline | Recruitment → cycle → status panel at the top |
| Add a quiz or video to training | Training → course → module |
| Create/edit the training course | Training → course → Manage |
| See who is signed in / recent changes | Settings |

## 10. Troubleshooting

- **"Incorrect username or password" right after seeding** — the password in `.env` must be quoted. Fix, then re-run the seed after deleting the admin row, or use Prisma Studio to set `mustChangePassword` and reset via another Main Admin.
- **Account locked** — 5 failed logins lock for 15 minutes. A Main Admin can reset the password.
- **Page says "You don't have access"** — the Admin is scoped to fewer modules; Main Admin can widen it in Settings → Users.
- **Emails not arriving** — `EMAIL_PROVIDER` must be `resend`, key valid, `EMAIL_FROM` on a verified domain. With `console` they are only logged.
- **Schema change needed** — edit `prisma/schema.prisma`, run `npm run db:migrate:dev --name describe_change`, commit the new folder under `prisma/migrations/`, deploy, run `npm run db:migrate`.
- **Dependency updates** — Dependabot opens PRs; run `npm run typecheck && npm run build` before merging. Keep Prisma on the 6.x line unless you have time to read the upgrade guide.

## 11. Where the code is

`docs/CONVENTIONS.md` has the folder map. Each module is `src/lib/<module>/queries.ts` (reads) +
`actions.ts` (writes) + pages under `src/app/(platform)/<module>/`. Public site pages are under
`src/app/(public)/`. If you only ever change copy, look in `src/app/(public)/` and the Public site
admin tab — most text is editable there without code.
