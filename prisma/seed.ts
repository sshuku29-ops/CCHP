/**
 * Seed script. Run with `npm run db:seed`.
 * - Creates the first Main Admin from ADMIN_USERNAME / ADMIN_PASSWORD env vars
 *   (forced to change password on first login). Idempotent.
 * - Seeds site settings, community partners, leadership handoff docs, and
 *   the default training course if they do not exist.
 * - With SEED_DEMO=1 also creates demo volunteers, goals, tasks, sessions,
 *   hours, and a recruitment cycle so the UI is populated for development.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const LEADERSHIP_ROLES = [
  "Executive Director",
  "Executive Assistant (Vice Chair)",
  "Formal Sessions Director",
  "Informal Sessions Director",
  "Educational Content & Media Director",
  "Systems & Data Management Director",
];

function termFor(d: Date) {
  const m = d.getMonth();
  const y = d.getFullYear();
  if (m >= 7) return `Fall ${y}`;
  if (m <= 4) return `Spring ${y}`;
  return `Summer ${y}`;
}
function ayFor(d: Date) {
  return d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
}

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.log("ADMIN_USERNAME/ADMIN_PASSWORD not set — skipping admin seed.");
    return null;
  }
  const existing = await db.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`Admin "${username}" already exists — leaving as is.`);
    return existing;
  }
  const admin = await db.user.create({
    data: {
      username,
      email: process.env.ADMIN_EMAIL || null,
      passwordHash: await bcrypt.hash(password, 12),
      role: "MAIN_ADMIN",
      firstName: "CCHP",
      lastName: "Admin",
      mustChangePassword: true,
    },
  });
  console.log(`Created Main Admin "${username}" (must change password on first login).`);
  return admin;
}

async function seedSettings() {
  const defaults: Record<string, string> = {
    mission:
      "CCHP provides free, accessible health and wellness education for underserved members of the Waterville community, delivered through real conversations at the Mid-Maine Homeless Shelter, while building volunteer skills in research, communication, and facilitation.",
    tagline: "Health education, one conversation at a time.",
    contact_email: "",
    instagram_url: "",
    hero_note:
      "A student-run program connecting Colby College volunteers with the Mid-Maine Homeless Shelter in Waterville, Maine.",
  };
  for (const [key, value] of Object.entries(defaults)) {
    await db.siteSetting.upsert({ where: { key }, create: { key, value }, update: {} });
  }
}

async function seedPartners() {
  if ((await db.communityPartner.count()) > 0) return;
  await db.communityPartner.createMany({
    data: [
      { name: "Mid-Maine Homeless Shelter (MMHS)", description: "Our host site in Waterville, where every formal and informal session takes place.", url: "https://www.shelterme.org", order: 1 },
      { name: "Maine Youth Action Network (MYAN)", description: "Supports youth-led community initiatives across Maine and advises on program design.", url: "https://myan.org", order: 2 },
      { name: "Colby Office of Civic Engagement and Community Partnership", description: "Connects Colby students with community organizations and supports CCHP's volunteers.", url: "https://www.colby.edu/civic-engagement/", order: 3 },
    ],
  });
}

async function seedHandoffDocs() {
  for (const roleTitle of LEADERSHIP_ROLES) {
    await db.handoffDoc.upsert({
      where: { roleTitle },
      create: {
        roleTitle,
        content: `# ${roleTitle} — handoff notes\n\n## What this role owns\n\n_(fill in)_\n\n## Recurring tasks\n\n- \n\n## Key contacts\n\n- \n\n## Email templates\n\n_(paste templates here)_\n\n## Advice for your successor\n\n`,
      },
      update: {},
    });
  }
}

async function seedCourse() {
  if ((await db.course.count()) > 0) return;
  const course = await db.course.create({
    data: {
      title: "Formal Session Volunteer Training",
      description:
        "The 3-week prep cycle every formal-session volunteer follows: research and outline, leadership feedback, slide decks, recorded practice run, then the live session.",
      isPublished: true,
      order: 1,
    },
  });
  const modules = [
    {
      title: "Week 1 — Research & topic outline",
      summary: "Pick your topic, research it from reliable sources, and draft a topic outline.",
      instructions:
        "1. Confirm your topic with the Formal Sessions Director.\n2. Research using reputable sources (CDC, NIH, MaineHealth, peer-reviewed articles).\n3. Draft a one-page topic outline: key points, discussion questions, activity ideas, and Jeopardy questions.\n4. Submit the outline below by the due date.",
      assignments: [{ title: "Topic outline", description: "Submit your outline as text or a small file.", submissionType: "ANY" }],
    },
    {
      title: "Week 2 — Feedback & slide decks",
      summary: "Incorporate leadership feedback and build the presentation and brochure decks.",
      instructions:
        "1. Read the feedback on your outline.\n2. Build the presentation deck (10–15 slides) and the brochure source deck.\n3. Keep language accessible (plain words, large type, no jargon).\n4. Submit links to both decks below.",
      assignments: [{ title: "Presentation + brochure decks", description: "Paste share links to both decks.", submissionType: "TEXT" }],
    },
    {
      title: "Week 3 — Practice run & live session",
      summary: "Record a practice run, get notes, then deliver the session at the shelter.",
      instructions:
        "1. Record a full practice run of your presentation.\n2. Upload it to YouTube as **Unlisted** and paste the link below.\n3. Review the facilitation checklist before the live session.\n4. After the session, log your hours.",
      assignments: [{ title: "Recorded practice run", description: "Unlisted YouTube link to your practice run.", submissionType: "VIDEO_LINK" }],
    },
  ];
  for (let i = 0; i < modules.length; i++) {
    const m = modules[i];
    await db.courseModule.create({
      data: {
        courseId: course.id,
        title: m.title,
        summary: m.summary,
        instructions: m.instructions,
        order: i + 1,
        assignments: { create: m.assignments.map((a, j) => ({ ...a, order: j + 1 })) },
      },
    });
  }
}

async function seedDemo(adminId: string | null) {
  if (process.env.SEED_DEMO !== "1") return;
  if ((await db.user.count()) > 1) {
    console.log("Demo data appears to exist — skipping.");
    return;
  }
  const pw = await bcrypt.hash("demo-password-123", 12);
  const mk = (u: string, f: string, l: string, role: string, extra: Record<string, unknown> = {}) =>
    db.user.create({ data: { username: u, firstName: f, lastName: l, role, passwordHash: pw, email: `${u}@example.org`, ...extra } });
  const leads = [
    await mk("jordan", "Jordan", "Lee", "ADMIN", { leadershipTitle: "Executive Director", showOnPublicSite: true, bio: "Class of 2026. Biology major interested in public health." }),
    await mk("sam", "Sam", "Rivera", "ADMIN", { leadershipTitle: "Formal Sessions Director", showOnPublicSite: true, bio: "Class of 2027. Runs the three-week prep cycle." }),
    await mk("priya", "Priya", "Natarajan", "ADMIN", { leadershipTitle: "Systems & Data Management Director", showOnPublicSite: true, bio: "Class of 2026. Keeps the data honest." }),
  ];
  const vols = [];
  const names = [["avery", "Avery", "Chen"], ["morgan", "Morgan", "Patel"], ["riley", "Riley", "Okafor"], ["casey", "Casey", "Nguyen"], ["taylor", "Taylor", "Brooks"], ["drew", "Drew", "Hassan"]];
  for (const [u, f, l] of names) vols.push(await mk(u, f, l, "VOLUNTEER", { publicHoursOptIn: u !== "drew", graduationDate: new Date(Date.UTC(2027, 4, 20)), hasVehicle: u === "avery" }));
  const everyone = [...leads, ...vols];

  const now = new Date();
  const goal = await db.goal.create({
    data: { title: "Run three formal sessions this semester", description: "Deliver three formal health education sessions at MMHS by the end of the term with at least 5 volunteers each.", term: termFor(now), year: ayFor(now), createdById: adminId ?? leads[0].id, targetDate: new Date(Date.UTC(now.getFullYear(), 11, 15)) },
  });
  const goal2 = await db.goal.create({
    data: { title: "Recruit and train 8 new volunteers", description: "Open applications in February, review anonymously, onboard by March.", term: termFor(now), year: ayFor(now), createdById: leads[0].id },
  });
  const p1 = await db.project.create({ data: { title: "November session: Sleep & stress", goalId: goal.id, ownerId: leads[1].id, status: "ACTIVE", dueDate: new Date(now.getTime() + 21 * 86400000), color: "#2563eb" } });
  const p2 = await db.project.create({ data: { title: "Spring recruitment", goalId: goal2.id, ownerId: leads[0].id, status: "ACTIVE", dueDate: new Date(now.getTime() + 60 * 86400000), color: "#16a34a" } });
  const p3 = await db.project.create({ data: { title: "Brochure refresh", goalId: goal.id, ownerId: leads[2].id, status: "ACTIVE", color: "#d97706" } });
  const tasks = [
    [p1.id, "Draft topic outline", "DONE", -10, [vols[0].id]],
    [p1.id, "Leadership feedback on outline", "DONE", -5, [leads[1].id]],
    [p1.id, "Build presentation deck", "IN_PROGRESS", 4, [vols[0].id, vols[1].id]],
    [p1.id, "Build brochure deck", "TODO", 6, [vols[2].id]],
    [p1.id, "Record practice run", "TODO", 12, [vols[0].id]],
    [p1.id, "Print brochures", "TODO", 18, []],
    [p2.id, "Write application questions", "IN_PROGRESS", 7, [leads[0].id]],
    [p2.id, "Set rubric criteria", "TODO", 9, [leads[0].id, leads[2].id]],
    [p2.id, "Post on MuleLife + Instagram", "BLOCKED", 14, []],
    [p3.id, "Audit old brochures for outdated info", "TODO", -2, [vols[3].id]],
    [p3.id, "New template in plain language", "TODO", 20, []],
  ] as const;
  for (const [projectId, title, status, dueOffset, assignees] of tasks) {
    await db.task.create({
      data: {
        projectId, title, status, needsOwner: assignees.length === 0,
        dueDate: new Date(now.getTime() + dueOffset * 86400000),
        completedAt: status === "DONE" ? new Date(now.getTime() + (dueOffset - 1) * 86400000) : null,
        createdById: leads[1].id,
        assignees: { create: assignees.map((userId) => ({ userId })) },
      },
    });
  }
  await db.waitingOn.createMany({
    data: [
      { contactName: "Shelter program coordinator", organization: "MMHS", whatSent: "Proposed spring session dates", channel: "email", sentAt: new Date(now.getTime() - 9 * 86400000), remindAfterDays: 7, ownerId: leads[0].id },
      { contactName: "MYAN outreach lead", organization: "MYAN", whatSent: "Request for facilitation training slot", channel: "email", sentAt: new Date(now.getTime() - 3 * 86400000), remindAfterDays: 10, ownerId: leads[2].id },
    ],
  });
  await db.feedbackItem.createMany({
    data: [
      { authorId: vols[1].id, category: "IDEA", body: "Could we add a short Jeopardy template so each group doesn't rebuild it from scratch?" },
      { anonymous: true, category: "ISSUE", body: "The practice-run deadline landed on a midterm week. Can we check the academic calendar when scheduling?" },
    ],
  });
  // Past sessions + hours
  const sessionDefs = [
    [-120, "FORMAL", "Nutrition on a budget", 14], [-95, "INFORMAL", "Game night", 9], [-80, "FORMAL", "Managing stress", 11],
    [-60, "INFORMAL", "Board games & coffee", 7], [-40, "FORMAL", "Sleep hygiene", 16], [-20, "INFORMAL", "Bingo afternoon", 12],
  ] as const;
  for (const [off, type, topic, count] of sessionDefs) {
    const date = new Date(now.getTime() + off * 86400000);
    const picks = vols.slice(0, type === "FORMAL" ? 5 : 3);
    const s = await db.sessionRecord.create({
      data: { date, type, topic, title: topic, participantCount: count, term: termFor(date), year: ayFor(date), location: "Mid-Maine Homeless Shelter", volunteers: { create: picks.map((v) => ({ userId: v.id })) },
        materials: type === "FORMAL" ? { create: [{ label: "Presentation slides", url: "https://docs.google.com/presentation/" }, { label: "Brochure", url: "https://docs.google.com/presentation/" }] } : undefined },
    });
    for (const v of picks) {
      await db.hoursLog.create({ data: { userId: v.id, date, hours: type === "FORMAL" ? 2 : 1.5, type: type === "FORMAL" ? "FORMAL_SESSION" : "INFORMAL_SESSION", sessionRecordId: s.id } });
      if (type === "FORMAL") await db.hoursLog.create({ data: { userId: v.id, date: new Date(date.getTime() - 7 * 86400000), hours: 3, type: "PREP", notes: "Research + slides" } });
    }
  }
  await db.sessionRecord.create({ data: { date: new Date(now.getTime() + 21 * 86400000), type: "FORMAL", topic: "Sleep & stress", title: "Sleep & stress", term: termFor(now), year: ayFor(now), location: "Mid-Maine Homeless Shelter" } });
  await db.calendarEvent.createMany({ data: [
    { title: "Weekly leadership roundtable", type: "MEETING", startsAt: new Date(now.getTime() + 2 * 86400000), location: "Pulver 2nd floor", createdById: leads[0].id },
    { title: "Applications open", type: "DEADLINE", startsAt: new Date(now.getTime() + 30 * 86400000), createdById: leads[0].id },
  ] });
  // Recruitment cycle
  const cycle = await db.recruitmentCycle.create({
    data: {
      name: `Volunteer applications — ${termFor(new Date(now.getTime() + 120 * 86400000))}`, type: "VOLUNTEER", slug: "volunteer", isOpen: true, videoReviewMode: "AFTER",
      description: "Join CCHP as a volunteer. Applications take about 15 minutes.",
      questions: { create: [
        { prompt: "Why do you want to volunteer with CCHP?", type: "LONG_TEXT", order: 1 },
        { prompt: "Describe a time you explained something complicated to someone in plain language.", type: "LONG_TEXT", order: 2 },
        { prompt: "What health or wellness topic would you most like to teach, and why?", type: "SHORT_TEXT", order: 3 },
        { prompt: "Record a 1–2 minute video introducing yourself. Upload it to YouTube as Unlisted and paste the link.", type: "VIDEO_LINK", order: 4, required: false, helpText: "Unlisted means only people with the link can see it." },
      ] },
      criteria: { create: [
        { name: "Motivation", description: "Genuine interest in the mission", maxScore: 5, order: 1 },
        { name: "Communication", description: "Clear, plain-language writing", maxScore: 5, order: 2 },
        { name: "Reliability", description: "Evidence of follow-through", maxScore: 5, order: 3 },
      ] },
    },
    include: { questions: true },
  });
  const applicants = [["Alex", "Kim"], ["Jamie", "Ortiz"], ["Robin", "Ward"], ["Sky", "Adebayo"]];
  for (const [f, l] of applicants) {
    await db.application.create({ data: {
      cycleId: cycle.id, firstName: f, lastName: l, email: `${f.toLowerCase()}.${l.toLowerCase()}@example.org`, affiliation: "Class of 2028",
      answers: { create: cycle.questions.filter((q) => q.type !== "VIDEO_LINK").map((q) => ({ questionId: q.id, text: `(${f}) Sample answer to: ${q.prompt}` })) },
    } });
  }
  await db.localResource.createMany({ data: [
    { name: "Maine 211", category: "General help", description: "Free, confidential help finding local services, 24/7.", phone: "211", url: "https://211maine.org", ownerId: leads[2].id, lastVerifiedAt: new Date(now.getTime() - 20 * 86400000), order: 1 },
    { name: "Maine Crisis Line", category: "Mental health", description: "24/7 crisis support by phone or text.", phone: "1-888-568-1112", ownerId: leads[1].id, lastVerifiedAt: new Date(now.getTime() - 200 * 86400000), order: 2 },
    { name: "Waterville Area Soup Kitchen", category: "Food", description: "Hot meals; check current hours before visiting.", ownerId: leads[0].id, lastVerifiedAt: null, order: 3 },
  ] });
  await db.annualReport.create({ data: { year: ayFor(now) - 1, title: `CCHP Annual Report ${ayFor(now) - 1}–${String(ayFor(now)).slice(2)}`, status: "PUBLISHED", publishedAt: new Date(now.getTime() - 100 * 86400000), summary: "A year of growth: more sessions, more volunteers, and a new brochure library.", narrative: "## Highlights\n\nThis year CCHP ran formal sessions on nutrition, stress, and sleep, and expanded informal programming.\n\n## What we learned\n\nPlain language matters more than polish.", highlights: JSON.stringify(["Three formal sessions", "Six informal sessions", "Nine active volunteers"]), quotes: JSON.stringify([{ text: "I finally understood what my doctor meant about blood pressure.", attribution: "Session participant" }]), metricsSnapshot: JSON.stringify({ formalSessions: 3, informalSessions: 6, participants: 70, hours: 120, volunteers: 9, topics: ["Nutrition on a budget", "Managing stress", "Sleep hygiene"] }) } });
  console.log(`Demo data created for ${everyone.length} users (password: demo-password-123).`);
}

async function main() {
  const admin = await seedAdmin();
  await seedSettings();
  await seedPartners();
  await seedHandoffDocs();
  await seedCourse();
  await seedDemo(admin?.id ?? null);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
