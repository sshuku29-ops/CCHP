# AI_CONTEXT.md — read this first (for Claude, Codex, Cursor, anyone)

This file lets a new AI session (or a new student) pick up the CCHP platform without the old chat.
Keep it current: whenever something important changes, edit this file in the same commit.

## 1. What this is
A web platform for the **Colby Community Health Program (CCHP)**, a student-run program at Colby College that
runs health-education sessions at the Mid-Maine Homeless Shelter in Waterville, Maine. One Next.js app with:
- a public website (`/`, `/team`, `/impact`, `/reports`, `/resources`, `/partners`, `/contact`, `/apply`), with
  **click-to-edit text for admins** (inline CMS),
- a login-only platform: projects/goals/tasks, calendar, waiting-on tracker, feedback inbox, meeting notes,
  recruitment (anonymized scoring), training courses with quizzes and a library, hours, session records with
  materials, session roster, informal-session log, certificates, volunteer directory, annual reports, handoff docs,
  users/roles, settings.
The original product spec is `docs/CCHP_PLATFORM_SPEC.md` (copied from the owner's Downloads).

## 2. People and decisions
- Owner / Systems & Data Management Director: **Saidafzal Shukurov** (`admin`, Main Admin; sshuku29@colby.edu).
- Board (Oct 2026): Matthew Herrick (Executive Director), Tina Cheng (Formal Sessions), Eliza Ramirez Peralta
  (Informal Sessions), Papa Boateng (Onboarding & Recruitment), Ashley Marie Diaz Briones (Educational Content & Media).
- Hard rules from the spec: no Google/Colby SSO or Google API integration; no resident data or resident photos;
  volunteer fields limited to name/email/phone/graduation/vehicle/sessions/hours/role (+ photo, pronouns, major,
  profile text added later by the owner's request); public names/hours opt-in only; survey results public only as
  aggregates; no email open-tracking; no individual leaderboards; maintainable by non-technical students.
- Owner's taste: **plain, normal design**, not fancy. The first "designed" public site was rejected.
- Owner wants everything on the platform (no links out to Google Docs for training resources), cheapest hosting
  (Vercel + Supabase), and safety.

## 3. Stack (boring on purpose)
Next.js 16 App Router (Cache Components OFF), React 19, TypeScript, Tailwind v4, shadcn/ui (radix), Prisma 6 on
**Postgres** (local: embedded Postgres via `npm run db:start`; prod: Supabase), bcrypt + DB sessions (httpOnly
cookie), zod, Quill (rich text) + sanitize-html, pdf-lib (certificates), recharts (dashboard), Resend (email,
optional), Twilio (SMS, optional, opt-in). No Prisma enums: allowed values live in `src/lib/constants.ts`.

## 4. How to run
```bash
npm install
cp .env.example .env            # quote values; set ADMIN_USERNAME/ADMIN_PASSWORD
npm run db:start                 # embedded Postgres on :54329 (leave running)
npm run db:migrate:dev && npm run db:seed
npm run dev                      # http://localhost:3000
```
Verification before any commit: `npx next typegen && npx tsc --noEmit && npx eslint src && npx next build`.
After `prisma generate`, restart `next dev` (it caches the client on globalThis).

## 5. Where things are
`docs/CONVENTIONS.md` (folder map + rules), `docs/ADMIN_GUIDE.md` (operations), `docs/DEPLOY_SUPABASE_VERCEL.md`,
`docs/REMINDERS.md`, `docs/MIGRATION.md` (CSV imports), `docs/DATA_GAPS.md` (what is still missing),
`docs/REMAINING_WORK.md` (backlog), `docs/FREE_CREDITS.md` (YC deals), `docs/MEETING_RECORDING_PLAN.md`.
Each module: `src/lib/<module>/queries.ts` + `actions.ts`, pages under `src/app/(platform)/<module>/`.
Shared primitives: `src/components/shared/*` (PageHeader, StatusBadge, UserAvatar, DocumentViewer, …),
`src/components/editor/*` (RichTextEditor/RichText), `src/components/cms/*` (inline editing), `src/lib/documents`,
`src/lib/uploads.ts` (local disk or Supabase Storage), `/api/files/[key]` (access-checked file serving).

## 6. Data that was imported from Google Drive (Oct 13 2026)
`scripts/import-drive-data.ts` (people, 15 sessions, hours, goals/tasks, handoff docs, course, cycles, reports),
`scripts/import-drive-files.ts` (brochure PDFs, poster, templates, partner logos, library pages),
`scripts/import-meeting-notes.ts` (past meeting notes). All idempotent. Demo seed: `npm run db:seed:demo`.

## 7. Conventions for AI assistants working here
- Keep it boring and well-commented; students maintain this. Prefer server components + server actions.
- Authorization server-side on every page/action (`src/lib/auth/guards.ts`). PII only to admins.
- No new dependencies without a reason written in the commit message.
- Don't change `prisma/schema.prisma` casually; every change needs `npm run db:migrate:dev --name <why>` and the
  migration folder committed.
- Update this file + `docs/REMAINING_WORK.md` when you finish a feature or discover a gap.
- Sanity-check in the browser, not only with tsc.

## 8. Open items (short version; full list in docs/REMAINING_WORK.md)
Deploy to Vercel + Supabase; email domain + Resend; hand out temp passwords; leadership bios/photos; verify local
resources; FA26 session dates; meeting recording/transcription feature (plan written, not built); mobile visual pass.
