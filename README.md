# Directory starter

Launch your own browsable, searchable directory in one click. It ships with ~50
real AI and developer tools as starter data, so the moment it deploys it's a live
site, not an empty shell. Swap in your own data whenever you're ready.

Backed by [Dockhold](https://dockhold.eu)'s managed database: enable the database
add-on and Dockhold injects `DATABASE_URL`. The app creates its schema and seeds
itself on first boot.

[![Deploy on Dockhold](https://dockhold.eu/button.svg)](https://app.dockhold.eu/new?repo=https://github.com/dockhold/directory-starter&name=directory-starter&ref=button)

## Deploy it

1. Click **Use this template** (or fork this repo).
2. [Deploy it](https://app.dockhold.eu/new?repo=https://github.com/dockhold/directory-starter),
   and **check "Add a managed database"** so `DATABASE_URL` is injected.
3. It goes live at `https://<your-app>.dockhold.app`, already populated. Data
   persists across restarts and deploys, because it lives in the database, not
   the container filesystem.

## Deploy with your AI tool

Install the Dockhold plugin or MCP server in your AI coding tool
([setup guide](https://dockhold.eu/docs/recipes/deploy-from-your-ai-tool)), then
say "put this online" in a folder with this template. The tool signs you in
through the browser once and reports the URL when the app is live.

Or from a terminal: `npx dockhold login`, then `npx dockhold deploy --db` (the `--db` adds the managed database this template needs).

## Make it yours

The starter data is a placeholder. Load your own with a one-time database import,
no re-deploy needed:

- Bring a spreadsheet: turn a CSV into an importable dump with
  [`scripts/csv-to-dump.js`](scripts/csv-to-dump.js).
- Migrating from Railway, Render, or Supabase: `pg_dump` your existing table and
  import it, history intact.

Full walkthrough: [recipes/import-your-data.md](recipes/import-your-data.md).

## Routes

| Route | Description |
|-------|-------------|
| `GET /` | Browse the directory; `?q=` searches, `?category=` filters |
| `GET /e/:slug` | One entry's detail page |
| `GET /api/entries` | The whole directory as JSON |
| `GET /health` | Health check |

## How it works

- `DATABASE_URL` is read from the environment ([`db.js`](db.js)). The schema is
  created with `CREATE TABLE IF NOT EXISTS` and seeded from
  [`data/entries.json`](data/entries.json) only when the table is empty, so a
  re-deploy never duplicates or wipes your data.
- The directory is **read-only** to visitors (no write endpoints, so no form to
  abuse). You change the data by importing, not by posting.
- All queries are **parameterized**, and every value rendered into a page is
  **HTML-escaped** ([`views.js`](views.js)), so imported content can't inject
  markup. Requests are rate-limited per IP.
- On a first deploy the database may still be starting, so the app **retries the
  connection** a few times instead of crash-looping.

Dockhold builds the included [`Dockerfile`](Dockerfile). There's nothing to
change in it, and it deploys on any plan.

## Grow into connected services

This is one app plus one database, the simplest thing that deploys. When you
outgrow it, split a piece out (say a separate search or ingestion service in its
own repo) and wire the two together by URL with Dockhold's connected services.

The [`fullstack-web`](https://github.com/dockhold/fullstack-web) +
[`fullstack-api`](https://github.com/dockhold/fullstack-api) pair is a live
example of two repos deployed together and linked automatically. In the
dashboard, that's **New App → Connect services**.

## Run it locally

```bash
npm install
export DATABASE_URL="postgres://user:pass@localhost:5432/directory"
npm start
# open http://localhost:3000
```

You need a local Postgres for the `DATABASE_URL`. On Dockhold you don't: the
managed database add-on provides it.

## License

MIT. See [LICENSE](LICENSE).
