# Shared brief for module builders

You are building one module of the CCHP platform in `/Users/shoks927/CCHP Website`.
Several other builders are working on OTHER modules in this same repo at the same time.

## First, read (do not skip)
1. `/Users/shoks927/Downloads/CCHP_PLATFORM_SPEC.md` — the product spec (sections 3, 4, 6, 8.1 especially).
2. `docs/CONVENTIONS.md` — code conventions. Follow them exactly.
3. `prisma/schema.prisma`, `src/lib/constants.ts`, `src/lib/auth/guards.ts`, `src/lib/auth/session.ts`, `src/lib/dates.ts`, `src/lib/utils.ts`, `src/lib/csv.ts`, `src/lib/youtube.ts`, `src/lib/uploads.ts`, `src/lib/notifications.ts`, `src/lib/action-result.ts`.
4. Everything in `src/components/shared/` and the export lists of `src/components/ui/*.tsx` (shadcn, "radix-nova" style: `Button` sizes default/sm/lg/icon, variants default/outline/secondary/ghost/destructive/link).
5. Example patterns: `src/app/(auth)/login/*`, `src/app/(platform)/change-password/*`, `src/lib/auth/actions.ts`, `src/app/(platform)/layout.tsx`.

## Hard rules
- Only create/edit files inside the folders assigned to you below. Never edit: `prisma/schema.prisma`, `package.json`, `next.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/(platform)/layout.tsx`, `src/components/platform/*`, `src/components/ui/*`, `src/lib/auth/*`, `src/lib/constants.ts`, `src/proxy.ts`. If you believe a schema or constants change is required, work around it and list the need in your final report.
- Do NOT run `next dev`, `next build`, `npm install`, `prisma migrate`, or `prisma db push`. Other builders share the DB and `.next`. Verify with `npx next typegen && npx tsc --noEmit` (whole project — ignore errors in files you don't own, and report them) and `npx eslint <your files>`.
- Next.js 16: `params` and `searchParams` are Promises; `cookies()`/`headers()` are async; use the global `PageProps<"/route/[id]">` type for pages; `proxy.ts` replaces middleware. Server actions: `"use server"` file in `src/lib/<module>/actions.ts`.
- Authorization server-side on every page and action (see CONVENTIONS). Volunteers see only their own data. PII only for admins.
- Every list that admins see should have a "Export CSV" link to a route handler under `src/app/api/export/<module>/route.ts` using `toCsv()` + `csvResponse()` (guard with `actionAdmin()` / `actionModule()` and return 403 on `AuthError`).
- Keep UI consistent: `<PageHeader>`, shadcn `Card`/`Table`/`Badge`, `<StatusBadge>`, `<EmptyState>`, `<SubmitButton>`, `<ActionForm>`, `<ConfirmButton>`, `<NativeSelect>`. Mobile-friendly (stack on small screens). No individual leaderboards.
- Demo data exists (`npm run db:seed:demo` already ran). You can inspect data with a throwaway tsx script in the scratchpad dir using `@prisma/client`, e.g. `npx tsx /path/to/script.ts`.
- Write plain, well-commented code that a non-technical student can follow. Prefer server components + server actions over client state. Use client components only for interactivity (kanban drag, filters, dialogs).
- When done, reply with: routes created, files created, what you verified, anything not finished, and any schema/constants needs. Keep it under 300 words.

## Round 3 additions (read these too)
- Database is now **Postgres** (local embedded one: `npm run db:start` is already running on port 54329; `.env` points at it). Production will be **Supabase**. Never run `prisma migrate`/`db push`; the schema is frozen for this round.
- New models (see `prisma/schema.prisma`): `Document` (any stored file; served via `/api/files/[key]` with access checks), `LibraryPage` (editable HTML pages that replace Google Doc links), `MeetingNote` (HTML), `Certificate`; `ModuleResource` now points to a `pageId` OR `documentId` OR legacy `url`; `User` has `photoKey`, `photoPromptSeenAt`, `profileBody`, `pronouns`, `major`, `smsOptIn`; `CommunityPartner.logoKey`; `Task.isPersonal`; `SessionRecord.activities`, `volunteerCount`, `documents`.
- Shared primitives you MUST use: `src/components/editor/rich-text-editor.tsx` (`<RichTextEditor name="body" defaultValue=... />` inside a normal `<form>`; the server action must run the value through `cleanHtml()` from `src/lib/html/sanitize.ts`), `src/components/editor/rich-text.tsx` (`<RichText source=... />` renders HTML or legacy Markdown), `src/components/shared/user-avatar.tsx` (`<UserAvatar user={{firstName,lastName,photoKey}} size="sm" />` — use it everywhere a person is shown), `src/lib/documents/index.ts` (`createDocumentFromFile`, `createDocumentFromBytes`, `deleteDocument`, `documentUrl`, `DOCUMENT_CATEGORIES`), `src/lib/uploads.ts` (`validateUpload(file, allowedExtensions?)`, `IMAGE_EXTENSIONS`, `storeUpload`).
- PDFs can be shown inline with `<iframe src={documentUrl(doc)} />` (CSP allows same-origin frames); images with `<img src={documentUrl(doc)} />`.
- Real data is loaded: 15 sessions with brochures attached as Documents (category BROCHURE, isPublic), partner logos set (`logoKey`), 4 LibraryPages, a training course with resources pointing to pages/documents.
- The signed-in admin in the shared dev browser is `admin` (Main Admin, Saidafzal Shukurov). Don't change its password.
