# What was imported from Google Drive — and what still needs filling in

Imported on 2026-10-13 by `scripts/private/import-drive-data.ts (local only)` from the CCHP shared Drive
(Roles & Responsibilities Guide, [ONGOING] Record Keeping, Hours Log responses, CCHP Goals,
Qualtrics Mission/Goals/Metrics, Transitional Plan, 2025–26 and 2026 Meeting Notes, Planned Topics,
Volunteer Responsibilities template, Master Topic Outline, Same-Day Prep Checklist, Volunteer Emails,
Outreach email, Volunteer Groups Fall '25, Impact & Feedback Questionnaire responses, SP26 volunteer
form headers). The "CCHP Sandbox (restructure test)" folder contains stub copies and was ignored.

Demo data was removed. The `admin` account was kept.

## What is in the platform now

| Area | Imported | Source |
| --- | --- | --- |
| Leadership accounts (Admin role) | Matthew Herrick (Executive Director), Tina Cheng (Formal Sessions), Eliza Ramirez Peralta (Informal Sessions), Papa Boateng (Onboarding & Recruitment), Ashley Marie Diaz Briones (Educational Content & Media) | Roles guide, meeting notes |
| Volunteer accounts | 15 with Colby emails (class of 2027+ active; 2026 graduates inactive). 33 earlier volunteers from the record-keeping sheet as **inactive** accounts with no email, so session history links to them | Volunteer Groups Fall '25, hours log, record keeping |
| Session records | All 15 formal sessions Apr 2024 – Apr 2026 with topics, resident counts, summaries, volunteers, and Drive links to outlines/slides/brochures (from Oct 2025) | [ONGOING] Record Keeping |
| Hours | Session hours per volunteer from the session length; **prep hours split equally** from each session's recorded group total (see below) | Record keeping |
| Goals / projects / tasks | 6 goals (CCHP Goals doc + sustainability), 8 projects, 26 tasks from the 2026 meeting action items; 2 "waiting on" items | Goals doc, meeting notes |
| Training course | 5 modules rebuilt from the Volunteer Responsibilities template, Master Topic Outline, and Same-Day Prep Checklist; links to the Drive templates and examples; 1 quiz ("Program basics") | Moodle Reusable Templates |
| Recruitment | FA26 volunteer cycle (closed, as a template with the real questions and the 1–4 rubric used in the scoring sheet) and a placeholder SP27 Program Coordinator cycle (closed) | SP26 volunteer form, Transitional Plan |
| Handoff docs | Executive Director, Formal Sessions Director, Informal Sessions Director, Onboarding & Recruitment Director (with all email templates), Educational Content & Media Director, Systems & Data Management Director, Executive Assistant, Program Coordinator | Roles guide, emails, checklists |
| Annual reports | Drafts for 2024–25 and 2025–26 with session lists, survey aggregates (19 responses) and pull quotes | Record keeping, impact survey |
| Feedback inbox | 12 anonymous suggestions from the volunteer impact survey | Impact survey |
| Partners | MMHS, MYAN, Colby Civic Engagement | Spec |
| Local resources | 7 entries, **unpublished** until verified | Meeting notes (Jay Hansen, Sep 3 2026) |
| Public site text | Mission and hero text from the Qualtrics doc and the outreach email | Drive docs |
| Meeting notes | 37 notes (2024–25: 13, 2025–26: 13, 2026: 10, + standing agenda) in `/notes`, editable | three Meeting Notes docs |
| Session materials | 5 brochure PDFs attached to their sessions and shown on the public Impact page; recruitment poster; presentation master template + brochure example in the training library | Drive PDFs / Slides exports |
| Library pages | Master Topic Outline, Same-Day Prep Checklist, Volunteer Responsibilities & Timeline, "What goes where" guide — on the platform, editable | Moodle templates |
| Partner logos | MMHS, MYAN, Colby (small file) | partner websites |

## Must be filled in or checked (in priority order)

1. **Temporary passwords.** 15 active accounts were created with one-time passwords in
   `scripts/.import-temp-passwords.json` (gitignored). Hand them out in person, then delete the file.
   Everyone is forced to change their password on first login.
2. **Second Main Admin.** Saidafzal Shukurov is set as Systems & Data Management Director on the `admin` account. Promote one more leader to Main Admin as backup. Unknown: whether an Executive Assistant exists this year.
3. **Leadership bios and photos** — none in the Drive. Each leader is asked for a photo on first login; bios and the longer "About you" are on My account.
4. **Contact email and Instagram URL** — not found. Public site → General. (The CCHP alias is mentioned but never spelled out.)
5. **Local resources** — the 7 entries came from meeting notes, not from a verified list. Owners should check
   each one (phone, address, hours), press "Mark verified today", and publish.
6. **Prep hours are approximations.** The weekly hours-log spreadsheet could not be parsed in full, so each volunteer
   got an equal share of the group's recorded prep total. Totals per session are right; per-person splits are not.
   To fix: export each "Totals" tab from the FA25-SP26 Hours Log sheet as CSV and use Volunteers → Import (hours log),
   then delete the imported PREP rows (notes say "Imported: equal share…").
7. **Fall 2024 and spring 2024 sessions** have volunteer names only: no topic, resident count, or summary. Add what you remember.
8. **Informal sessions** — none were ever recorded. Start logging them (Sessions → New, type Informal).
9. **FA26 session dates** are not set anywhere (meeting notes say Wednesdays 6–8 pm, pushed back a month). Add them in Sessions (upcoming) and Calendar.
10. **Recruitment dates** — the SP27 Program Coordinator cycle has placeholder dates (Nov 16 – Dec 4, 2026). Fix before opening.
11. **Training videos** — the course has no videos yet. Record or link unlisted YouTube videos per module (Add a video).
12. **Quiz** — only one example quiz exists. Add one per module if you want volunteers tested on each.
13. **Annual reports** are drafts. Review the narrative, the quotes (attributed "Volunteer, post-session survey"), and publish.
14. **Graduation dates** for the 33 inactive past volunteers are unknown; emails too. They can stay inactive.
15. **Partner descriptions and links** were written from context; confirm with each partner before publishing broadly.
16. **Resident survey data** — there is none (Qualtrics community forms are "currently none"). The public Impact page only ever shows aggregates.
17. **Stipend amounts, cost center, staff emails** are in the handoff docs (admins only). Confirm they are current.

## Not imported on purpose

- Applicant names, emails, scores (SP26 and FA26 forms) — past cycles, personal data.
- Pre-session Qualtrics demographics (income, race, etc.) — not allowed by the spec.
- Session photos, brochure PDFs, slide decks — they stay in the Drive; the platform links to them.
- The old Moodle page content beyond the templates listed above.

## Added in round 3
18. **Spring 2026 Clinic 1 brochure (Mar 12)** failed to download (4.5 MB); upload it on the session page (Sessions → Mar 12, 2026 → Materials).
19. **Colby logo** is a 119×61 px file from the Civic Engagement site. Get the official wordmark (and approval) and upload it via Public site → Partners or replace the LOGO document.
20. **Session photos**: none imported (photos are in Drive > Media). Upload volunteer-only photos per session.
21. **Slide decks** (16–50 MB Google Slides) were not exported; the Drive links remain under "External links" on each session. Export to PDF and upload if you want them on the platform.
22. **Fall 2026 sessions** have no records yet, so the roster is empty — add upcoming sessions first (Sessions → New), then assign volunteers.
