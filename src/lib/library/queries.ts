import "server-only";
import { db } from "@/lib/db";
import { canAccessModule } from "@/lib/auth/guards";
import type { CurrentUser } from "@/lib/auth/session";
import { LIBRARY_CATEGORIES, LIBRARY_FILE_CATEGORIES, slugify, type LibraryCategory } from "./categories";

type UserLike = Pick<CurrentUser, "id" | "role" | "allowedModules">;

const personSelect = { id: true, firstName: true, lastName: true, photoKey: true } as const;

/** Any admin with the Training (lms) module may create, edit and delete library pages and files. */
export function canEditLibrary(user: UserLike) {
  return canAccessModule(user, "lms");
}

/**
 * Published pages (plus drafts for editors), grouped by category in LIBRARY_CATEGORIES order.
 * `q` searches the title and the page body (HTML) case-insensitively.
 */
export async function listLibraryPages(opts: { q?: string; includeUnpublished?: boolean }) {
  const q = opts.q?.trim();
  const pages = await db.libraryPage.findMany({
    where: {
      ...(opts.includeUnpublished ? {} : { isPublished: true }),
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { body: { contains: q, mode: "insensitive" } }] } : {}),
    },
    select: { id: true, slug: true, title: true, category: true, isPublished: true, updatedAt: true, updatedBy: { select: personSelect } },
    orderBy: [{ title: "asc" }],
  });
  const groups = LIBRARY_CATEGORIES.map((category) => ({ category, pages: pages.filter((p) => p.category === category) }));
  // Anything with an unknown category still shows up at the end instead of disappearing.
  const known = new Set<string>(LIBRARY_CATEGORIES);
  const other = pages.filter((p) => !known.has(p.category));
  if (other.length) groups[groups.length - 1].pages.push(...other);
  return { groups: groups.filter((g) => g.pages.length > 0), total: pages.length };
}

export async function getLibraryPage(slug: string, opts: { includeUnpublished?: boolean } = {}) {
  const page = await db.libraryPage.findUnique({
    where: { slug },
    include: { updatedBy: { select: personSelect } },
  });
  if (!page) return null;
  if (!page.isPublished && !opts.includeUnpublished) return null;
  return page;
}

/** Uploaded files that belong in the library (training handouts + general files), newest first. */
export async function listLibraryFiles() {
  return db.document.findMany({
    where: { category: { in: [...LIBRARY_FILE_CATEGORIES] } },
    include: { uploadedBy: { select: personSelect }, module: { select: { id: true, courseId: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Short lists for <select>s in the "Add a resource" form on module pages. */
export async function listPagesForSelect() {
  return db.libraryPage.findMany({
    where: { isPublished: true },
    select: { id: true, title: true, slug: true, category: true },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });
}
export async function listDocumentsForSelect() {
  return db.document.findMany({
    where: { category: { in: [...LIBRARY_FILE_CATEGORIES] } },
    select: { id: true, title: true, fileName: true, kind: true },
    orderBy: { title: "asc" },
  });
}

/** A slug nobody else uses yet: "prep-checklist", then "prep-checklist-2", ... */
export async function uniqueSlug(title: string, ignoreId?: string) {
  const base = slugify(title) || "page";
  let slug = base;
  for (let n = 2; n < 100; n++) {
    const taken = await db.libraryPage.findUnique({ where: { slug }, select: { id: true } });
    if (!taken || taken.id === ignoreId) return slug;
    slug = `${base}-${n}`;
  }
  return `${base}-${Date.now()}`;
}

export function isLibraryCategory(v: string): v is LibraryCategory {
  return (LIBRARY_CATEGORIES as readonly string[]).includes(v);
}
