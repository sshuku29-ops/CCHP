# CCHP Platform — what is left to do

Status as of 2026-10-13. Everything in the spec is built and runs locally. This list is what stands
between the current build and a fully deployed, maintained platform.

## A. Required before the first real deploy

1. **Pick a host and database** (see ADMIN_GUIDE §4). Recommended: Vercel + Turso (free), or Railway with Postgres.
   Nobody has run a production deploy yet.
2. **Set the environment variables** on the host from `.env.example`; generate `CRON_SECRET`; set `APP_URL`.
3. **Email provider.** Reminder digests currently log to the console. Create a Resend account, verify a sending
   domain (or use the Colby alias if IT allows), set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM`.
4. **Schedule the reminder cron** (daily) — Vercel cron snippet in `docs/REMINDERS.md`.
5. **File uploads on Vercel.** Assignment file uploads use local disk; on Vercel that is not persistent.
   Either switch `src/lib/uploads.ts` to Cloudflare R2 / S3 (three functions) or tell volunteers to submit links only.
6. **Backups**: enable them on the host and test one restore (ADMIN_GUIDE §7).
7. **Private GitHub repo** with secret scanning + Dependabot on; push the code; `.env` never committed (already gitignored).
8. **Second Main Admin** created and the seed admin's password rotated.
9. **Data gaps** in `docs/DATA_GAPS.md` items 1–5 (passwords handed out, missing director, bios, contact email, resources verified).

## B. Testing still owed

- Browser pass on **phone widths** for every public page and the platform shell (only desktop was checked).
- Kanban **drag-and-drop** on a touch device (the select fallback works; drag was not exercised).
- A full **recruitment dry run**: open a cycle, submit a test application from the public form, score it with two
  admin accounts, reveal, mark a decision, export CSV.
- **CSV importers** with a real export from Google Sheets (the format is documented in `docs/MIGRATION.md`; tested only with synthetic files).
- **Quiz** flow as a volunteer end to end in the browser (unit-tested with scripts only).
- Inline editing of public text as an Admin with module scoping (not Main Admin).
- Restore from backup once.

## C. Notifications, email, SMS — what exists and what is missing

| Channel | Today | To do |
| --- | --- | --- |
| In-app notifications | Task assigned, task due in 2 days, overdue, waiting-on follow-up due, submission reviewed, new submission (to LMS admins) | Add: new application received (to recruitment admins), quiz passed, feedback item posted, session logged |
| Email digest | One daily email per person with due/overdue tasks and follow-ups (console mode until Resend is configured) | Configure provider; add a "weekly summary for the board" variant; let users opt out in My account |
| Transactional email | None (by design: no automated applicant emails in v1) | v2 option: "application received" auto-reply and templated interview/decision emails sent from the platform with one click |
| SMS / push | Not built, and the spec lists phone push as a non-goal | If wanted later: Twilio SMS for session-day reminders (~$0.01/msg). Needs phone-number consent, a `smsOptIn` field, and a second cron. Not recommended for v1. |
| Reminders for volunteers | Task due dates only | Add assignment due-date reminders (Submission missing + Assignment.dueDate within 2 days) to `src/lib/reminders/run.ts` |
| Calendar invites | None | Optional: .ics download for session dates from the Calendar page |

## D. Features that would round out v1

- **Session groups**: assign the 3 volunteer groups per semester to session dates (today assignment happens by adding volunteers to each session record after the fact). A small "roster" view per upcoming session.
- **Certificates**: generate the end-of-semester volunteer certificate PDF from logged hours (replaces the manual Canva certificates).
- **Orientation hours**: a one-click "add 1h orientation" for a cohort.
- **Informal session quick-log**: a 30-second form (date, activities, volunteers, residents count) on the dashboard.
- **Leadership photo upload** instead of pasting a URL (needs the R2 adapter first).
- **Rich-text editor** for handoff docs and module instructions (today: Markdown textarea with preview).
- **Duplicate a recruitment cycle** button (questions + rubric) so each semester starts from last time.
- **Public "next session" banner** when an upcoming formal session is logged.
- **Audit-log viewer filters** and CSV export of the audit log.
- **Impact page survey aggregates** sourced from the report snapshots automatically (today they live in the report narrative).

## E. Housekeeping for maintainers

- `docs/ADMIN_GUIDE.md`, `CONVENTIONS.md`, `MIGRATION.md`, `REMINDERS.md`, `DATA_GAPS.md`, this file.
- Keep Prisma on 6.x; keep `cacheComponents` off; run `npm run typecheck && npm run lint && npm run build` before merging.
- Delete `scripts/.import-temp-passwords.json` after handing out passwords.
- The `.claude/` folder (agent skills) and `skills-lock.json` are developer tooling, safe to delete.
