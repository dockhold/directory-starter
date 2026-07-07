const express = require("express");
const { pool, initWithRetry } = require("./db");
const { homePage, detailPage, notFoundPage } = require("./views");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);

// A tiny per-IP rate limiter. The directory is read-only and public, so this
// just keeps a single client from hammering the database. In-memory is fine for
// one instance; it resets on restart.
const WINDOW_MS = 10_000;
const MAX_HITS = 60;
const hits = new Map();
setInterval(() => hits.clear(), WINDOW_MS).unref();
app.use((req, res, next) => {
  const ip = req.ip || "unknown";
  const n = (hits.get(ip) || 0) + 1;
  hits.set(ip, n);
  if (n > MAX_HITS) {
    res.status(429).type("text/plain").send("Too many requests. Slow down a moment.");
    return;
  }
  next();
});

// Health check, Dockhold and uptime probes hit this.
app.get("/health", (req, res) => res.json({ status: "healthy" }));

// Home: search (?q=) and/or category filter (?category=). All inputs are bound
// as query parameters, never interpolated into SQL.
app.get("/", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
    const category =
      typeof req.query.category === "string" ? req.query.category.trim().slice(0, 60) : "";

    const where = [];
    const params = [];
    if (q) {
      params.push(`%${q}%`);
      const p = `$${params.length}`;
      // Match name, tagline, description, or any tag.
      where.push(
        `(name ILIKE ${p} OR tagline ILIKE ${p} OR description ILIKE ${p} OR array_to_string(tags, ' ') ILIKE ${p})`
      );
    }
    if (category) {
      params.push(category);
      where.push(`category = $${params.length}`);
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [entriesRes, catsRes, totalRes] = await Promise.all([
      pool.query(
        `SELECT slug, name, tagline, category, pricing FROM entries ${clause}
         ORDER BY name ASC LIMIT 500`,
        params
      ),
      pool.query(`SELECT DISTINCT category FROM entries ORDER BY category ASC`),
      pool.query(`SELECT COUNT(*)::int AS n FROM entries`),
    ]);

    res.type("html").send(
      homePage({
        entries: entriesRes.rows,
        categories: catsRes.rows.map((r) => r.category),
        q,
        category,
        total: totalRes.rows[0].n,
      })
    );
  } catch (err) {
    next(err);
  }
});

// Entry detail by slug.
app.get("/e/:slug", async (req, res, next) => {
  try {
    const slug = String(req.params.slug).slice(0, 200);
    const { rows } = await pool.query(
      `SELECT slug, name, tagline, description, url, category, pricing, tags
       FROM entries WHERE slug = $1`,
      [slug]
    );
    if (rows.length === 0) {
      res.status(404).type("html").send(notFoundPage());
      return;
    }
    res.type("html").send(detailPage(rows[0]));
  } catch (err) {
    next(err);
  }
});

// A read-only JSON view, so the directory is also an API.
app.get("/api/entries", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT slug, name, tagline, description, url, category, pricing, tags
       FROM entries ORDER BY name ASC LIMIT 1000`
    );
    res.json({ count: rows.length, entries: rows });
  } catch (err) {
    next(err);
  }
});

// Error handler, never leak internals to the page.
app.use((err, req, res, next) => {
  console.error("request error:", err.message);
  res.status(500).type("text/plain").send("Something went wrong. Please try again.");
});

const PORT = process.env.PORT || 3000;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL is not set. Deploy this app with a managed database enabled " +
        "so Dockhold injects the connection string."
    );
  } else {
    const result = await initWithRetry();
    if (result && !result.alreadyPopulated) {
      console.log(`seeded ${result.seeded} directory entries on first boot`);
    }
  }
  app.listen(PORT, "0.0.0.0", () => console.log(`directory listening on :${PORT}`));
}

main().catch((err) => {
  console.error("fatal startup error:", err.message);
  process.exit(1);
});
