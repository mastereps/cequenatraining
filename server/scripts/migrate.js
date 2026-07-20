import "../loadEnv.js";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pkg from "pg";

const { Client } = pkg;

const MIGRATIONS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "migrations",
);

// Shared by every migrate run so two deploys can never apply migrations at the
// same time, even if one is triggered by hand while CI is mid-deploy.
const LOCK_KEY = 4472026;

const listMigrationFiles = async () => {
  const entries = await readdir(MIGRATIONS_DIR);
  return entries.filter((name) => name.endsWith(".sql")).sort();
};

// Migration files carry their own BEGIN/COMMIT. Strip that outer pair so the
// runner can apply the file and record it in one transaction - otherwise a
// crash between COMMIT and the bookkeeping INSERT would re-run the migration.
// Anchored to the start/end of the file, so BEGIN inside a PL/pgSQL body or a
// DO block is left alone.
const stripOuterTransaction = (sql) =>
  sql.replace(/^\s*BEGIN\s*;/i, "").replace(/COMMIT\s*;\s*$/i, "");

const relationExists = async (client, name) => {
  const { rows } = await client.query("SELECT to_regclass($1) AS oid", [`public.${name}`]);
  return rows[0].oid !== null;
};

const appliedSet = async (client) => {
  const { rows } = await client.query("SELECT filename FROM public.schema_migrations");
  return new Set(rows.map((row) => row.filename));
};

const migrate = async (client) => {
  const applied = await appliedSet(client);
  const pending = (await listMigrationFiles()).filter((name) => !applied.has(name));

  if (pending.length === 0) {
    console.log("[migrate] nothing to apply");
    return;
  }

  for (const filename of pending) {
    const sql = stripOuterTransaction(
      await readFile(path.join(MIGRATIONS_DIR, filename), "utf8"),
    );
    console.log(`[migrate] applying ${filename}`);
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO public.schema_migrations (filename) VALUES ($1)", [
        filename,
      ]);
      await client.query("COMMIT");
      console.log(`[migrate] applied  ${filename}`);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(`[migrate] FAILED   ${filename}: ${error.message}`);
      throw error;
    }
  }
};

// Records migrations as applied WITHOUT running them, for a database whose
// schema was built by hand before this runner existed.
const baseline = async (client, upTo) => {
  if (!upTo) {
    throw new Error("baseline requires a filename, e.g. baseline 20260411_add_language_webinars.sql");
  }
  const files = await listMigrationFiles();
  if (!files.includes(upTo)) {
    throw new Error(`no such migration: ${upTo}`);
  }
  const marked = files.filter((name) => name <= upTo);
  for (const filename of marked) {
    await client.query(
      "INSERT INTO public.schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING",
      [filename],
    );
    console.log(`[migrate] baselined ${filename}`);
  }
  console.log(`[migrate] ${marked.length} migration(s) marked as already applied`);
};

const main = async () => {
  const [command, argument] = process.argv.slice(2);

  const client = new Client({
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    port: Number(process.env.PGPORT || 5432),
  });

  await client.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);

    const hadTracking = await relationExists(client, "schema_migrations");
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    if (command === "baseline") {
      await baseline(client, argument);
      return;
    }

    // Refuse to touch a database that predates this runner. Without tracking
    // rows every migration looks pending, and re-applying them would overwrite
    // live data. A genuinely empty database has no `webinars` table and is
    // migrated from scratch normally.
    if (!hadTracking && (await relationExists(client, "webinars"))) {
      throw new Error(
        "schema_migrations was missing on an existing database. Run the baseline " +
          "command once to record which migrations are already applied, then retry.",
      );
    }

    await migrate(client);
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]).catch(() => {});
    await client.end();
  }
};

main().catch((error) => {
  console.error(`[migrate] ${error.message}`);
  process.exit(1);
});
