# CCHP Platform — what is left to do

Status as of 2026-10-13 (evening). Everything requested so far is built and verified locally:
inline-editable public site, meeting notes with a rich text editor, on-platform library and session materials,
quizzes, roster, informal-session log, certificates, claimable tasks, profile photos, phone read-only mode for admins,
SMS opt-in, Postgres with real data imported from the Drive.

## A. Before the first real deploy (owner's choice: Vercel + Supabase)
Follow `docs/DEPLOY_SUPABASE_VERCEL.md` step by step. Short version:
1. Redeem the **Supabase** and **AWS** credits (`docs/FREE_CREDITS.md`).
2. Create the Supabase project + private bucket; run migrations and the import scripts from a laptop.
3. Private GitHub repo → Vercel project → env vars → cron.
4. Buy a domain (~$12/yr); set up Resend with SPF/DKIM/DMARC so email never lands in spam.
5. Hand out the temporary passwords (`scripts/.import-temp-passwords.json`), then delete the file.
6. Fill the gaps in `docs/DATA_GAPS.md` items 1–6.
7. Run the security checklist at the end of the deploy guide.

## B. Testing still owed
- Phone-width visual pass on public pages and on the volunteer platform views (admins are read-only on phones by design).
- Kanban drag-and-drop on a touch device.
- A full recruitment dry run with two reviewer accounts.
- CSV importers with a real Google Sheets export.
- Quill editor submit flows (notes, handoff, module instructions) once more after deploy.
- Restore a database backup once.

## C. Notifications, email, SMS — what we will use, cheap and not spam
| Channel | Provider | Cost | Why / how it stays out of spam |
| --- | --- | --- | --- |
| In-app | built in | $0 | Bell + notifications page; already covers tasks, follow-ups, submissions, assignments, session reminders. |
| Email digests | **Resend** (3,000/month free) or **AWS SES** with the $10k YC credits | $0 | Own domain with SPF + DKIM + DMARC, consistent low volume, transactional only, plain-text part included. Setup in the deploy guide §4. |
| SMS | **Twilio toll-free number** (verified) or **AWS SNS** with credits | ~$0.008/text + ~$2/mo number | Opt-in only (`smsOptIn` on My account), "CCHP:" prefix, "Reply STOP", session reminders only. Carrier registration takes ~2 weeks. Optional — email + in-app already cover everything. |
| Push notifications | none | — | Explicit non-goal in the spec. |

## D. Built this round (so nothing here is pending)
Session roster and assignment (`/sessions/roster`), informal session quick-log (`/sessions/informal/new`),
certificates (auto per term + manual, ED/Main Admin only; PDF with pdf-lib), profile photos with first-login prompt
and avatars everywhere, rich text editor (Quill) for notes/handoff/modules/library/profile, meeting notes with 37
imported past notes, library pages replacing Google Doc links, session materials (brochures) viewable inline,
partner logos, Colby footer mark (approval pending), clickable team member pages, claimable/personal tasks.

## E. Next features worth doing
1. **Meeting recording → transcript → notes** (plan: `docs/MEETING_RECORDING_PLAN.md`; needs Deepgram + OpenAI/Anthropic credits).
2. Duplicate-a-recruitment-cycle button.
3. Public "next session" banner from the roster.
4. Orientation hours one-click for a cohort.
5. .ics calendar download for session dates.
6. Audit-log filters/export.
7. A proper high-resolution Colby wordmark once Colby approves use (replace via Public site → Partners logo upload or the LOGO document).
8. Resident-safe photo review step: a checkbox "no residents in this photo" is text today; could be enforced on upload.

## F. Housekeeping
- `AI_CONTEXT.md` is the handoff for any AI session; keep it current.
- Keep Prisma 6, Postgres, `cacheComponents` off. Verify with `npx next typegen && npx tsc --noEmit && npx eslint src && npx next build`.
- `npm run db:start` must be running for local dev.
