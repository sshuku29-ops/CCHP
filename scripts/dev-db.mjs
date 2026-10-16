// Local development database: a self-contained Postgres started from node_modules
// (embedded-postgres), so dev matches Supabase/Postgres in production.
// Usage: node scripts/dev-db.mjs start | stop | init
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";

const dataDir = new URL("../.pgdata/", import.meta.url).pathname;
const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "cchp",
  password: "cchp",
  port: 54329,
  persistent: true,
  onLog: () => {},
  onError: (e) => console.error(String(e)),
});

const cmd = process.argv[2] ?? "start";
if (cmd === "init" || (cmd === "start" && !existsSync(dataDir + "PG_VERSION"))) {
  console.log("Initializing local Postgres in .pgdata …");
  await pg.initialise();
}
if (cmd === "init") process.exit(0);
if (cmd === "stop") {
  await pg.stop();
  console.log("Stopped.");
  process.exit(0);
}
await pg.start();
try {
  await pg.createDatabase("cchp");
} catch {
  /* already exists */
}
console.log("Local Postgres running on port 54329 (db: cchp, user: cchp). Press Ctrl+C to stop.");
process.on("SIGINT", async () => { await pg.stop(); process.exit(0); });
process.on("SIGTERM", async () => { await pg.stop(); process.exit(0); });
setInterval(() => {}, 1 << 30);
