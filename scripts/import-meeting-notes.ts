/**
 * One-off import of past meeting notes (three Google Docs, saved as Markdown
 * text under scripts/data/notes/) into the MeetingNote table.
 *
 * Run:  npx tsx scripts/import-meeting-notes.ts
 *
 * What it does, per document:
 *  - splits the text into one section per meeting (headings like
 *    "## Oct 1, 2026 | [Title](calendar-link)" or "### 4/11/2025 Check in with Sasha"),
 *  - parses the date (both formats; falls back to the document's year),
 *  - pulls attendee names out of the next line (italic "*Matt, Sasha*" or
 *    "Attendees: [Name](mailto:…) …"), dropping emails and links,
 *  - converts the Markdown body to HTML (nested lists, strikethrough, links) and
 *    cleans it with the same sanitizer the editor uses,
 *  - inserts one MeetingNote per meeting with `source` = the document title.
 *  - any non-dated text before the first meeting goes into one extra note,
 *    "Standing agenda & ideas".
 *
 * Idempotent: a document is skipped if any note with its `source` already exists.
 * Meetings that appear in two documents (same title + date) are only imported once.
 * DRY_RUN=1 prints what would be imported without writing anything.
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { cleanHtml } from "../src/lib/html/sanitize";

const db = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "1";

const DATA_DIR = path.join(__dirname, "data", "notes");
const DOCS: { file: string; title: string; year: number }[] = [
  { file: "2024-2025-cchc-ongoing-meeting-notes.md", title: "[OLD] CCHC Ongoing Meeting Notes 2024-2025", year: 2025 },
  { file: "2025-2026-cchp-meeting-notes.md", title: "[OLD] 2025-2026 CCHP Meeting Notes", year: 2026 },
  { file: "2026-cchp-meeting-notes.md", title: "2026 CCHP Meeting Notes", year: 2026 },
];
const STANDING_SOURCE = "Standing agenda (imported from the meeting notes docs)";

// ───────────────────────── Text clean-up ─────────────────────────

/**
 * The Google Docs export escapes punctuation ("\~", "\*", "\[") and writes
 * strikethrough as "~~\~\~text\~\~~~". Remove the backslashes so the markdown
 * reads normally, and collapse runs of tildes/asterisks.
 */
function unescape(s: string) {
  return s
    .replace(/\\+([^\sA-Za-z0-9])/g, "$1") // "\~" -> "~", "\*" -> "*", "\[" -> "["
    .replace(/~{3,}/g, "~~") // "~~~~text~~~~" -> "~~text~~"
    .replace(/\*{3,}/g, "**"); // "****bold****" -> "**bold**"
}

/** "[Name](mailto:x)" -> "Name"; "[Title](https://…)" -> "Title"; bare URLs and emails removed. */
function stripLinks(s: string) {
  return s
    .replace(/\[((?:[^[\]]|\[[^\]]*\])*)\]\([^)]*\)/g, "$1")
    .replace(/<?https?:\/\/\S+>?/g, "")
    .replace(/\S+@\S+\.\w+/g, "")
    .replace(/~~/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Attendee line -> "Name, Name". Google Calendar notes list people as
 * "[Name](mailto:…) [Name](mailto:…)" (no commas), so join link labels with
 * commas; anything that is not a link (e.g. "and Justin") is kept as-is.
 */
function parseAttendees(s: string): string | null {
  const names: string[] = [];
  const rest = s.replace(/\[([^\]]*)\]\([^)]*\)/g, (_m, label: string) => {
    const name = label.replace(/~~/g, "").trim();
    if (name) names.push(name);
    return "";
  });
  const extra = stripLinks(rest);
  if (names.length === 0) return extra || null;
  return [...names, ...(extra ? [extra] : [])].join(", ");
}

// ───────────────────────── Date parsing ─────────────────────────

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

/** Returns { date, rest } where rest is the heading text with the date removed, or null if no date found. */
function parseHeading(text: string, fallbackYear: number): { date: Date; rest: string } | null {
  // "Oct 1, 2026 | Title"  or  "Oct 1 2026 Title"
  const long = /^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\s*(?:\|\s*)?(.*)$/.exec(text);
  if (long && MONTHS[long[1].toLowerCase()] !== undefined) {
    return { date: new Date(Date.UTC(+long[3], MONTHS[long[1].toLowerCase()], +long[2])), rest: long[4].trim() };
  }
  // "4/11/2025 Title"  or  "2/6/25 Title"  or  "4/4"
  const short = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*(?:\|\s*)?(.*)$/.exec(text);
  if (short) {
    let year = short[3] ? +short[3] : fallbackYear;
    if (year < 100) year += 2000;
    return { date: new Date(Date.UTC(year, +short[1] - 1, +short[2])), rest: short[4].trim() };
  }
  return null;
}

// ───────────────────────── Markdown -> HTML ─────────────────────────
// Based on src/lib/markdown.ts (pure function) with two additions the meeting
// docs need: nested lists by indentation and ~~strikethrough~~.

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inline(s: string) {
  let out = esc(s);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/~~([^~]+)~~/g, "<s>$1</s>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/\[((?:[^[\]]|\[[^\]]*\])*)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/g, (_m, label: string, href: string) =>
    label.trim() ? `<a href="${href}">${label}</a>` : "",
  );
  out = out.replace(/&lt;(https?:\/\/[^&\s]+)&gt;/g, '<a href="$1">$1</a>');
  out = out.replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2">$2</a>');
  return out;
}

type ListFrame = { type: "ul" | "ol"; indent: number };

function markdownToHtml(src: string): string {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let para: string[] = [];
  const stack: ListFrame[] = [];
  let openItem = false; // is the innermost <li> still open (so a nested list can go inside it)?

  const flushPara = () => {
    if (para.length) {
      const text = para.join(" ").trim();
      if (text) html.push(`<p>${inline(text)}</p>`);
      para = [];
    }
  };
  const closeLists = (toIndent = -1) => {
    while (stack.length && stack[stack.length - 1].indent > toIndent) {
      if (openItem) {
        html.push("</li>");
        openItem = false;
      }
      html.push(`</${stack.pop()!.type}>`);
      openItem = stack.length > 0; // the parent <li> is still open
    }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (/^\s*<!--.*-->\s*$/.test(line)) continue; // "<!-- end list -->"
    if (line.trim() === "") {
      flushPara();
      continue; // blank lines inside the docs' lists are just spacing
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      flushPara();
      closeLists();
      // Demote: "#" in a doc becomes h2 inside a note so the note title stays the only h1.
      const level = Math.min(h[1].length + 1, 4);
      html.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flushPara();
      closeLists();
      html.push("<hr/>");
      continue;
    }
    const q = /^>\s?(.*)$/.exec(line);
    if (q) {
      flushPara();
      closeLists();
      html.push(`<blockquote>${inline(q[1])}</blockquote>`);
      continue;
    }
    const li = /^(\s*)([-*]|\d+[.)])\s+(.*)$/.exec(line);
    if (li) {
      flushPara();
      const indent = li[1].length;
      const type: "ul" | "ol" = /^\d/.test(li[2]) ? "ol" : "ul";
      const text = li[3].trim();
      const top = stack[stack.length - 1];
      if (!top || indent > top.indent) {
        // Deeper: open a nested list inside the current item.
        stack.push({ type, indent });
        html.push(`<${type}>`);
      } else {
        closeLists(indent);
        if (openItem) {
          html.push("</li>");
          openItem = false;
        }
        if (!stack.length || stack[stack.length - 1].type !== type) {
          closeLists(indent - 1);
          stack.push({ type, indent });
          html.push(`<${type}>`);
        }
      }
      if (!text) continue; // empty bullet: skip it
      html.push(`<li>${inline(text)}`);
      openItem = true;
      continue;
    }
    // Plain text line. Inside a list (indented), attach it to the open item; otherwise it is a paragraph.
    if (stack.length && /^\s+/.test(line) && openItem) {
      html.push(` ${inline(line.trim())}`);
      continue;
    }
    closeLists();
    para.push(line.trim());
  }
  flushPara();
  closeLists();
  return html.join("\n");
}

// ───────────────────────── Splitting a doc into meetings ─────────────────────────

type Meeting = { title: string; date: Date; attendees: string | null; body: string };

function splitDoc(text: string, fallbackYear: number): { preamble: string; meetings: Meeting[] } {
  const lines = unescape(text).replace(/\r\n/g, "\n").split("\n");
  const preamble: string[] = [];
  const meetings: Meeting[] = [];
  let current: { heading: { date: Date; rest: string }; lines: string[] } | null = null;

  const finish = () => {
    if (!current) return;
    const body = [...current.lines];
    // Attendees: first non-empty line if it is "*names*" or "Attendees: …".
    let attendees: string | null = null;
    const firstIdx = body.findIndex((l) => l.trim() !== "");
    if (firstIdx >= 0) {
      const first = body[firstIdx].trim();
      const italic = /^\*([^*]+)\*$/.exec(first);
      const labelled = /^\*{0,2}Attendees:?\*{0,2}\s*(.*)$/i.exec(first);
      if (italic) {
        attendees = parseAttendees(italic[1]);
        body.splice(firstIdx, 1);
      } else if (labelled) {
        attendees = parseAttendees(labelled[1]);
        body.splice(firstIdx, 1);
      }
    }
    const titleText = stripLinks(current.heading.rest);
    // Untitled headings ("### 4/4/2025") get a title from the attendees so the list is readable.
    const title = titleText || (attendees ? `Meeting (${attendees})` : "Meeting");
    meetings.push({ title, date: current.heading.date, attendees, body: body.join("\n") });
    current = null;
  };

  for (const line of lines) {
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    const parsed = h ? parseHeading(h[2].trim(), fallbackYear) : null;
    if (parsed) {
      finish();
      current = { heading: parsed, lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
    else preamble.push(line);
  }
  finish();
  return { preamble: preamble.join("\n"), meetings };
}

// ───────────────────────── Main ─────────────────────────

async function main() {
  const author = await db.user.findFirst({
    where: { username: process.env.ADMIN_USERNAME ?? "admin" },
    select: { id: true },
  });
  if (!author) throw new Error("Main admin user not found — set ADMIN_USERNAME in .env");

  const seen = new Set<string>(); // "title|date" of notes already in the DB or imported this run
  for (const n of await db.meetingNote.findMany({ select: { title: true, date: true } })) {
    seen.add(`${n.title.toLowerCase()}|${n.date.toISOString().slice(0, 10)}`);
  }

  const standingSections: string[] = [];

  for (const doc of DOCS) {
    const existing = await db.meetingNote.count({ where: { source: doc.title } });
    if (existing > 0) {
      console.log(`Skipping "${doc.title}": ${existing} note(s) already imported.`);
      continue;
    }
    const file = path.join(DATA_DIR, doc.file);
    if (!fs.existsSync(file)) {
      console.log(`Skipping "${doc.title}": ${file} not found.`);
      continue;
    }
    const { preamble, meetings } = splitDoc(fs.readFileSync(file, "utf8"), doc.year);
    if (preamble.trim()) standingSections.push(`<h2>${esc(doc.title)}</h2>\n${markdownToHtml(preamble)}`);

    let imported = 0;
    let duplicates = 0;
    for (const m of meetings) {
      const key = `${m.title.toLowerCase()}|${m.date.toISOString().slice(0, 10)}`;
      if (seen.has(key)) {
        duplicates++;
        continue;
      }
      seen.add(key);
      const body = cleanHtml(markdownToHtml(m.body)) || "<p><em>(no notes recorded)</em></p>";
      if (DRY_RUN) {
        console.log(`  ${m.date.toISOString().slice(0, 10)}  ${m.title}  [${m.attendees ?? "-"}]  (${body.length} chars)`);
        if (process.env.SHOW_BODY) console.log(body, "\n");
        imported++;
        continue;
      }
      await db.meetingNote.create({
        data: {
          title: m.title,
          date: m.date,
          attendees: m.attendees,
          body,
          source: doc.title,
          createdById: author.id,
        },
      });
      imported++;
    }
    console.log(`"${doc.title}": imported ${imported} note(s)${duplicates ? `, skipped ${duplicates} duplicate(s) already present` : ""}.`);
  }

  if (standingSections.length) {
    const existing = await db.meetingNote.count({ where: { source: STANDING_SOURCE } });
    if (DRY_RUN) {
      console.log("Standing agenda & ideas:\n", cleanHtml(standingSections.join("\n<hr/>\n")).slice(0, 1500));
    } else if (existing === 0) {
      await db.meetingNote.create({
        data: {
          title: "Standing agenda & ideas",
          date: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())),
          attendees: null,
          body: cleanHtml(standingSections.join("\n<hr/>\n")),
          summary: "Running agenda items, ideas and small tasks that were kept at the top of the meeting notes docs.",
          source: STANDING_SOURCE,
          createdById: author.id,
        },
      });
      console.log(`Created "Standing agenda & ideas" from ${standingSections.length} preamble section(s).`);
    } else {
      console.log('"Standing agenda & ideas" already exists — skipped.');
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
