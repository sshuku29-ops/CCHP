// Builds the certificate PDF with pdf-lib. Pure function: no database, no
// request context, so it can be unit-tested with a throwaway script.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type CertificateInput = {
  fullName: string;
  hours: number;
  sessionsCount: number;
  term: string; // "Fall 2026"
  issuedAt: Date;
  issuerName: string;
  issuerTitle: string; // "Executive Director"
};

// Brand green (globals.css --cchp-green, oklch(0.45 0.12 160)) as RGB.
const GREEN = rgb(0.13, 0.43, 0.3);
const INK = rgb(0.12, 0.12, 0.12);
const MUTED = rgb(0.4, 0.4, 0.4);

// US Letter, landscape.
const WIDTH = 792;
const HEIGHT = 612;

/** Format hours like the rest of the platform: "12" or "12.5". */
export function formatHours(h: number) {
  return Number.isInteger(h) ? String(h) : String(Math.round(h * 100) / 100);
}

export function certificateFileName(fullName: string, term: string) {
  const slug = `${fullName} ${term}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `cchp-certificate-${slug}.pdf`;
}

function fmtLongDate(d: Date) {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

/** Draw one line of text centered horizontally at a given baseline. */
function centered(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color = INK) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (WIDTH - w) / 2, y, size, font, color });
}

/** Break text into lines that fit within maxWidth (simple greedy word wrap). */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Returns the PDF bytes for one certificate. */
export async function buildCertificatePdf(input: CertificateInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Certificate of Volunteer Service — ${input.fullName} — ${input.term}`);
  pdf.setAuthor("Colby Community Health Program");
  pdf.setCreationDate(input.issuedAt);

  const page = pdf.addPage([WIDTH, HEIGHT]);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Thin green border, with a second hairline inside for a framed look.
  page.drawRectangle({ x: 24, y: 24, width: WIDTH - 48, height: HEIGHT - 48, borderColor: GREEN, borderWidth: 2 });
  page.drawRectangle({ x: 32, y: 32, width: WIDTH - 64, height: HEIGHT - 64, borderColor: GREEN, borderWidth: 0.5 });

  // Wordmark.
  centered(page, "CCHP", HEIGHT - 92, sansBold, 30, GREEN);
  centered(page, "COLBY COMMUNITY HEALTH PROGRAM", HEIGHT - 110, sans, 10, MUTED);

  // Title.
  centered(page, "Certificate of Volunteer Service", HEIGHT - 170, serif, 34);
  centered(page, "is proudly presented to", HEIGHT - 205, serifItalic, 14, MUTED);

  // Name, with a green rule underneath.
  const nameSize = 32;
  centered(page, input.fullName, HEIGHT - 250, serifBold, nameSize);
  const nameWidth = serifBold.widthOfTextAtSize(input.fullName, nameSize);
  page.drawLine({
    start: { x: (WIDTH - nameWidth) / 2 - 10, y: HEIGHT - 260 },
    end: { x: (WIDTH + nameWidth) / 2 + 10, y: HEIGHT - 260 },
    thickness: 1,
    color: GREEN,
  });

  // Body paragraph.
  const body = `in recognition of ${formatHours(input.hours)} hours of community service with the Colby Community Health Program at the Mid-Maine Homeless Shelter, ${input.term}.`;
  let y = HEIGHT - 300;
  for (const line of wrap(body, serif, 15, WIDTH - 200)) {
    centered(page, line, y, serif, 15);
    y -= 21;
  }
  const sessions = `${input.sessionsCount} session${input.sessionsCount === 1 ? "" : "s"} · ${formatHours(input.hours)} hours`;
  centered(page, sessions, y - 10, sans, 11, MUTED);

  // Footer: issue date (left) and signature line (right).
  const footerY = 120;
  page.drawText("Issued", { x: 110, y: footerY + 22, size: 9, font: sans, color: MUTED });
  page.drawText(fmtLongDate(input.issuedAt), { x: 110, y: footerY + 6, size: 12, font: serif, color: INK });

  const sigX = WIDTH - 110 - 260;
  page.drawLine({ start: { x: sigX, y: footerY + 20 }, end: { x: sigX + 260, y: footerY + 20 }, thickness: 0.75, color: INK });
  page.drawText(input.issuerName, { x: sigX, y: footerY + 6, size: 12, font: serif, color: INK });
  page.drawText(input.issuerTitle, { x: sigX, y: footerY - 8, size: 9, font: sans, color: MUTED });
  page.drawText("Colby Community Health Program", { x: sigX, y: footerY - 20, size: 9, font: sans, color: MUTED });

  return pdf.save();
}
