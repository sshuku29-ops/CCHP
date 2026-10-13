# CCHP Platform — Code Conventions

Read this before adding or changing anything. It is short on purpose.

## Stack
- Next.js 16 App Router (`src/app`), React 19, TypeScript, Tailwind v4, shadcn/ui (`src/components/ui`).
- Prisma 6 + SQLite (`prisma/schema.prisma`). Production can use Turso/libsql or Postgres — see ADMIN_GUIDE.md.
- Auth is home-grown: bcrypt password hashes, DB-backed sessions, httpOnly cookie. No OAuth, no Google.
- **Cache Components are OFF.** Every page under `(platform)` is dynamic. Don't add `use cache`.

## Folder map
```
src/app/(public)/      public website (no login)
src/app/(auth)/        login / logout
src/app/(platform)/    everything behind login; layout.tsx enforces session + forced password change
src/app/api/           route handlers (CSV exports, file downloads, cron)
src/lib/               db client, auth, helpers, constants
src/lib/<module>/      queries.ts (reads) + actions.ts (server actions) per module
src/components/ui/     shadcn components (generated — don't hand-edit)
src/components/shared/ small reusable pieces (PageHeader, StatusBadge, ActionForm, …)
src/components/platform/ shell + nav
prisma/seed.ts         idempotent seed (admin from env, defaults, optional demo data)
docs/                  this file, ADMIN_GUIDE.md, MIGRATION.md
```

## Authorization (server-side, always)
- Pages: `await requireUser()`, `requireAdmin()`, `requireMainAdmin()`, or `requireModule("projects")` from `@/lib/auth/guards` — first line of every page.
- Server actions / route handlers: use the `action*` variants (`actionUser()`, `actionAdmin()`, `actionModule("lms")`) which **throw** instead of redirecting.
- Volunteers may only read/write their **own** rows (tasks assigned to them, their hours, their submissions). Filter by `user.id` in the query, never trust ids from the client alone.
- PII (applicant/volunteer email, phone) is only ever selected for Admin/Main Admin. Anonymized review queries must `select` without those fields.

## Server actions
- Live in `src/lib/<module>/actions.ts` with `"use server"` at the top.
- Validate every input with zod. Allowed string values come from `src/lib/constants.ts`.
- Return `ActionResult` (`{ ok: true }` or `{ error }` / `{ fieldErrors }`) for forms used with `ActionForm`/`useActionState`; call `revalidatePath()` after writes.
- Simple one-click actions (status change, delete) can be plain `async (id) => { … }` bound in a `<form action={...}>` or `ConfirmButton`.
- Never build SQL strings. Prisma only.

## Strings stored in the DB
No Prisma enums. Each status/type is a string whose allowed values are in `src/lib/constants.ts` (`TASK_STATUSES`, `HOURS_TYPES`, …). Validate with `z.enum(TASK_STATUSES)`.

## Dates
- Date-only fields (due dates, session dates) are stored at **UTC midnight**. Use `parseDateInput()` / `toDateInput()` / `fmtDate()` from `@/lib/dates`.
- "Fall 2025"-style term labels come from `termForDate()`; academic year from `academicYearForDate()`.

## Video & files
- Video is **never** uploaded. Store a YouTube URL validated with `isYouTubeUrl()`; render with `<YouTubeEmbed />`.
- Small files (assignments only) go through `src/lib/uploads.ts` (allowlist + size cap). Download via `/api/files/[key]` which checks authorization.

## UI
- Use shadcn components + the shared pieces. Page title via `<PageHeader />`. Statuses via `<StatusBadge />`.
- Forms in server components: plain `<form action={serverAction}>` + `<SubmitButton />`. For field errors use `<ActionForm>`.
- Collective progress only. **No individual leaderboards** anywhere.
- Markdown written by users renders with `<Markdown />` (escapes HTML first).

## Don'ts
- No secrets in code. `.env` is gitignored; `.env.example` lists names only.
- No Google APIs, no SSO, no email open-tracking, no resident data.
