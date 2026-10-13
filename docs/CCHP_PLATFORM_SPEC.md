# CCHP Platform - Build Spec for Claude Code

Project: custom web platform for the Colby Community Health Program (CCHP) that replaces the current pile of Google Forms, Sheets, Docs, and Moodle with one system. Two surfaces: a public landing website and a login-gated management platform.

---

## 0. Setup - install these skills first

```bash
npx -y skills add leonxlnx/taste-skill --skill design-taste-frontend --agent claude-code
npx -y skills add anthropics/skills --skill frontend-design --agent claude-code
npx -y skills add mattpocock/skills --skill research --agent claude-code
```

---

## 1. What CCHP is (context)

CCHP connects ~15 Colby College student volunteers with the Mid-Maine Homeless Shelter in Waterville, Maine. Three times a semester, 5 volunteers run a formal health/wellness education session at the shelter (discussion + activities + Jeopardy + brochure handouts). Volunteers go through a 3-week prep cycle per session: research and topic outline -> leadership feedback -> two slide decks (presentation + brochure source) -> recorded practice run -> live session. There are also informal sessions (games, hangouts with residents).

Mission (short): free, accessible health and wellness education for underserved Waterville community members, delivered through real conversations, while building volunteer skills in research, communication, and facilitation.

Leadership roles: Executive Director, Executive Assistant (also called Vice Chair), Formal Sessions Director, Informal Sessions Director, Educational Content & Media Director, Systems & Data Management Director.

Community partners: Maine Youth Action Network (MYAN), Mid-Maine Homeless Shelter (MMHS), Colby Office of Civic Engagement and Community Partnership.

## 2. Current state (the mess we are replacing)

The CCHP shared Google Drive today:
- One folder per session date, each holding a Topic Outline doc, Presentation Slides, and Brochure Slides (e.g. "CCHP November 11th Outline/Presentation/Brochure"), stretching back years, plus stray "Copy of ..." duplicates
- A separate Google Form PER WEEK for volunteer hours ("FA25-SP26 CCHP Volunteer Hours Log Week 1", "Week 2", ...) each with its own Responses spreadsheet
- "[ONGOING] CCHP Record Keeping" spreadsheet (session data), "[ONGOING] CCHP Planned Topics"
- Scattered docs with [OLD] / [TEMPLATE] prefixes: meeting notes, timeline checklists, process docs, role templates, volunteer groups
- CCHP Roles and Responsibilities Guide, CCHP Goals, CCHP Transitional Plan, Qualtrics Mission/Goals/Metrics doc
- Impact and Feedback Questionnaire (Google Form) + responses sheet
- Brochure PDFs, schedule PDFs, outreach email drafts, certification email templates
- Moodle holds the volunteer training curriculum and assignment submissions
- Also in use today: Qualtrics (IRB surveys), Calendly, Timeful, MuleLife, Instagram

The platform replaces: Google Forms, the scattered Sheets/Docs workflow, Moodle, and any ClickUp-style external PM tool. Keep Qualtrics (IRB) and Instagram as-is. Admins can still open the Google Drive manually whenever they want - the platform does NOT integrate with it.

## 3. Hard constraints

- NO Colby SSO, NO Google/Colby email integration, NO Google Workspace API integration. Self-contained auth only.
- No identifying information about shelter residents anywhere in the system. No resident photos.
- No SSNs or sensitive volunteer data. Allowed volunteer fields: first name, last name, email, phone, graduation date, has-vehicle (yes/no), sessions participated in, hours logged, role.
- Publicly displayed volunteer names/hours are opt-in only.
- Survey/impact results shown publicly only as aggregates.
- No email open-tracking. "Waiting on" items track days-since-sent instead.
- Show collective team progress, not individual leaderboards.
- Must be maintainable by non-technical students who turn over every 1-2 years: boring, well-documented stack; seed data scripts; a written handoff/admin guide is part of the deliverable.

## 4. Auth and roles

Username + password auth (no OAuth). Seed one account on first migration:

- login: `admin`
- password: (set in .env — never commit it)
- role: Main Admin

Implementation note: seed this via environment variables / seed script, not hardcoded in the repo, and force a password change on first login. Passwords hashed (bcrypt/argon2). Sessions via httpOnly cookies.

Roles:
1. **Main Admin** (main tech admin) - sees everything; creates/removes users; changes roles and permissions; full settings access.
2. **Admin** (board/leadership member) - sees the management platform: projects, tasks, goals, volunteer data, applications, recruitment reviews, their own role handoff doc, LMS admin. Main Admin can scope what each Admin sees if needed.
3. **Volunteer** - sees only: their assigned tasks, the LMS training courses, assignment submissions, and their own hours log.

Applicants have NO accounts. They apply through a public form and leave an email for follow-up. Admins create accounts for accepted people.

## 5. Surface 1: Public website (landing)

Pages/sections:
- Hero + mission statement
- Current leadership team: photos, role titles, short bios
- Program stats (live from DB): total formal sessions led + topics + participant counts, total informal sessions, total volunteer hours, upcoming session dates
- Volunteer list with hours - ONLY for volunteers who opted in
- Annual reports page: published reports (narrative + metrics + quotes), one per year
- Community partners (MYAN, MMHS, Colby Civic Engagement)
- Local resources list relevant to the shelter - each resource has an owner (admin) and a "last verified" date shown
- Apply page (see Recruitment below)
- Contact

## 6. Surface 2: Management platform (login required)

### 6.1 Project management (ClickUp-style) - PRIORITY 1, build first
- Hierarchy: Goals (SMART, organized by semester/year) -> Projects that serve a goal -> Tasks
- Tasks: title, description, links/resources, one or more assignees, due date, status (todo / in progress / done / blocked), optional "needs owner" flag for unassigned tasks
- Views: list, kanban board, and a timeline/Gantt view of tasks with owners
- Goal/project progress rolls up from tasks and is visible to all leadership at all times
- Dashboard with collective progress charts for meetings (no individual leaderboards)
- "Waiting on" tracker for external outreach: contact, what was sent, days since sent, auto-reminder flag after N days
- Reminders: in-app notifications + email digest for due/overdue tasks and upcoming dates (simple SMTP, e.g. Resend/SES; no Google integration)
- Shared leadership calendar view of due dates and session dates
- Feedback/ideas inbox (volunteers, leaders) that admins review in meetings
- Each task's owner updates its own status; system supports the weekly roundtable, it does not replace it

### 6.2 Recruitment pipeline - PRIORITY 2, needed before February
- Public application form (no account): short written answers + video answers + email + basic info
- Three application types, same machinery: volunteer applicants, leadership applicants, faculty/staff/external partner interest
- Applications stored anonymized for review: reviewer UI hides name/email during scoring
- Each admin independently scores each application on defined metrics (rubric configurable per cycle)
- Scores averaged -> single ranked list -> team meets, flags interviewees, marks decisions (interview / accept / reject)
- Decide per cycle whether reviewers see videos before or after anonymous scoring (setting)
- Video answers: NO uploads to the platform. Applicants paste an unlisted YouTube link into a link field. The platform stores and embeds the link for reviewers.
- Email follow-up is manual (admin copies addresses); no automated sending to applicants in v1

### 6.3 LMS (replaces Moodle) - for volunteers
- The 3-week training curriculum as a course: modules with instructions, resources, assignment descriptions, due dates
- Course video content: hosted on YouTube as unlisted, embedded in the course pages behind login. No video files stored on the platform.
- Assignment submission: text, small file upload, or a video link (practice-run recordings uploaded by volunteers to YouTube as unlisted, link pasted into the submission)
- Admins review submissions and leave feedback
- Volunteer hours logging form (replaces the per-week Google Forms): date, hours, type (formal session, informal session, prep, other), notes; feeds the volunteer's running total

### 6.4 Data and records - PRIORITY 3, annual report by May
- Volunteer directory: allowed fields only (Section 3), auto-aggregated hours and session participation
- Session records: date, type (formal/informal), topic, number of participants, volunteers involved, materials links
- Everything organized/filterable by semester and year
- Annual report builder: pulls metrics (sessions, topics, participants, hours, volunteer counts) + narrative fields + quotes; outputs a published page on the public site and a printable/PDF view
- CSV import for migration: the existing Record Keeping sheet, past volunteer lists, hours log responses
- CSV export everywhere

### 6.5 Role handoff docs (low priority, build last)
- One living document per leadership role (rich text, links, email templates) editable by its owner and Main Admin; used for end-of-term handoffs

## 7. Build order

1. Auth + roles + project management module
2. Recruitment pipeline (live before February applications open)
3. LMS + hours logging
4. Data/records + annual report builder (report by May)
5. Public website (can ship a minimal landing earlier; full stats pages last)

## 8. Tech guidance (suggestion, not mandate)

- One deployable app: Next.js (App Router) + Postgres (or SQLite via Turso/litefs if hosting must be free-tier) + Prisma/Drizzle, Tailwind + shadcn/ui
- Video: all video lives on YouTube as unlisted links, embedded where needed. No video storage, no upload pipeline.
- Small file uploads only (docs for assignments): S3-compatible bucket (Cloudflare R2) behind signed URLs, or defer to v2
- Email: one transactional provider for reminders only
- Deploy: Vercel/Railway/Fly

## 8.1 Security requirements (non-negotiable, apply from the first commit)

Repo / GitHub:
- NEVER commit secrets: no passwords, API keys, DB URLs, SMTP creds, or the seed admin password in the repo, in code, in comments, or in commit history. All secrets come from environment variables.
- Commit a `.env.example` with variable NAMES only. `.env*` goes in `.gitignore` before the first commit.
- The seed admin credentials (`ADMIN_USERNAME`, `ADMIN_PASSWORD`) are env vars read by the seed script; the values in this spec must not appear anywhere in the repo.
- If a secret ever lands in a commit, rotate it immediately; do not just delete the line.
- Keep the repo private. Enable GitHub secret scanning and Dependabot alerts.

App:
- Password hashing with bcrypt or argon2; never store plaintext or reversible passwords.
- Sessions: httpOnly, Secure, SameSite cookies; server-side session invalidation on logout and role change.
- Force password change on first login for the seeded admin.
- Authorization enforced server-side on every route and API handler by role (Main Admin / Admin / Volunteer); never trust the client to hide things.
- Rate-limit login and the public application form; lockout/backoff after repeated failed logins.
- Validate and sanitize all input (zod or similar); parameterized queries only (the ORM handles this - no raw string SQL).
- Public application form: CAPTCHA or honeypot + rate limit to stop spam; strict allowlist of accepted file types and max sizes on any upload.
- Unlisted YouTube links: store the URL, validate it is a YouTube URL, and render through the official embed - never render arbitrary user-supplied HTML.
- Security headers (CSP, X-Frame-Options, etc.) via framework defaults/middleware; HTTPS only.
- Applicant and volunteer PII (emails, phones) visible only to Admin and Main Admin roles; anonymized review mode must strip it from API responses, not just the UI.
- Database backups enabled on the host; test a restore once.

## 9. Explicit non-goals (do not build)

- Colby SSO / colby.edu email verification / any Google API integration
- Email open-tracking
- Individual volunteer leaderboards
- Live phone push notifications (email + in-app is enough)
- Any resident-facing features or resident data
- Automated applicant emailing (v1)

## 10. Open questions for the team (don't block on these, pick defaults)

- Review videos before or after anonymous scoring (default: after)
- Which rubric metrics for application scoring (default: 3-5 criteria, 1-5 scale, configurable)
- Branding: CCHP confirmed as the name; Colby name/logo approval status unknown - use "CCHP" text branding until cleared
