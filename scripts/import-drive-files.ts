/**
 * Imports files exported from the Google Drive into the platform as Documents,
 * attaches brochures to their sessions, sets partner logos, and creates the
 * training Library pages that replace links to Google Docs.
 * Run: FILES_DIR=/path/to/files LOGOS_DIR=/path/to/logos npx tsx scripts/import-drive-files.ts
 */
import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";

// Local-disk copy of storeBytes (src/lib/uploads.ts is server-only and cannot be imported here).
async function storeBytes(bytes: Buffer, ext: string) {
  const dir = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
  await mkdir(dir, { recursive: true });
  const key = `${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
  await writeFile(path.join(dir, key), bytes);
  return key;
}

const db = new PrismaClient();
const FILES = process.env.FILES_DIR!;
const LOGOS = process.env.LOGOS_DIR!;
const D = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

async function addDoc(file: string, meta: { title: string; category: string; isPublic?: boolean; sessionId?: string | null; moduleId?: string | null; description?: string }) {
  const bytes = await readFile(path.join(FILES, file));
  const ext = file.split(".").pop()!.toLowerCase();
  const key = await storeBytes(bytes, ext);
  return db.document.create({ data: {
    title: meta.title, description: meta.description ?? null, kind: ext === "pdf" ? "PDF" : "IMAGE", category: meta.category,
    fileKey: key, fileName: file, mimeType: ext === "pdf" ? "application/pdf" : "image/png", size: bytes.byteLength,
    isPublic: meta.isPublic ?? false, sessionId: meta.sessionId ?? null, moduleId: meta.moduleId ?? null,
  } });
}

async function main() {
  const admin = await db.user.findFirst({ where: { role: "MAIN_ADMIN" } });
  // Dev convenience: the seeded admin keeps the password from .env without a forced change.
  if (admin) await db.user.update({ where: { id: admin.id }, data: { mustChangePassword: false } });
  if ((await db.document.count()) > 0) { console.log("Documents already exist — skipping."); return; }

  const sessionByDate = async (d: Date) => (await db.sessionRecord.findFirst({ where: { date: d } }))?.id ?? null;
  const brochures: [string, Date, string][] = [
    ["Fall.Clinic01.Brochure.pdf", D(2025, 10, 15), "Brochure — Habit formation & daily routines (Oct 15, 2025)"],
    ["Fall.Clinic02.Brochure.pdf", D(2025, 11, 11), "Brochure — Nutrition (Nov 11, 2025)"],
    ["Fall.Clinic03.Brochure.pdf", D(2025, 12, 3), "Brochure — Common health conditions (Dec 3, 2025)"],
    ["Spring.Clinic02.Brochure.pdf", D(2026, 4, 8), "Brochure — Health & habit building (Apr 8, 2026)"],
    ["Spring.Clinic03.Brochure.pdf", D(2026, 4, 28), "Brochure — Staying healthy in the heat (Apr 28, 2026)"],
  ];
  for (const [file, date, title] of brochures) {
    await addDoc(file, { title, category: "BROCHURE", isPublic: true, sessionId: await sessionByDate(date), description: "Printed handout given to residents at the session." });
  }
  await addDoc("CCHP_Volunteering_Poster_Fall_25.png", { title: "Volunteer recruitment poster — Fall 2025", category: "GENERAL", isPublic: true });

  // Training documents → module 2 (slides) resources
  const course = await db.course.findFirst({ include: { modules: { orderBy: { order: "asc" } } } });
  const m1 = course?.modules[1], m2 = course?.modules[2], m4 = course?.modules[4];
  const presTemplate = await addDoc("CCHP_Presentation_Slides_Master_Template.pdf", { title: "Presentation slides — master template (PDF)", category: "TRAINING", moduleId: m2?.id, description: "Export of the Google Slides master template. Ask the Formal Sessions Director for the editable deck." });
  const brochureExample = await addDoc("CCHP_Brochure_Slides_Example.pdf", { title: "Brochure slides — example (PDF)", category: "TRAINING", moduleId: m2?.id });

  // Partner logos
  const logos: [string, string][] = [["mmhs.png", "Mid-Maine"], ["myan.png", "Maine Youth"], ["colby.png", "Colby"]];
  for (const [file, match] of logos) {
    const bytes = await readFile(path.join(LOGOS, file));
    const key = await storeBytes(bytes, "png");
    const partner = await db.communityPartner.findFirst({ where: { name: { contains: match } } });
    if (partner) await db.communityPartner.update({ where: { id: partner.id }, data: { logoKey: key } });
    await db.document.create({ data: { title: `${match} logo`, kind: "IMAGE", category: "LOGO", fileKey: key, fileName: file, mimeType: "image/png", size: bytes.byteLength, isPublic: true } });
  }

  // Library pages (replace Google Doc links)
  const pages: [string, string, string, string][] = [
    ["volunteer-master-topic-outline", "Volunteer Master Topic Outline (template)", "TEMPLATE", `
<h2>How to use this outline</h2>
<p>Each volunteer owns one sub-topic (five discussion points) and one Jeopardy category. Copy this structure into your group's working document.</p>
<h2>Sub-topic: [insert title]</h2>
<p><strong>Facilitator name:</strong> ________</p>
<h3>Chronological discussion flow</h3>
<p>For each point, begin with a question to engage the audience. Whether they respond or not, transition naturally into the key information. Feel free to ask thoughtful, funny, or reflective questions — this is a <em>conversation</em>, not a lecture. You are the facilitator and the expert on your sub-topic, so guide the dialogue with confidence.</p>
<ul><li>If a resident goes on a tangent, gently steer the conversation back while validating what they shared.</li><li>If their response is unclear, do your best to pull out a helpful thread and respond with kindness.</li><li>Meet people where they are, while still delivering important information.</li></ul>
<p><strong>Discussion question 1</strong> — key information, explanation, or facts</p>
<p><strong>Discussion question 2</strong> — …</p>
<p><strong>Discussion question 3</strong> — …</p>
<p><strong>Discussion question 4</strong> — …</p>
<p><strong>Discussion question 5</strong> — …</p>
<h3>Sources used</h3>
<p><em>If using AI tools, start with a trustworthy source you chose, then use AI to help explain or simplify it — not the other way around.</em></p>
<ul><li><strong>URL:</strong> …</li><li><strong>Why this source is reliable:</strong> one sentence</li><li><strong>How it applies to shelter residents:</strong> one sentence</li></ul>
<h3>Final discussion question</h3>
<p>Wrap up with a thoughtful question that encourages reflection or invites residents to share opinions or lived experiences.</p>
<h2>Jeopardy</h2>
<ul><li>Choose one category you are responsible for.</li><li>Write 5 questions (100 to 500 points), increasing in difficulty, with the correct answer for each.</li><li>Enter everything into the Jeopardy slides at the end of the presentation deck.</li></ul>
<p><strong>Category tips:</strong> pick categories the audience will enjoy and relate to. The residents live in Waterville, Maine — some watch TV, play video games, walk around town, eat fast food, listen to music, or read. Pop culture is a great place to start. Engaging, but not too easy. Optionally, one category can reinforce the session topic.</p>
<table><thead><tr><th>Points</th><th>Question</th><th>Answer</th></tr></thead><tbody><tr><td>100</td><td></td><td></td></tr><tr><td>200</td><td></td><td></td></tr><tr><td>300</td><td></td><td></td></tr><tr><td>400</td><td></td><td></td></tr><tr><td>500</td><td></td><td></td></tr></tbody></table>
<p><strong>Why is this a good topic for our audience?</strong> One or two sentences.</p>`],
    ["same-day-prep-checklist", "Same-Day Prep Checklist", "CHECKLIST", `
<p><strong>Wi-Fi:</strong> ask the front desk for the shelter password.</p>
<h2>Before leaving campus</h2>
<ul><li>Confirm everyone has a ride; send the address and session time in the group chat. Bring anyone who needs a ride.</li></ul>
<h2>Bring</h2>
<ul><li>Charged laptop and charger</li><li>Projector, projector power cord, white screen, HDMI cord, extension cord</li><li>Colored Sharpie for Jeopardy board tracking</li><li>Snacks, drinks, cooler with ice</li><li>Printed brochures and Jeopardy board</li><li>Pencils/pens and resident feedback forms</li></ul>
<h2>Print</h2>
<ul><li>Copy of the Jeopardy board</li></ul>
<h2>Attention grabber (practice before the session!)</h2>
<p>"Hi everybody, if I could get all of your attention for a minute that would be great! I wanted to start off by thanking you for sharing your space with us during dinner time.</p>
<p>Now, I'm sure some of you are wondering why a bunch of Colby students are here tonight. Well, because we want to get to know you and share some health information that could be helpful. I've noticed there's a pretty big divide between Colby and the Waterville community, and I think it's important for students to recognize that, connect with others, and help out however we can.</p>
<p>So today I've brought five student volunteers who have been doing research and preparation over the past couple of weeks and are now going to lead a discussion on ________. We definitely are NOT experts, so please voice your opinion and share your thoughts because they're going to ask you plenty of questions. This is truly meant to be a conversation with you, not a presentation, so please speak up!</p>
<p>I also brought some snacks and ice-cold drinks for everyone, so take whatever you want. And after the presentation we'll play a fun game of Jeopardy!"</p>`],
    ["volunteer-responsibilities-and-timeline", "Volunteer Responsibilities & Timeline", "GUIDE", `
<h2>Time commitment and expectations</h2>
<p>Preparing for your presentation should take approximately 5–10 hours total, spread across 2–3 weeks:</p>
<ul><li><strong>1 hour</strong> for orientation (if you attend)</li><li><strong>2–3 hours</strong> for research and content preparation</li><li><strong>1–2 hours</strong> for practicing your oral delivery (including as a group at least once)</li><li><strong>1–1.5 hours</strong> for delivering the session at MMHS</li></ul>
<p>You are welcome to log up to 10 hours. If you go over the expected 5 hours (which is great!), tell the director so the MMHS volunteer coordinator can credit your time.</p>
<h2>What this is and what it's not</h2>
<p>It is a privilege to be welcomed into the Mid-Maine Homeless Shelter to share health and wellness information. The MMHS staff and residents are trusting us to create a space that is respectful, engaging, and informative. For us to continue offering sessions, we must show we want to be there by being prepared, professional, and present.</p>
<p>This is <strong>not</strong> a club. This is <strong>not</strong> a class assignment. And this is <strong>not</strong> just something to put on your resume. You volunteered because you care or want to learn how to care better. You are doing real public health work.</p>
<h2>Meeting week</h2>
<ul><li>Attend the mandatory first meeting with your group, the director, and the staff advisor.</li><li>Join the group chat and send your name.</li><li>Choose individual roles in the topic outline.</li></ul>
<h2>Week 2</h2>
<ul><li>Complete your research for your sub-topic and your Jeopardy category and enter it into the topic outline.</li><li>Work on presentation slides, brochure slides, and Jeopardy slides.</li><li>Update the director with completion.</li></ul>
<h2>Week 3 — by Sunday at midnight</h2>
<ul><li>Finish individual presentation, brochure, and Jeopardy slides.</li><li>The entire group meets to review the content and practice the full presentation at least once, and records it. Send the recording to the director (unlisted YouTube link in the platform).</li><li>Expect detailed feedback on slides, brochure, Jeopardy, and oral delivery by Monday night.</li></ul>
<h2>Final week — by Sunday at midnight</h2>
<ul><li>Complete final edits based on board and MMHS feedback so brochures can be printed.</li><li>Individually update the director with completion.</li><li>Rehearse as if you are presenting at the shelter; come prepared to speak confidently without relying on notes.</li></ul>
<h2>Day of the session</h2>
<ul><li>By 1 pm: find a ride (if you can't, message the director).</li><li>By 6 pm: arrive at the Mid-Maine Homeless Shelter and wait outside for everyone to gather.</li></ul>`],
    ["session-materials-guide", "Presentation, brochure and Jeopardy slides — what goes where", "GUIDE", `
<h2>Presentation slides</h2>
<p>The only slideshow used during the shelter session. Engaging, relevant visuals that match your discussion questions and talking points, in the same order as your topic outline. After the discussion slides, add your group's Jeopardy questions and answers. The master template (PDF) and an example deck are attached to Week 2 in the training course.</p>
<h2>Brochure slides</h2>
<p>A separate slideshow used to organize your full content for the printed brochure. List each discussion question in order, and underneath include all related information and talking points. The Educational Content &amp; Media Director uses this to design the brochure that residents take with them, so the content should be thoughtful, accurate, and complete.</p>
<h2>Jeopardy slides</h2>
<p>These belong at the end of the main presentation deck, not the brochure deck. A template with transitions is included — you only input your group's information: a theme title on the first game slide, all questions, and all answers. Clearly written, free of typos, properly formatted.</p>
<h2>Past brochures</h2>
<p>Every printed brochure since Fall 2025 is attached to its session record (Sessions → open a session) and shown on the public Impact page.</p>`],
  ];
  const pageIds: Record<string, string> = {};
  for (const [slug, title, category, body] of pages) {
    const pg = await db.libraryPage.create({ data: { slug, title, category, body: body.trim(), updatedById: admin?.id ?? null } });
    pageIds[slug] = pg.id;
  }
  // Replace Drive-link module resources with internal pages/documents
  await db.moduleResource.deleteMany({});
  const add = (moduleId: string | undefined, label: string, pageId?: string, documentId?: string, order = 0) =>
    moduleId ? db.moduleResource.create({ data: { moduleId, label, pageId: pageId ?? null, documentId: documentId ?? null, order } }) : Promise.resolve(null);
  const m0 = course?.modules[0];
  await add(m0?.id, "Volunteer Responsibilities & Timeline", pageIds["volunteer-responsibilities-and-timeline"], undefined, 0);
  await add(m1?.id, "Volunteer Master Topic Outline (template)", pageIds["volunteer-master-topic-outline"], undefined, 0);
  await add(m2?.id, "What goes where: presentation, brochure, Jeopardy", pageIds["session-materials-guide"], undefined, 0);
  await add(m2?.id, "Presentation slides — master template (PDF)", undefined, presTemplate.id, 1);
  await add(m2?.id, "Brochure slides — example (PDF)", undefined, brochureExample.id, 2);
  await add(m4?.id, "Same-Day Prep Checklist", pageIds["same-day-prep-checklist"], undefined, 0);
  console.log(`Documents: ${await db.document.count()}, library pages: ${pages.length}, module resources rewired.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
