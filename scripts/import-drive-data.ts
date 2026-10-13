/**
 * One-time import of real CCHP data gathered from the shared Google Drive
 * (Oct 2026): leadership, volunteers, session records, hours (approximated),
 * goals/projects/tasks from meeting notes, handoff docs from the Roles &
 * Responsibilities guide, training course content, recruitment cycles,
 * resources to verify, and draft annual reports with survey aggregates.
 *
 * Run: npx tsx scripts/import-drive-data.ts
 * It REPLACES demo data (keeps Main Admin accounts). Guarded by a marker in
 * SiteSetting so it will not run twice unless FORCE=1.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import fs from "node:fs";

const db = new PrismaClient();
const D = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const termFor = (d: Date) => { const m = d.getUTCMonth(), y = d.getUTCFullYear(); return m >= 7 ? `Fall ${y}` : m <= 4 ? `Spring ${y}` : `Summer ${y}`; };
const ayFor = (d: Date) => (d.getUTCMonth() >= 7 ? d.getUTCFullYear() : d.getUTCFullYear() - 1);
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
const doc = (id: string) => `https://docs.google.com/document/d/${id}/edit`;
const pres = (id: string) => `https://docs.google.com/presentation/d/${id}/edit`;
const sheet = (id: string) => `https://docs.google.com/spreadsheets/d/${id}/edit`;

// ───────────────────────── people ─────────────────────────
type Person = { first: string; last: string; email?: string; grad?: number; role?: string; title?: string; bio?: string };
const LEADERS: Person[] = [
  { first: "Matthew", last: "Herrick", email: "mdherr27@colby.edu", grad: 2027, role: "ADMIN", title: "Executive Director" },
  { first: "Tina", last: "Cheng", email: "trchen27@colby.edu", grad: 2027, role: "ADMIN", title: "Formal Sessions Director" },
  { first: "Eliza", last: "Ramirez Peralta", email: "larami28@colby.edu", grad: 2028, role: "ADMIN", title: "Informal Sessions Director" },
  { first: "Papa", last: "Boateng", email: "poboat27@colby.edu", grad: 2027, role: "ADMIN", title: "Onboarding & Recruitment Director" },
  { first: "Ashley Marie", last: "Diaz Briones", email: "adiaz29@colby.edu", grad: 2029, role: "ADMIN", title: "Educational Content & Media Director" },
];
const VOLUNTEERS_WITH_EMAIL: Person[] = [
  { first: "Annie", last: "Goldstein", email: "aegold26@colby.edu", grad: 2026 },
  { first: "Madison", last: "Haddad", email: "mthadd28@colby.edu", grad: 2028 },
  { first: "Benjamin", last: "Martin", email: "blmart27@colby.edu", grad: 2027 },
  { first: "Nana", last: "Dondorful-Amos", email: "ngdond26@colby.edu", grad: 2026 },
  { first: "Kate", last: "Mezrich", email: "kcmezr29@colby.edu", grad: 2029 },
  { first: "Olivia", last: "Lucia", email: "orluci26@colby.edu", grad: 2026 },
  { first: "Tarek", last: "El Sheikh", email: "telshe26@colby.edu", grad: 2026 },
  { first: "Maggie", last: "Mahoney", email: "memaho26@colby.edu", grad: 2026 },
  { first: "Sam", last: "Bunge", email: "agbung27@colby.edu", grad: 2027 },
  { first: "Haley", last: "Coon", email: "hecoon28@colby.edu", grad: 2028 },
  { first: "Jacqueline", last: "Cahaly", email: "jmcaha27@colby.edu", grad: 2027 },
  { first: "Christopher", last: "Tardie", email: "cstard27@colby.edu", grad: 2027 },
  { first: "Harmony", last: "Vermazani", email: "hfverm28@colby.edu", grad: 2028 },
  { first: "Valerie", last: "Posso", email: "vposso28@colby.edu", grad: 2028 },
  { first: "Todd", last: "Siekman", email: "tmsiek28@colby.edu", grad: 2028 },
];
// Name spellings used in the Record Keeping sheet → canonical "First Last"
const ALIASES: Record<string, string> = {
  "Ben Martin": "Benjamin Martin", "Chris Tardie": "Christopher Tardie", "Katie Mezrich": "Kate Mezrich",
  "Jackie Calahally": "Jacqueline Cahaly", "Sam Bung": "Sam Bunge", "Haily Coon": "Haley Coon",
  "Lizania Ramirez Peralta": "Eliza Ramirez Peralta",
};

// ───────────────────────── sessions (from [ONGOING] CCHP Record Keeping) ─────────────────────────
type S = { date: Date; topic?: string; prep?: number; residents?: number; hours?: number; names: string; summary?: string; links?: [string, string][] };
const SESSIONS: S[] = [
  { date: D(2024, 4, 10), names: "Yixin Li, Elaine Liu, Nana Dondorful-Amos, Camille Porteous, Rebeka Suh" },
  { date: D(2024, 4, 25), names: "Sophia Kennedy, Jered Garrison, Isla Barmby, Justin Ivanov, Isabelle Fan" },
  { date: D(2024, 5, 10), names: "Alexandra Bessler, Edward Wu, Sandeep Alapati, Dierdre O'Rourke" },
  { date: D(2024, 10, 29), names: "Matthew Herrick, Emma Ravikovitch, Alexis Shepardson, Domenica Gomez, Abigail Wick" },
  { date: D(2024, 11, 14), names: "Caroline Batchelder, Sophie Gakis, Jacqueline Cahaly, Fernando Aguilar, Nina Jaramillo" },
  { date: D(2024, 12, 3), names: "Eliana Limmen, Sam Bunge, Nelly Juma, Christine Park, Olivia Kraus" },
  { date: D(2025, 3, 19), topic: "Safe injection techniques & injury prevention", prep: 12, residents: 15, hours: 1, names: "Emma Ravikovitch, Fernando Aguilar, Harmony Vermazani, Soomin Lee, Sam Bunge",
    summary: "At the beginning, the clinic coordinator introduced the residents to the volunteers and briefly discussed our roles. Then we handed out snacks and drinks to everyone while the volunteers delivered a presentation on safe injection techniques and injury prevention. They discussed the importance of using sterile equipment, cleaning injection sites, and avoiding high-risk injection areas. The presentation also addressed what to do if complications arise, proper needle disposal methods, and available local resources. To reinforce the material, the volunteers led an interactive Jeopardy-style game that quizzed the audience on both health-related content and fun general knowledge. After the session we handed out feedback forms and conversed with the residents for a bit." },
  { date: D(2025, 4, 9), topic: "Coping mechanisms & self-care", prep: 10, residents: 12, hours: 1.75, names: "Caroline Batchelder, Christopher Tardie, Nina Jaramillo, Tina Cheng, Ella Webber",
    summary: "The Clinic #2 presentation on coping mechanisms and self-care went really well. The slides were clear and super practical, covering things like breathing exercises, ways to ground yourself, and how to handle cravings. Everyone seemed interested and engaged, and the residents talked a lot during the presentation. Afterward, we sat down with them and had a much longer conversation. That part ended up being just as meaningful, if not more. People really opened up, shared personal stories, and talked about what's been helping them get through tough moments. It felt more like a conversation than a discussion, and there was a very supportive atmosphere in the room." },
  { date: D(2025, 5, 7), topic: "Understanding medications & substance use", prep: 13, residents: 10, hours: 1.5, names: "Eliza Ramirez Peralta, Haley Coon, Jacqueline Cahaly, William Lee, Aislinn Mershon",
    summary: "At the beginning of Clinic #3, we handed out snacks and drinks before leading a presentation on understanding medications and substance use. The session covered five main topics: the difference between medications and drugs, how substances affect the body short vs. long term, what addiction really means, safe use of prescriptions and OTC meds, and why some drugs are legal while others aren't. Volunteers asked open-ended questions to encourage discussion, and the residents responded with thoughtful reflections on personal experiences, stigma, and the role of stress and access. The atmosphere was honest and respectful. We ended with feedback forms and some casual conversation." },
  { date: D(2025, 10, 15), topic: "Habit formation & daily routines", prep: 51, residents: 10, hours: 2, names: "Christopher Tardie, Kate Mezrich, Madison Haddad, Tarek El Sheikh, Tina Cheng",
    summary: "First session after the implementation of a Moodle page for the volunteers, so prep time was much higher and the process more thorough. We brought drinks, snacks, and fresh-picked apples. The presentation was very interactive: defining one's identity to motivate habit formation, starting small, stacking habits onto things you already do, and combining them with things you enjoy. Residents gave ideas for fixing poor habits and we used a whiteboard to match existing habits with new ones. The rest focused on what progress should look like, maintaining motivation, and free resources in Waterville. We finished with Jeopardy and stayed to chat. They get better every time.",
    links: [["Topic outline", doc("1a6qo9fBHngCjRLH9msBVHGuvT6xIrlW9NPBLyuZFOJI")], ["Presentation slides", pres("13QGrv6z6Sg57XqYfpGfConAPaUTqI49cqqL2Ocj_3Nc")], ["Brochure slides", pres("1ZEEHlS9jVp2RNJ-D23eSEHjnG6eiu3hn7xngOkwWn8w")]] },
  { date: D(2025, 11, 11), topic: "Nutrition on what you have access to", prep: 38, residents: 10, hours: 2, names: "Annie Goldstein, Ben Martin, Eliza Ramirez Peralta, Sam Bunge, Maggie Mahoney",
    summary: "This session covered nutrition in a way that was relevant to the residents: macronutrients, what calories are, how the body uses energy, balancing intake and activity, choosing low-calorie-dense and nutrient-rich foods, reading nutrition labels without being fooled by serving sizes, micronutrients, hydration, and limiting ultra-processed foods. The discussion pushed practical habits using foods they have access to. Volunteers were well prepared. Afterwards we played Jeopardy and chatted with the residents. Note from feedback: residents and volunteers pointed out that the sugary snacks we brought clashed with the nutrition topic.",
    links: [["Topic outline", doc("1_d29Ph7uq2qeJBNT-iiu0XbLSUipTqQJogdqCTtg8TU")], ["Presentation slides", pres("1yWSGH1u5sxVRnwQSYjNOW9Ja1vCw_sBeqNWD1UCx2Zo")], ["Brochure slides", pres("1ovbgm5gfI0wwe3ih8RRUmdW-nqUJ-s23yUBYwDcY6rU")]] },
  { date: D(2025, 12, 3), topic: "Recognizing & managing common health conditions", prep: 41, residents: 11, hours: 1.5, names: "Haley Coon, Harmony Vermazani, Jacqueline Cahaly, Madison Haddad, Nana Dondorful-Amos",
    summary: "Focused on understanding, recognizing, and managing physical and mental health conditions: diabetes, STIs and blood-borne illnesses, stress, PTSD, depression, anxiety, substance use, and gastrointestinal, autoimmune, urinary, and reproductive conditions, with symptoms, risk factors, prevention, and realistic treatment options. We also covered coping strategies (grounding, breathing, hydration) and when and where to seek help, including local and state resources. The topic was requested by a resident at the previous session. We finished with a Christmas-themed Jeopardy.",
    links: [["Topic outline", doc("1O-_FH_VTV6dNahuXizreGczcJXZR76py_ZNMdmexzwo")], ["Presentation slides", pres("1aSECtJmV7B7wWrcS3ISCi6hubv70nBDKbXGfsMfoPjg")], ["Brochure slides", pres("1eo_fKPx3lw-msRWwoxzHuh1KfSFf1IJRbToiX0O44Qw")]] },
  { date: D(2026, 3, 12), topic: "Healthy relationships & hygiene", prep: 44, residents: 14, hours: 1.75, names: "Eliza Ramirez Peralta, Valerie Posso, Todd Siekman, Haley Coon, Madison Haddad",
    summary: "Justin, the director of the shelter, had specifically requested this topic on healthy relationships as well as one on hygiene. Ashley from Colby Communications stopped by to take photos for Colby news. Five related sub-topics: what friendship really means and why connection matters for health, connecting through encouragement and active listening, setting physical and emotional boundaries, the role hygiene plays in self-care and mental wellbeing, and recognizing and managing emotional overwhelm with grounding techniques. We closed with a St. Patrick's Day themed Jeopardy, gave out brochures, and chatted.",
    links: [["Topic outline", doc("1XKEUkw9Fz77f57l78pz_wgAz8ZNMh0mehYdDeANy0k0")], ["Presentation slides", pres("1aherWq_4O0Hx3QwNr09_vH3a8bvR8ebjKTwkJk088Sc")], ["Brochure slides", pres("16mJqyVQ4cTEEdOj3lHchy7lLOg2TAqj-uU1eHYiL5NE")]] },
  { date: D(2026, 4, 8), topic: "Health & habit building", prep: 37, residents: 10, hours: 1.5, names: "Emma Lindenfelser, Emma Farnham, Kate Mezrich, Olivia Lucia, Ashley Marie Diaz Briones",
    summary: "Focused on health and habit building: identifying personal motivations and connecting them to goals, getting started with SMART goals, the components of health (mental, physical, cognitive), and strategies for sustaining habits: designing your environment, temptation bundling, the Goldilocks rule, accountability partners, tracking progress, journaling, and delayed gratification. The components-of-health section got redundant because volunteers' questions overlapped, something to keep in mind for training. Closed with Jeopardy, brochures, and conversation.",
    links: [["Topic outline", doc("1Ee-j8H7kkcMyioz-nC298VawJ4TxVUtkBwnQfW-gqt8")], ["Presentation slides", pres("1UDnJ023mfPbs-lSR2P_nSyTmmd6lgMJzi-0BTKl2vHk")], ["Brochure slides", pres("1C-RR21p5J7tnxYoNYajHcCYXZyQol8EOIrgt56i7dlk")]] },
  { date: D(2026, 4, 28), topic: "Staying healthy in the heat", prep: 42, residents: 17, hours: 1.5, names: "Chris Tardie, Madison Haddad, Sam Bunge, Bridget Toledo, Laila Abdalla",
    summary: "Ismael Thadal, joining as an advisor next semester, attended. The session covered extreme heat, recognizing heat-related illnesses, and how to respond, with emphasis on distinguishing heat exhaustion from heat stroke. Two interactive scenarios let residents practice identifying symptoms and responding. A slides activity compared common drinks (beer, wine, liquor, soda, coffee, sports drinks) for hydration. We played Jeopardy, then handed out hygiene/foot-care kits for hot weather (clean socks, Vaseline, deodorant, bandages).",
    links: [["Topic outline", doc("14Vh7tR8r-aElfxq0C2GHy2SJGDL9Kps1xsjHyNF9nJ0")], ["Presentation slides", pres("1kd3VA_ItvHAPFcCdVGkNXwaYErOmEE8oRxrGRpeOX1c")], ["Brochure slides", pres("1QC3ISyPc7Z29_ZIYnApi2AYzYTfCuTTNXn0SfqoANjM")]] },
];

async function main() {
  const marker = await db.siteSetting.findUnique({ where: { key: "import.drive.v1" } });
  if (marker && process.env.FORCE !== "1") { console.log("Already imported (set FORCE=1 to re-run)."); return; }

  // ── wipe demo data (keep Main Admins) ──
  await db.quizAttempt.deleteMany(); await db.quiz.deleteMany(); await db.submission.deleteMany(); await db.moduleCompletion.deleteMany();
  await db.hoursLog.deleteMany(); await db.sessionRecord.deleteMany(); await db.application.deleteMany(); await db.recruitmentCycle.deleteMany();
  await db.task.deleteMany(); await db.project.deleteMany(); await db.goal.deleteMany(); await db.waitingOn.deleteMany(); await db.feedbackItem.deleteMany();
  await db.calendarEvent.deleteMany(); await db.notification.deleteMany(); await db.annualReport.deleteMany(); await db.localResource.deleteMany();
  await db.communityPartner.deleteMany(); await db.course.deleteMany(); await db.handoffDoc.deleteMany(); await db.contentBlock.deleteMany();
  await db.user.deleteMany({ where: { role: { not: "MAIN_ADMIN" } } });
  console.log("Demo data removed.");

  // ── users ──
  const users = new Map<string, string>(); // "First Last" -> id
  const tempPasswords: Record<string, string> = {};
  const usernames = new Set((await db.user.findMany({ select: { username: true } })).map((u) => u.username));
  async function ensureUser(p: Person, opts: { active: boolean; role?: string }) {
    const key = `${p.first} ${p.last}`;
    if (users.has(key)) return users.get(key)!;
    let username = slug(`${p.first.split(" ")[0]}.${p.last}`); let n = 2;
    while (usernames.has(username)) username = slug(`${p.first.split(" ")[0]}.${p.last}`) + n++;
    usernames.add(username);
    const temp = randomBytes(9).toString("base64url");
    const u = await db.user.create({ data: {
      username, email: p.email ?? null, passwordHash: await bcrypt.hash(temp, 12), role: opts.role ?? p.role ?? "VOLUNTEER",
      firstName: p.first, lastName: p.last, graduationDate: p.grad ? D(p.grad, 5, 20) : null,
      leadershipTitle: p.title ?? null, showOnPublicSite: !!p.title, bio: p.bio ?? null,
      mustChangePassword: true, isActive: opts.active,
    } });
    if (opts.active && p.email) tempPasswords[username] = temp;
    users.set(key, u.id);
    return u.id;
  }
  // The Main Admin seeded from .env is Saidafzal Shukurov, Systems & Data Management Director.
  const mainAdmin = await db.user.findFirst({ where: { role: "MAIN_ADMIN" }, orderBy: { createdAt: "asc" } });
  if (mainAdmin) {
    await db.user.update({ where: { id: mainAdmin.id }, data: { firstName: "Saidafzal", lastName: "Shukurov", email: "sshuku29@colby.edu", leadershipTitle: "Systems & Data Management Director", showOnPublicSite: true } });
    users.set("Saidafzal Shukurov", mainAdmin.id);
  }
  for (const p of LEADERS) await ensureUser(p, { active: true });
  for (const p of VOLUNTEERS_WITH_EMAIL) await ensureUser(p, { active: (p.grad ?? 0) >= 2027 });
  // Past volunteers named in the record-keeping sheet without a known email → inactive accounts so history links.
  for (const s of SESSIONS) for (const raw of s.names.split(",")) {
    const name = ALIASES[raw.trim()] ?? raw.trim(); if (!name || users.has(name)) continue;
    const [first, ...rest] = name.split(" ");
    await ensureUser({ first, last: rest.join(" ") }, { active: false });
  }
  console.log(`Users: ${users.size}`);

  // ── session records + hours ──
  let hoursRows = 0;
  for (const s of SESSIONS) {
    const vols = s.names.split(",").map((r) => ALIASES[r.trim()] ?? r.trim()).filter(Boolean);
    const rec = await db.sessionRecord.create({ data: {
      date: s.date, type: "FORMAL", topic: s.topic ?? null, title: s.topic ?? `Formal session (${s.date.toISOString().slice(0, 10)})`,
      participantCount: s.residents ?? 0, location: "Mid-Maine Homeless Shelter, Waterville", term: termFor(s.date), year: ayFor(s.date),
      notes: s.summary ?? (s.topic ? null : "Topic, attendance and summary were not recorded in the old sheet (before Dec 2024)."),
      materials: { create: [...(s.links ?? []), ["Record Keeping sheet (original)", sheet("1RjSV5Epm-itILz4jBbZr6GHmrivBhNm6gOzpI5NihL0")]].map(([label, url]) => ({ label, url })) },
      volunteers: { create: vols.map((v) => ({ userId: users.get(v)!, role: "presenter" })) },
    } });
    if (s.hours) for (const v of vols) {
      const uid = users.get(v)!;
      await db.hoursLog.create({ data: { userId: uid, date: s.date, hours: s.hours, type: "FORMAL_SESSION", sessionRecordId: rec.id, notes: "Imported from Record Keeping sheet (session length)." } }); hoursRows++;
      if (s.prep) { await db.hoursLog.create({ data: { userId: uid, date: new Date(s.date.getTime() - 7 * 86400000), hours: Math.round((s.prep / vols.length) * 4) / 4, type: "PREP", sessionRecordId: rec.id, notes: `Imported: equal share of the group's recorded prep total (${s.prep} h across ${vols.length} volunteers). Replace with the individual hours-log figures if needed.` } }); hoursRows++; }
    }
  }
  console.log(`Sessions: ${SESSIONS.length}, hours rows: ${hoursRows}`);

  // ── goals / projects / tasks (CCHP Goals doc + 2026 meeting notes) ──
  const matt = users.get("Matthew Herrick")!, tina = users.get("Tina Cheng")!, eliza = users.get("Eliza Ramirez Peralta")!, papa = users.get("Papa Boateng")!, ashley = users.get("Ashley Marie Diaz Briones")!;
  const yr = 2026, term = "Fall 2026";
  const mkGoal = (title: string, description: string) => db.goal.create({ data: { title, description, term, year: yr, createdById: matt } });
  const g1 = await mkGoal("Increase applicant numbers", "More applicants means more high-quality candidates. How: at least 1 week between initial emails and the application deadline; a standardized, growing email list of departments, clubs, past volunteers and applicants; bigger, earlier, more eye-catching flyers (taken down after the deadline); flyers and forms must say officer positions are paid; regular Instagram posts and stories; MuleLife set up.");
  const g2 = await mkGoal("Improve volunteer training and preparation", "So volunteers are more prepared and residents get higher-quality, engaging information. How: MYAN partnership for formal semesterly facilitation training (online modules + in-person); first semester = training + 1 informal + 1 formal session, second semester = 2 formal sessions each; a bank of topic outlines volunteers can pull from.");
  const g3 = await mkGoal("Restructure the volunteer cohort", "Decrease from 15 to 12 volunteers and have each do 2 sessions per semester to improve volunteer–resident relationships and the volunteer experience. Returning volunteers do not repeat the full training.");
  const g4 = await mkGoal("Motivate volunteers and increase accountability", "More motivation = better outcome. Ideas: certificates (tried), keep making things more professional, practice runs with DavisConnects staff, posting practice videos on MuleLife.");
  const g5 = await mkGoal("Track impact", "Demonstrate whether we make a difference, to inform decisions and continued support. Qualtrics pre/post surveys (see 'CCHP Qualtrics: Mission, Goals, & Metrics'), finalize once training is implemented, apply for Colby IRB when complete. Produce the annual report.");
  const g6 = await mkGoal("Sustainability: succession plan and shared systems", "The program must continue after the Executive Director graduates. Hire a Program Coordinator who shadows the ED and can step up; clarify every role's responsibilities; fit systems to positions; make the board culture more collaborative (regular meetings, everyone's input).");
  const mkProj = (title: string, goalId: string, ownerId: string, extra: Record<string, unknown> = {}) => db.project.create({ data: { title, goalId, ownerId, status: "ACTIVE", ...extra } });
  const pRecruit = await mkProj("Fall 2026 recruitment (volunteers + session coordinator)", g1.id, papa, { status: "COMPLETED", startDate: D(2026, 9, 3), dueDate: D(2026, 9, 30), color: "#16a34a" });
  const pMyan = await mkProj("MYAN facilitation training rollout", g2.id, matt, { startDate: D(2026, 8, 19), dueDate: D(2026, 12, 15), color: "#2563eb" });
  const pTopics = await mkProj("FA26 sessions: MaineCare, chronic conditions, building a routine", g2.id, tina, { dueDate: D(2026, 12, 10), color: "#d97706" });
  const pSucc = await mkProj("Program Coordinator hire & succession plan", g6.id, matt, { dueDate: D(2027, 1, 15), color: "#7c3aed" });
  const pReport = await mkProj("Annual report 2025–26", g5.id, matt, { dueDate: D(2026, 11, 30), color: "#0891b2" });
  const pMedia = await mkProj("Instagram & MuleLife presence", g1.id, ashley, { color: "#db2777" });
  const pInformal = await mkProj("Informal sessions (games, hangouts)", g3.id, eliza, { color: "#65a30d" });
  const pBoard = await mkProj("Board operations & meetings", g6.id, matt, { color: "#475569" });
  type T = [string, string, string, string[], number | null, string?];
  const TASKS: T[] = [
    ["Establish regular meetings with the entire board", pBoard.id, "TODO", [matt], 14, "Go over the mission again; talk about goals, the transition plan, and sustainability."],
    ["Get everyone on the CCHP email alias with signatures", pBoard.id, "TODO", [matt], 14, "Add cchp board to email, set up alias, connect Gmail signatures."],
    ["Make a feedback-cycle method for the board", pBoard.id, "TODO", [matt], 30, "From the Oct 1 meeting with Elizabeth: lots of touch points for input; fit systems to positions."],
    ["Follow up with Gabe about being a Newman mentor", pMyan.id, "TODO", [matt], 10, ""],
    ["Exec board completes the MYAN asynchronous training modules", pMyan.id, "IN_PROGRESS", [matt, tina, eliza, papa, ashley], 21, "Gabe is designing general online modules first; we review asynchronously, then plan the in-person day."],
    ["Review Gabe's online modules and give feedback in a meeting", pMyan.id, "TODO", [matt, tina], 21, ""],
    ["Meet with Elizabeth to decide payment for the MYAN training", pMyan.id, "TODO", [matt], 14, ""],
    ["Email Mingwei about hosting a research session before the first shelter session", pTopics.id, "TODO", [matt], 7, "Then survey volunteers on whether it helped."],
    ["Send all completed topic outlines to the shelter (Justin and Cathe)", pTopics.id, "TODO", [tina], 21, "Standing step before each session."],
    ["Build the MaineCare enrollment outline with the THCM case manager (Jay)", pTopics.id, "IN_PROGRESS", [tina], 21, "Joint session with the case manager; see [ONGOING] CCHP Planned Topics and the Sep 3 notes with Jay Hansen."],
    ["Confirm FA26 session dates with MMHS (Justin / Cathe)", pTopics.id, "TODO", [matt], 7, "Wednesdays 6–8 pm; pushed back a month so new volunteers are trained first."],
    ["Succession planning: Program Coordinator role description and application", pSucc.id, "TODO", [matt], 60, "Sophomores/juniors only, no study abroad, previous CCHP experience considered. See CCHP Transitional Plan."],
    ["Follow up with Page and Liz about Jan Plan systems mapping", pSucc.id, "TODO", [matt], 30, ""],
    ["Let Elizabeth know when everyone is hired (names and student IDs)", pRecruit.id, "TODO", [matt], 3, ""],
    ["Make a running contact list for recruitment emails and link it from the Roles doc", pRecruit.id, "TODO", [papa], 14, ""],
    ["Send email to all past volunteers via MuleLife", pRecruit.id, "DONE", [papa], -20, ""],
    ["Make the Dropbox link for MMHS paperwork submission", pRecruit.id, "DONE", [matt], -25, ""],
    ["Design volunteer recruitment flyers and social post", pMedia.id, "DONE", [ashley], -40, ""],
    ["Semester Instagram posting timeline (1 recruitment, 1 new hires, 1 per session, 1 wrap-up)", pMedia.id, "TODO", [ashley], 14, ""],
    ["Follow up re projector equipment (Civic Engagement could buy and rent out)", pBoard.id, "TODO", [matt], 30, ""],
    ["Follow up re Office of Civic Engagement storage space", pBoard.id, "TODO", [matt], 30, ""],
    ["Log informal sessions in the platform after each event", pInformal.id, "TODO", [eliza], 30, "Date, hours, number of volunteers, activities, number of residents. Replaces the planned Google Form."],
    ["Plan first informal event of the semester", pInformal.id, "TODO", [eliza], 21, "Ideas from the Feb 3 notes: Jeopardy, trivia, arts & crafts, sugar cookies."],
    ["Draft the 2025–26 annual report narrative", pReport.id, "TODO", [matt], 30, "Metrics are computed by the platform; a draft with survey aggregates is already in Annual reports."],
    ["Update Qualtrics forms and resubmit IRB (faculty sponsor: Prof. Erin Sheets)", pReport.id, "TODO", [matt], 45, ""],
    ["Needs an owner: Narcan training — decide whether volunteers get trained or we bring training to residents", pTopics.id, "TODO", [], 45, "Shelter staff may already be doing it; contact Collyn Baeder."],
  ];
  const now = new Date();
  for (const [title, projectId, status, assignees, dueOffset, description] of TASKS) {
    await db.task.create({ data: {
      title, description: description || null, projectId, status, needsOwner: assignees.length === 0,
      dueDate: dueOffset === null ? null : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dueOffset)),
      completedAt: status === "DONE" ? new Date(now.getTime() + (dueOffset ?? 0) * 86400000) : null, createdById: matt,
      assignees: { create: assignees.map((userId) => ({ userId })) },
    } });
  }
  await db.waitingOn.createMany({ data: [
    { contactName: "Justin Price / Cathe (MMHS)", organization: "Mid-Maine Homeless Shelter", whatSent: "Request to confirm FA26 session dates (Wednesdays 6–8 pm) and orientation", channel: "email", sentAt: D(2026, 10, 1), remindAfterDays: 7, ownerId: matt, notes: "Sent date is approximate — set the real one." },
    { contactName: "KVCAP", organization: "Kennebec Valley Community Action Program", whatSent: "Collaboration inquiry (forwarded internally, no reply)", channel: "email", sentAt: D(2026, 1, 26), remindAfterDays: 30, status: "CLOSED", ownerId: matt, notes: "From Jan 26, 2026 notes. Re-open if we try again." },
  ] });
  console.log(`Goals: 6, projects: 8, tasks: ${TASKS.length}`);

  // ── partners & resources (resources unpublished until verified) ──
  await db.communityPartner.createMany({ data: [
    { name: "Mid-Maine Homeless Shelter (MMHS)", description: "Our host site in Waterville. Every formal and informal session happens here, in partnership with shelter staff.", url: "https://www.shelterme.org", order: 1 },
    { name: "Maine Youth Action Network (MYAN)", description: "Designing and delivering CCHP's facilitation training for volunteers.", url: "https://myan.org", order: 2 },
    { name: "Colby Office of Civic Engagement and Community Partnerships", description: "Funds and supports the program: stipends, session supplies, training, and connections across campus.", url: "https://www.colby.edu/civic-engagement/", order: 3 },
  ] });
  await db.localResource.createMany({ data: [
    { name: "Maine 211", category: "General help", description: "Free, confidential help finding local services, 24/7.", phone: "211", url: "https://211maine.org", ownerId: tina, isPublished: false, order: 1 },
    { name: "MMHS counseling and drop-in groups", category: "Mental health & substance use", description: "The shelter's licensed mental health and substance use program (Bill Tanner building): drop-in group Thursday mornings, DBT group Monday mornings, individual counseling by case-manager referral.", ownerId: eliza, isPublished: false, order: 2 },
    { name: "The Lighthouse (daytime meals)", category: "Food", description: "Volunteer-run day space providing meals; on Main Street near Dunkin' and Burger King. Confirm hours.", ownerId: tina, isPublished: false, order: 3 },
    { name: "KVCAP transportation", category: "Transportation", description: "Rides to medical and psychiatric appointments (not to jobs or vocational programs).", url: "https://www.kvcap.org", ownerId: tina, isPublished: false, order: 4 },
    { name: "HealthReach Community Health Centers", category: "Health care", description: "Primary care on a sliding scale in central Maine.", url: "https://www.healthreach.org", ownerId: tina, isPublished: false, order: 5 },
    { name: "MaineCare enrollment (Maine DHHS)", category: "Insurance", description: "Apply or renew MaineCare; note the new six-month redeterminations and work requirements starting 2026–27.", url: "https://www.maine.gov/dhhs/oms", ownerId: tina, isPublished: false, order: 6 },
    { name: "Maine Crisis Line", category: "Mental health & substance use", description: "24/7 crisis support by phone or text.", phone: "1-888-568-1112", ownerId: eliza, isPublished: false, order: 7 },
  ] });

  // ── handoff docs (from the Roles & Responsibilities guide, emails, checklists) ──
  const board = `## Executive board responsibilities (everyone)

- Familiarize yourself with all resources in the Google Drive and your individual responsibilities.
- Use the CCHP alias and CC the executive board in all emails.
- Help put up volunteer outreach flyers at the start of the semester; delegate buildings.
- Read and score applications (leadership and volunteers). We look for passion for public health, public speaking skills, motivation to engage with the shelter community, and understanding of the program. Aim for an even spread of class years.
- Train someone for one semester to replace you before you graduate.
- **Attend one formal or informal session per year.**
- Attend all scheduled meetings: with the advisor 1–2 at the start of each semester, one after every session, one debrief at the end; a 15-minute check-in during each 3-week prep cycle.

## Primary contacts

- MMHS — Justin Price (Assistant Manager, primary contact by text), Catherine Haskell (Operations Manager, volunteer paperwork), Richard Compagnon (Shelter Manager, CC), David Sovetsky (VP & Chief Program Officer, CC), Tanya Fosset (Development & Communications, CC), Jay Hansen (THCM case manager, Wed/Thu).
- Colby — Sasha Alcott (CCHP advisor), Ismael Thadal (incoming advisor), Elizabeth Jabar (Civic Engagement & Community Partnerships — program funding, cost center 01-5314), Prof. Erin Sheets (faculty sponsor for Qualtrics IRB).
- MYAN — Gabe O'Brien (facilitation training).
- Founder — Saathvika Diviti (alum).
Email addresses live in the Roles & Responsibilities Guide in the Drive.

## Session basics
3 sessions per semester (one per month), each run by 5 volunteers drawn from 3 pre-assigned groups. Wednesdays 6–8 pm at MMHS.`;
  const HANDOFF: [string, string, string | null][] = [
    ["Executive Director", `# Executive Director — handoff

## Summer
- Make the annual report (the platform computes the metrics; you write the narrative).
- Review progress toward last year's goals; set new goals; update systems; build a timeline to the start of the semester.
- Maintain relationships with advisor(s), the shelter, Civic Engagement, MYAN, and other partners. Expand outreach.
- Update Qualtrics forms and submit the IRB in mid-August (faculty sponsor: Prof. Erin Sheets).

## Before the semester
- Meet the advisor(s) and board to plan meetings and one-on-ones.
- Meet Elizabeth Jabar to go over funding (stipends, snacks/drinks, MYAN training). Ask for Walmart gift cards.

## During the semester
- Oversee all board operations and delegate. Lead board meetings: when2meet polls, agenda sent ahead, notes, tasks assigned, next meeting scheduled.
- Email shelter staff at the start of each semester to schedule orientation and 3 session dates.
- Keep the shared calendar current. Conduct interviews and final decisions with the PC; send decisions to the recruitment director for emails.
- Confirm volunteer paperwork with the shelter's volunteer coordinator. Split volunteers into 3 groups of 5 (mix class years, experience, cars).
- Keep the training course and assignment dates current in the platform (replaces Moodle).

## Succession (Transitional Plan)
Hire a Program Coordinator (sophomore/junior, not going abroad) who shadows the ED and takes over at year end. Avoid PC and ED in the same class year. Stipend history: ED $500, Session Coordinator $300, Recruitment $300, Media $300, Informal $150.

${board}`, "Matthew Herrick"],
    ["Formal Sessions Director", `# Formal Sessions Director (Session Coordinator) — handoff

## Per-session cycle
1. **4 weeks before**: email the volunteer group (intro, session date/time/topic, mandatory meeting via Timeful; remind after 24h; ask them to flag conflicts ASAP).
2. **3-week prep phase**: stay in touch; remind before outline, slides + recording, and session date. Meet the advisor 1–2 days after outlines are in to give feedback. File practice recordings (YouTube unlisted links in the platform).
3. **Follow-up email**: meeting date/time + calendar invite ("bring laptop"), topic information, point them to the training course.
4. **Before the mandatory meeting**: copy the topic outline, presentation and brochure templates into the session folder; share with edit access; check group assignments and dates.
5. **Mandatory meeting**: mission and goals, the 3-week phase, facilitation style with examples; everyone picks a subtopic and Jeopardy theme; add to calendar; schedule the recording; pre-session Qualtrics; make the group chat.
6. **Oral (2nd) meeting**: record the run-through, give tips on slides and delivery.
7. **1–2 days before**: confirm with Justin; rent the projector from Miller; buy supplies (see checklist); photos of volunteers only.
8. **Immediately after**: log the session in the platform (date, topic, residents, volunteers, summary); remind about the post-session Qualtrics; send certificates.

## Same-day prep checklist
Wi-Fi password: ask the front desk. Confirm rides and send the address and time in the group chat.
Bring: charged laptop + charger, projector, cord, white screen, HDMI, extension cord, colored Sharpie for the Jeopardy board, snacks, drinks, cooler with ice, printed brochures and Jeopardy board, pens and resident feedback forms.

### Attention grabber (practice it)
"Hi everybody, if I could get your attention for a minute… thank you for sharing your space with us during dinner. Some of you are wondering why a bunch of Colby students are here tonight: we want to get to know you and share some health information that could be helpful. Today I've brought 5 student volunteers who have been researching and preparing over the past couple of weeks and are going to lead a discussion on ______. We are NOT experts, so please voice your opinion — this is a conversation, not a presentation. There are snacks and cold drinks for everyone, and after the discussion we'll play Jeopardy!"

${board}`, "Tina Cheng"],
    ["Informal Sessions Director", `# Informal Sessions Director — handoff

New role (2026). Hosts relaxed events at the shelter with smaller groups of volunteers: Jeopardy, trivia, arts and crafts, baking, game nights. Goal: build relationships between volunteers and residents outside the formal sessions (survey feedback asks for exactly this).

## Each event
- Agree the date with Justin / Cathe; Wednesdays 6–8 pm work.
- Invite volunteers (all are welcome; new volunteers should attend at least one before their formal session).
- Bring snacks and drinks within the budget; keep activities optional and give choices (avoid yes/no questions).
- Afterwards, log the session in the platform: date, type Informal, number of volunteers, activities, number of residents. Volunteers log their hours.

## Ideas noted so far
Jeopardy, trivia, arts/crafts, sugar cookies, board games, knitting/crocheting supplies, watching TV together.

${board}`, "Eliza Ramirez Peralta"],
    ["Onboarding & Recruitment Director", `# Onboarding & Recruitment Director — handoff

## Responsibilities
- Volunteer and leadership recruitment; bring ideas to improve the applicant pool.
- Start of semester: email the standing list (DavisConnects pre-health advisor, Karen Macke, department heads, club presidents, Civic Engagement, ColbyNow, REACH, Sasha, pre-health, chem/bio club, psych, bio, education, CER, SHOC, Prof. Steven Langan, Pulver, Tanya Sheehan for medical humanities, Brit Halverson). Leave 1–2 weeks to receive applications. Use the CCHP alias. Mention the club fair, Instagram and MuleLife.
- Applications are now collected and scored in the platform (Recruitment). Interviews are scheduled via Calendly/Google appointment links.
- After written review: interview invitations; rejections (encourage reapplying).
- After interviews: acceptances with group and dates and MMHS paperwork instructions (SSN required, Dropbox link); rejections; leadership acceptances/rejections.
- Track who completed MMHS paperwork. Email the post-session Qualtrics survey when the session coordinator says so.
- Keep forms and email templates organized (Drive: Forms & Responses, Email Templates).

## Email templates (from "CCHP Volunteer Emails")

### Interview invitation
Thank you for your interest in volunteering with the Colby Community Health Program (CCHP)! After reviewing applications, [advisor], the executive board, and I would like to offer you an interview as the next step. Interviews are ~10 minutes; to be considered you must sign up for a slot and attend. [Scheduling link]. If none of the times work, email me as soon as possible; because of the quick turnaround before the first session we may need to offer the slot to someone on the waitlist.

### Volunteer confirmation & required form
Congratulations! We received an overwhelming number of applications this semester, and after careful review we are excited to offer you a volunteer position. Orientation: [date/time]. Session dates: [dates], 6–8 pm. We can bring five volunteers per session, so you will be assigned to a group based on availability, experience and preferred topics. Reply by [time] to confirm; otherwise the spot goes to the waitlist. Attached are the MMHS volunteer forms, due [date] (yes, the SSN is required).

### Application update (not selected)
Thank you for applying. After careful review of applications and interviews we were unable to offer you a position due to the limited number of spots. This was a very competitive process; we strongly encourage you to apply again next semester.

### Officer application update
Thank you for applying for the [role] position. After careful consideration we are unable to offer you the role due to the limited number of positions. We encourage you to stay involved and apply again.

### Volunteer certificate
Thank you for the time you dedicated to CCHP this semester. Attached is your certificate with the hours you earned: one hour for orientation (if applicable), two hours for your session, and your preparation time. All volunteers reapply each semester; keep an eye out for the application.

${board}`, "Papa Boateng"],
    ["Educational Content & Media Director", `# Educational Content & Media Director — handoff

## Responsibilities
- All media; bring ideas to grow audience and engagement.
- Turn each group's brochure slides into the printed brochure residents take home (plain language, accurate, complete). Print through SBS.
- Create media for recruitment and events; manage Instagram (goals per semester: 1 recruitment post, 1 new hires, 1 per formal session, 1 per informal session, 1 wrap-up) and MuleLife.
- Photos: volunteers only, never residents. Ask permission.
- Keep everything in Drive > Media.

${board}`, "Ashley Marie Diaz Briones"],
    ["Systems & Data Management Director", `# Systems & Data Management Director — handoff

Current holder: Saidafzal Shukurov (built this platform in Oct 2026).

## What this role owns
- This platform: user accounts, roles, backups, the reminder cron, the public site content, and the yearly handoff of the Main Admin role (see docs/ADMIN_GUIDE.md in the repo).
- Record keeping: every formal and informal session logged, volunteer hours complete, annual report metrics checked.
- CSV exports before big changes; imports of any remaining spreadsheets.

## Recurring tasks
- Monthly: check the Settings page (env checklist, recent activity), confirm backups.
- After each session: confirm the session record and hours were logged.
- End of each semester: deactivate graduated volunteers, export CSVs, verify the resources page entries.
- Summer: rotate secrets, promote the incoming Main Admin before the outgoing one leaves.

${board}`, "Saidafzal Shukurov"],
    ["Executive Assistant (Vice Chair)", `# Executive Assistant (Vice Chair) — handoff

_(Role not yet filled in 2026–27. Historically: review topic outlines with the Formal Sessions Director and give feedback to volunteers; support the Executive Director with meetings and follow-ups.)_

${board}`, null],
    ["Program Coordinator", `# Program Coordinator — handoff

Planned role (see CCHP Transitional Plan): hired as the typical track to Executive Director.

## Requirements
- Sophomore or junior; no study abroad during either semester (formal agreement).
- Preferred: previous CCHP volunteer experience with demonstrated effort, public speaking, organization and time management, familiarity with FLI backgrounds.

## Training phase
- 1st semester: meets the board and the ED one-on-one; splits interviews with the ED; attends orientation; trained through one full session run-through; then fully takes over the PC role.
- 2nd semester: exposed to every ED skill at least once (interview process, partner communications, goal setting and review).

## Split of communications (proposal)
PC: internal volunteer communications around session prep. ED: community engagement, growth, shelter communications, paperwork and pre/post-session forms.

${board}`, null],
  ];
  for (const [roleTitle, content, ownerName] of HANDOFF) {
    await db.handoffDoc.create({ data: { roleTitle, content, ownerId: ownerName ? users.get(ownerName)! : null, updatedById: matt } });
  }

  // ── training course (replaces Moodle) ──
  const course = await db.course.create({ data: { title: "Formal Session Volunteer Training", isPublished: true, order: 1,
    description: "Everything a volunteer needs for the 3-week prep cycle: what CCHP is (and isn't), the topic outline, the slides and brochure, the recorded run-through, and session day." } });
  const M = async (order: number, title: string, summary: string, instructions: string, resources: [string, string][] = [], assignments: { title: string; description: string; submissionType: string }[] = []) =>
    db.courseModule.create({ data: { courseId: course.id, order, title, summary, instructions, resources: { create: resources.map(([label, url], i) => ({ label, url, order: i })) }, assignments: { create: assignments.map((a, i) => ({ ...a, order: i })) } } });
  const m0 = await M(1, "Start here: what CCHP is (and what it isn't)", "Mission, expectations, and the time commitment.",
`## Our mission
1. Provide free, accessible health education to individuals who may not otherwise have access.
2. Reduce stigma, on both sides, through conversation and understanding.
3. Build a sense of community and rapport between Colby students and MMHS residents and staff.
4. Create a space where everyone feels heard and respected.
5. Have fun!

## A reminder of what this is and what it's not
It is a privilege to be welcomed into the Mid-Maine Homeless Shelter to share health and wellness information. The staff and residents are trusting us to create a space that is respectful, engaging, and informative. To keep offering sessions there, we must show we want to be there by being prepared, professional, and present.

This is **not** a club. This is **not** a class assignment. And this is **not** just something to put on your resume. You are doing real public health work: researching a specific health topic, tailoring it to a specific audience, and showing up to lead a meaningful conversation about it.

## Time commitment
Preparing should take about 5–10 hours over 2–3 weeks: 1 hour orientation (if you attend), 2–3 hours research and content, 1–2 hours practicing (at least once as a group), 1–1.5 hours at the shelter. Log your hours in this platform under **Hours**. You may log up to 10.

## How a session runs
Snacks and drinks, a short attention-grabber from the director, then five volunteers each facilitate their sub-topic as a *conversation* (questions first, then key information), Jeopardy, brochures handed out, and time to chat afterwards.`,
    [["[OLD] CCHP Process and Mission (Drive)", doc("1K4RE_zjdT1gwwTc0zxsH42CyWn61YY0zzd0RkpKu1hA")], ["CCHP Qualtrics: Mission, Goals & Metrics (Drive)", doc("1p0nETYAetyH99ZjFPhFP22t1dBYlrBtnHcNGm9IvNgw")]]);
  const m1 = await M(2, "Meeting week + Week 1: research and your topic outline", "Attend the mandatory meeting, pick your sub-topic and Jeopardy category, research, and fill in the outline.",
`## Meeting week
- Attend the mandatory first meeting with your group, the director, and the staff advisor.
- Join the group chat and send your name.
- Choose your sub-topic and your Jeopardy category in the shared Topic Outline.

## Week 1
- Research your sub-topic **and** your Jeopardy category, then enter everything into the Topic Outline.
- For each of your 5 talking points: start with a question to engage the audience, then transition into the key information. This is a conversation, not a lecture. Be ready to adapt: steer tangents back gently, pull a helpful thread from unclear answers, meet people where they are.
- Sources: start with a trustworthy source you chose (CDC, NIH, MaineHealth, peer-reviewed). If you use AI tools, use them to simplify your source, not the other way around. For each source write one sentence on why it is reliable and one on how it applies to shelter residents.
- End with a final discussion question that invites reflection or lived experience.
- Jeopardy: 5 questions (100–500 points) increasing in difficulty, with answers. Pick categories residents will enjoy: pop culture, Waterville, TV, music, food. Optional: one category tied to the session topic.
- Update the director when your part is complete, then submit below.`,
    [["Volunteer Master Topic Outline (template)", doc("1FmoT0yCbWtAnAdGlsvjHYHU1NQrYLDcEzKBb2ZlTGyM")], ["Example topic outline — Oct 15, 2025", doc("1a6qo9fBHngCjRLH9msBVHGuvT6xIrlW9NPBLyuZFOJI")], ["Example topic outline — Mar 12, 2026", doc("1XKEUkw9Fz77f57l78pz_wgAz8ZNMh0mehYdDeANy0k0")]],
    [{ title: "Topic outline (your sub-topic + Jeopardy category)", description: "Paste the link to your group's outline doc, or upload a PDF of your section. Due by the end of Week 1.", submissionType: "ANY" }]);
  const m2 = await M(3, "Week 2: presentation slides, brochure slides, Jeopardy slides", "Build the deck that is shown at the shelter and the separate brochure-content deck.",
`## Presentation slides
The only slideshow used at the session. Engaging, relevant visuals that match your discussion questions and talking points, in the same order as your outline. After the discussion slides, add your group's Jeopardy questions and answers.

## Brochure slides
A separate deck used to organize your full content for the printed brochure: list each discussion question in order, with all related information underneath. The Educational Content & Media Director turns this into the brochure residents take with them, so it must be thoughtful, accurate, and complete.

## Jeopardy slides
At the end of the main presentation deck. A template with transitions is included; add a theme title on the first game slide, all questions, and all answers. No typos.

Update the director when your parts are complete.`,
    [["Presentation Slides Master Template", pres("1fM9jBs_5lwRz1rVDWFAI_lmbYkuu9ANEVAK0q_-Vgdo")], ["Brochure Slides Master Template", pres("1_llRCIwFzXT0LnuEBg5drVo6fZUsKIONiDFg1e56G_A")], ["Presentation example", pres("1ZodqCpzXfwg8iQ1zzsCaLrI9gvOry-hhaHx6fn4C3_Y")], ["Brochure example", pres("1uPyC37CLgJyZMkvfvEX6r3_hbwV9aDtfgm4WxfYyKc0")]],
    [{ title: "Links to your presentation and brochure decks", description: "Paste share links (edit access for the board) to both decks.", submissionType: "TEXT" }]);
  const m3 = await M(4, "Week 3: full run-through recording and final edits", "Rehearse as a group, record it, get feedback, make final edits.",
`## By Sunday at midnight (Week 3)
- Finish your individual presentation, brochure, and Jeopardy slides.
- **The whole group meets to review the content and practice the full presentation at least once and records it** (pretend it's the real thing; it is reviewed with MMHS and the board). Upload the recording to YouTube as **Unlisted** and submit the link below.
- Expect detailed feedback on slides, brochure content, Jeopardy, and oral delivery by Monday night.

## Final week
- Complete final edits based on board and MMHS feedback by Sunday at midnight so brochures can be printed.
- Rehearse as if you're presenting at the shelter; you'll facilitate without relying on notes.`,
    [],
    [{ title: "Recorded practice run (unlisted YouTube link)", description: "One submission per group is enough, but everyone should confirm completion with the director.", submissionType: "VIDEO_LINK" }]);
  await M(5, "Session day", "Rides, what to bring, and how the evening runs.",
`## Day of
- By 1 pm: find a ride (message the director if you can't).
- By 6 pm: arrive at the Mid-Maine Homeless Shelter and wait outside for everyone to gather. We chat briefly, then carry things inside.
- The director opens with the attention-grabber; you facilitate your sub-topic; Jeopardy; brochures; stay to chat.
- Count participants (number only, never names). Photos of volunteers only.

## Afterwards
- Log your hours under **Hours** (session + prep).
- Fill in the post-session survey when it is sent.
- Certificates follow at the end of the semester.`,
    [["Same-Day Prep Checklist (Drive)", doc("1N-Df2GD_E_zBu2lGDafey1cUyNuF38uF6f8OriSx_NQ")]]);
  // Quiz on module 0
  const quiz = await db.quiz.create({ data: { moduleId: m0.id, title: "Program basics", description: "Five quick questions on the mission and how sessions work.", passPercent: 80, order: 0 } });
  const Q = (order: number, prompt: string, options: string[], correctIndex: number, explanation: string) => db.quizQuestion.create({ data: { quizId: quiz.id, order, prompt, options: JSON.stringify(options), correctIndex, explanation } });
  await Q(0, "What is the style of a CCHP formal session?", ["A lecture with slides", "A conversation led with questions, plus activities and Jeopardy", "A silent handout drop-off", "A Q&A with doctors"], 1, "Volunteers facilitate a conversation: ask first, then share key information.");
  await Q(1, "Where do CCHP sessions take place?", ["Colby's Pulver Pavilion", "Mid-Maine Homeless Shelter in Waterville", "Waterville Public Library", "Online"], 1, "Every formal and informal session is at MMHS.");
  await Q(2, "Which of these is part of the mission?", ["Reduce stigma on both sides through conversation", "Diagnose residents' health problems", "Collect residents' personal data", "Recruit residents to Colby"], 0, "We are not experts and never collect resident information; we build understanding.");
  await Q(3, "What should you do with your practice run recording?", ["Email the video file to the board", "Upload to YouTube as Unlisted and submit the link", "Post it publicly on Instagram", "Keep it; nobody reviews it"], 1, "Unlisted YouTube links are the only way video is shared on the platform.");
  await Q(4, "Photos at a session may include…", ["Residents, with their permission", "Residents and volunteers", "Volunteers only", "Nobody"], 2, "Never photograph residents.");
  void m1; void m2; void m3;
  console.log("Course: 5 modules, 1 quiz");

  // ── recruitment cycles (no applicant data imported) ──
  const RUBRIC = [["Understands the mission", "Shows they understand what CCHP does and why", 4], ["Passion", "Genuine motivation to engage with the shelter community", 4], ["Relevant skills / experience", "Public speaking, facilitation, teamwork, follow-through", 4]] as const;
  await db.recruitmentCycle.create({ data: {
    name: "FA26 Volunteer & Session Coordinator recruitment", type: "VOLUNTEER", slug: "fa26-volunteers", isOpen: false, closesAt: D(2026, 9, 12), videoReviewMode: "AFTER",
    description: "Fall 2026 volunteer recruitment (closed Sept 12, 2026; interviews Sept 24). Kept as the template for the next cycle — duplicate the questions and rubric.",
    questions: { create: [
      { order: 1, prompt: "Why do you want to participate in this program?", type: "LONG_TEXT" },
      { order: 2, prompt: "What experiences or skills do you have that would help you as a CCHP volunteer?", type: "LONG_TEXT" },
      { order: 3, prompt: "Describe a time when you led a discussion. How did you engage others?", type: "LONG_TEXT" },
      { order: 4, prompt: "Can you make a once-a-month commitment to attend sessions (Wednesdays 6–8 pm)?", type: "SHORT_TEXT" },
      { order: 5, prompt: "Which session dates can you attend? List all that apply.", type: "SHORT_TEXT" },
      { order: 6, prompt: "Returning volunteers: why do you want to return, and what have you learned since your last session?", type: "LONG_TEXT", required: false },
      { order: 7, prompt: "Is there a specific topic you'd like to take on this semester?", type: "SHORT_TEXT", required: false },
      { order: 8, prompt: "Do you have a car you could use for CCHP?", type: "SHORT_TEXT", required: false },
      { order: 9, prompt: "Optional: a 1–2 minute video introducing yourself (upload to YouTube as Unlisted and paste the link).", type: "VIDEO_LINK", required: false, helpText: "Unlisted means only people with the link can watch." },
    ] },
    criteria: { create: RUBRIC.map(([name, description, maxScore], i) => ({ name, description, maxScore, order: i + 1 })) },
  } });
  await db.recruitmentCycle.create({ data: {
    name: "SP27 Program Coordinator (leadership) applications", type: "LEADERSHIP", slug: "sp27-program-coordinator", isOpen: false, opensAt: D(2026, 11, 16), closesAt: D(2026, 12, 4), videoReviewMode: "AFTER",
    description: "Planned hire for the Program Coordinator role (shadows the Executive Director, steps up next year). Dates are placeholders from the May 2026 board decision ('applications due in the last few weeks of fall semester') — adjust before opening.",
    questions: { create: [
      { order: 1, prompt: "Why are you interested in this leadership position?", type: "LONG_TEXT" },
      { order: 2, prompt: "Are you a sophomore or junior, and can you commit to not studying abroad during the next two semesters?", type: "SHORT_TEXT" },
      { order: 3, prompt: "Describe your experience leading a team, managing time, and following up with people.", type: "LONG_TEXT" },
      { order: 4, prompt: "Describe any previous involvement with CCHP or similar community work.", type: "LONG_TEXT", required: false },
      { order: 5, prompt: "Optional: a 1–2 minute video introducing yourself (unlisted YouTube link).", type: "VIDEO_LINK", required: false },
    ] },
    criteria: { create: [...RUBRIC.map(([name, description, maxScore], i) => ({ name, description, maxScore, order: i + 1 })), { name: "Leadership & organization", description: "Evidence of leading others and staying organized", maxScore: 4, order: 4 }] },
  } });

  // ── survey aggregates → feedback inbox + annual report drafts ──
  const impactPath = process.env.IMPACT_JSON;
  type Resp = Record<string, string>;
  let responses: Resp[] = [];
  if (impactPath && fs.existsSync(impactPath)) {
    const sheets = JSON.parse(fs.readFileSync(impactPath, "utf8")) as Record<string, Resp[]>;
    const rows = sheets["Form Responses 1"] ?? []; responses = rows.slice(1);
  }
  const num = (v?: string) => (v && !isNaN(parseFloat(v)) ? parseFloat(v) : null);
  const mean = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x !== null); return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null; };
  const aggregate = (rs: Resp[]) => ({
    n: rs.length,
    helpfulForResidents: mean(rs.map((r) => num(r.G))), educational: mean(rs.map((r) => num(r.H))), challenging: mean(rs.map((r) => num(r.I))), rewarding: mean(rs.map((r) => num(r.J))),
    growthCommunication: mean(rs.map((r) => num(r.Q))), growthEmpathy: mean(rs.map((r) => num(r.R))), growthBigPicture: mean(rs.map((r) => num(r.S))), growthTeamwork: mean(rs.map((r) => num(r.T))),
    wouldVolunteerAgain: rs.filter((r) => (r.W ?? "").startsWith("Yes")).length,
    strengthenedInterest: rs.filter((r) => (r.U ?? "").startsWith("Yes")).length,
  });
  const by2425 = responses.filter((r) => /April 9th|May 7th/.test(r.E ?? ""));
  const by2526 = responses.filter((r) => /October|November|December|March|April 8th/.test(r.E ?? ""));
  const a1 = aggregate(by2425), a2 = aggregate(by2526);
  const aggText = (a: ReturnType<typeof aggregate>) => a.n === 0 ? "_No survey responses on file._" :
`Volunteer post-session survey (${a.n} responses, 1–5 scale): helpful for residents' well-being **${a.helpfulForResidents}**, educational **${a.educational}**, rewarding in building connections **${a.rewarding}**, challenging **${a.challenging}**. Growth in communicating across backgrounds **${a.growthCommunication}**, empathy **${a.growthEmpathy}**, understanding bigger issues **${a.growthBigPicture}**, teamwork **${a.growthTeamwork}**. ${a.wouldVolunteerAgain}/${a.n} would volunteer again; ${a.strengthenedInterest}/${a.n} said the session strengthened their interest in serving the community.`;
  // suggestions → feedback inbox (anonymous)
  const suggestions = responses.map((r) => r.V).filter((v) => v && v.length > 25 && !/^n\/?a$/i.test(v));
  for (const body of suggestions.slice(0, 12)) await db.feedbackItem.create({ data: { anonymous: true, category: "IDEA", body: `${body}\n\n(From the SP25–SP26 volunteer impact survey.)`, status: "NEW" } });

  const quotes = (rs: Resp[]) => rs.map((r) => r.X).filter((x) => x && x.length > 40 && x.length < 260).slice(0, 4).map((text) => ({ text, attribution: "Volunteer, post-session survey" }));
  const s2425 = SESSIONS.filter((s) => ayFor(s.date) === 2024), s2526 = SESSIONS.filter((s) => ayFor(s.date) === 2025);
  const list = (ss: S[]) => ss.map((s) => `- ${s.date.toISOString().slice(0, 10)} — ${s.topic ?? "topic not recorded"}${s.residents ? ` (${s.residents} residents)` : ""}`).join("\n");
  await db.annualReport.create({ data: { year: 2024, title: "CCHP Annual Report 2024–25", status: "DRAFT",
    summary: "The year record keeping began: three documented clinics in spring 2025 on safe injection practices, coping and self-care, and medications and substance use, plus three fall sessions whose details were not recorded.",
    narrative: `## Sessions\n${list(s2425)}\n\n## What volunteers told us\n${aggText(a1)}\n\n## Notes\nRecord keeping was implemented in spring 2025 when Matthew Herrick became Executive Director; fall 2024 sessions have names only. Edit this draft, add the narrative, then publish.`,
    highlights: JSON.stringify(["Record keeping started (spring 2025)", "Three documented clinics with 10–15 residents each", "Post-session survey launched"]), quotes: JSON.stringify(quotes(by2425)) } });
  await db.annualReport.create({ data: { year: 2025, title: "CCHP Annual Report 2025–26", status: "DRAFT",
    summary: "Six formal sessions with a new 3-week prep cycle on Moodle, two session dates requested by shelter staff, a first informal-session role, and the MYAN facilitation partnership agreed for 2026–27.",
    narrative: `## Sessions\n${list(s2526)}\n\n## What volunteers told us\n${aggText(a2)}\n\n## Themes from the open answers\n- Volunteers want more unstructured time with residents (informal sessions, visiting before the formal session).\n- Presentations can run long; shorten to ~3 questions per volunteer and weave Jeopardy into the discussion.\n- Match snacks to the topic (the nutrition session's sugary snacks were noticed by residents).\n- Include a resource list residents can use afterwards.\n\n## Looking ahead (2026–27)\nMYAN facilitation training for all volunteers; a cohort of 12 volunteers doing 2 sessions each; a Program Coordinator to be hired for succession; topics requested by MMHS: MaineCare enrollment, managing chronic conditions, building a routine.`,
    highlights: JSON.stringify(["Six formal sessions, 10–17 residents each", "Prep cycle on Moodle raised preparation to 37–51 hours per group", "Topics requested by shelter staff: healthy relationships, hygiene", "MYAN training partnership agreed"]), quotes: JSON.stringify(quotes(by2526)) } });

  // ── site content ──
  const mission = "The Colby Community Health Program (CCHP) connects Colby College student volunteers with underserved communities in the Waterville area to provide free, accessible health and wellness education through real conversations and mutual understanding. We create a welcoming space where community members can learn, ask questions, and share their own experiences, while developing volunteers who are health-literate, empathetic, and prepared to make a meaningful difference.";
  await db.siteSetting.upsert({ where: { key: "mission" }, create: { key: "mission", value: mission }, update: { value: mission } });
  for (const [key, value] of Object.entries({
    "home.mission.body": mission,
    "home.hero.subtitle": "A student-led public health initiative at Colby College. Each semester we partner with the Mid-Maine Homeless Shelter to host interactive wellness sessions on topics like stress, sleep, nutrition, and substance use.",
    "team.volunteers.note": "Volunteers who chose to be listed, with their total hours. Everyone else is thanked privately.",
  })) await db.contentBlock.upsert({ where: { key }, create: { key, value, updatedById: matt }, update: { value } });

  await db.siteSetting.upsert({ where: { key: "import.drive.v1" }, create: { key: "import.drive.v1", value: new Date().toISOString() }, update: { value: new Date().toISOString() } });
  fs.writeFileSync("scripts/.import-temp-passwords.json", JSON.stringify(tempPasswords, null, 2));
  console.log(`Temporary passwords for ${Object.keys(tempPasswords).length} active accounts written to scripts/.import-temp-passwords.json (gitignored). Share them in person, then delete the file.`);
  console.log("Import complete.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
