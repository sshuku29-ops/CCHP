// Allowed values for LibraryPage.category (see prisma/schema.prisma comment).
// Kept in its own file (no "server-only") so client forms can import the list.
export const LIBRARY_CATEGORIES = ["TRAINING", "TEMPLATE", "CHECKLIST", "GUIDE", "OTHER"] as const;
export type LibraryCategory = (typeof LIBRARY_CATEGORIES)[number];
export const LIBRARY_CATEGORY_LABELS: Record<LibraryCategory, string> = {
  TRAINING: "Training",
  TEMPLATE: "Templates",
  CHECKLIST: "Checklists",
  GUIDE: "Guides",
  OTHER: "Other",
};

/** Document categories that show up under "Files" on the library page and can be attached to modules. */
export const LIBRARY_FILE_CATEGORIES = ["TRAINING", "GENERAL"] as const;
export type LibraryFileCategory = (typeof LIBRARY_FILE_CATEGORIES)[number];
export const LIBRARY_FILE_CATEGORY_LABELS: Record<LibraryFileCategory, string> = {
  TRAINING: "Training handout",
  GENERAL: "Other file",
};

/** Turn a title into a URL slug: "Same-Day Prep Checklist" -> "same-day-prep-checklist". */
export function slugify(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
