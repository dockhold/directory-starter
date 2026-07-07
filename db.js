const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

// Dockhold injects DATABASE_URL when the managed database add-on is enabled.
// Read it from the environment, never hardcode a connection string.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Schema for a browsable directory. The database is empty when first
// provisioned, so the app owns its schema. CREATE ... IF NOT EXISTS makes this
// safe to run on every boot.
async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS entries (
      id          SERIAL PRIMARY KEY,
      slug        TEXT UNIQUE NOT NULL,
      name        TEXT NOT NULL,
      tagline     TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      url         TEXT NOT NULL DEFAULT '',
      category    TEXT NOT NULL DEFAULT 'Uncategorized',
      pricing     TEXT NOT NULL DEFAULT '',
      tags        TEXT[] NOT NULL DEFAULT '{}',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  // A trigram index keeps the search fast as the directory grows. The extension
  // ships with the managed database; if it can't be created we fall back to a
  // plain scan (fine for the seed set, and imports still work).
  try {
    await pool.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");
    await pool.query(
      "CREATE INDEX IF NOT EXISTS entries_name_trgm ON entries USING gin (name gin_trgm_ops)"
    );
  } catch (err) {
    console.warn("pg_trgm index skipped:", err.message);
  }
}

// Seed the directory from data/entries.json, but ONLY when it's empty. This is
// what makes a fresh deploy come up populated with zero input, the wow moment.
// A later import (see recipes/import-your-data.md) loads your own, bigger data.
async function seedIfEmpty() {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM entries");
  if (rows[0].n > 0) return { seeded: 0, alreadyPopulated: true };

  const file = path.join(__dirname, "data", "entries.json");
  const entries = JSON.parse(fs.readFileSync(file, "utf8"));

  // One multi-row INSERT inside a transaction. Parameterized, the seed file is
  // ours, but treating it as untrusted input keeps the pattern honest.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const e of entries) {
      await client.query(
        `INSERT INTO entries (slug, name, tagline, description, url, category, pricing, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (slug) DO NOTHING`,
        [
          e.slug,
          e.name,
          e.tagline || "",
          e.description || "",
          e.url || "",
          e.category || "Uncategorized",
          e.pricing || "",
          Array.isArray(e.tags) ? e.tags : [],
        ]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  return { seeded: entries.length, alreadyPopulated: false };
}

// Postgres may not accept connections the instant the app boots on a first
// deploy (it's starting alongside the app). Retry a few times so we come up
// clean instead of crash-looping once. DB readiness is the app's job.
async function initWithRetry({ attempts = 12, delayMs = 2500 } = {}) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await initSchema();
      const result = await seedIfEmpty();
      return result;
    } catch (err) {
      const last = i === attempts;
      console.warn(
        `database not ready (attempt ${i}/${attempts}): ${err.message}` +
          (last ? "" : ", retrying")
      );
      if (last) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

module.exports = { pool, initWithRetry };
