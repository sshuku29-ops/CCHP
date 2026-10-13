# CCHP Platform

One web app for the Colby Community Health Program: a public website plus a login-gated
team platform (projects & tasks, recruitment, training, hours, session records, annual reports).

It replaces the pile of Google Forms, Sheets, Docs and Moodle. It does **not** integrate with
Google, Colby SSO, or Qualtrics — by design.

## Quick start (local)

```bash
npm install
cp .env.example .env        # then fill in ADMIN_USERNAME / ADMIN_PASSWORD (quote values!)
npm run db:migrate:dev      # creates prisma/dev.db
npm run db:seed             # creates the Main Admin + defaults
npm run dev                 # http://localhost:3000
```

Want sample data to click around? `npm run db:seed:demo` instead of `db:seed`
(adds demo leaders, volunteers, tasks, sessions, hours, a recruitment cycle; demo password is printed).

Sign in at `/login` with the admin username/password from `.env`. You will be asked to set a
new password immediately.

## Docs

- `docs/ADMIN_GUIDE.md` — **start here if you just inherited this**: deploy, env vars, backups, users, cron, troubleshooting.
- `docs/CONVENTIONS.md` — how the code is organized and the rules for changing it.
- `docs/MIGRATION.md` — importing the old Google Sheets (volunteers, hours, record keeping).
- `docs/REMINDERS.md` — how reminder notifications and email digests run.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run db:migrate:dev` | Create/apply migrations locally (after editing `prisma/schema.prisma`) |
| `npm run db:migrate` | Apply migrations in production (`prisma migrate deploy`) |
| `npm run db:seed` | Seed admin + defaults (idempotent) |
| `npm run db:seed:demo` | Seed with demo data |
| `npm run db:studio` | Browse the database in Prisma Studio |
| `npm run typecheck` / `npm run lint` | Checks |

## Security notes

- Secrets live only in `.env` (gitignored). `.env.example` has names only.
- Passwords are bcrypt-hashed; sessions are httpOnly cookies backed by a DB table.
- Authorization is enforced server-side on every page and action (`src/lib/auth/guards.ts`).
- Login and the public application form are rate-limited; accounts lock after repeated failures.
- Video is never uploaded: only validated YouTube links, rendered via the official embed.
