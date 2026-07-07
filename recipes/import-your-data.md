# Recipe: load your own data with a one-time database import

Your deployed directory comes up populated with a starter set of ~50 tools. When
you're ready to make it *yours*, replace or extend that with your own data using
Dockhold's one-time database import. No re-deploy, no code change.

The import takes a plain-SQL dump and restores it into your app's managed
database. This recipe turns a spreadsheet into that dump.

## What you need

- The directory deployed **with a managed database** (so it has a database to
  import into).
- Your data as a CSV with a header row. Columns: `name,tagline,description,url,category,pricing,tags`
  (only `name` is required; `tags` is pipe-separated, e.g. `cli|open-source`).
  There's a ready example at [`data/sample-import.csv`](../data/sample-import.csv).

## 1. Turn your CSV into a dump

```bash
node scripts/csv-to-dump.js data/sample-import.csv > my-directory.sql
```

That writes `my-directory.sql`. Open it if you're curious, it's a `CREATE TABLE
IF NOT EXISTS` plus one `INSERT … ON CONFLICT (slug) DO UPDATE` per row. The
upsert means importing is **safe to repeat** and safe to run over the starter
data: matching rows update, new rows are added, nothing aborts on a duplicate.

Already have a real Postgres directory elsewhere (Railway, Render, Supabase)?
Skip the script and bring your history straight over:

```bash
pg_dump --no-owner --no-privileges --table=entries "$OLD_DATABASE_URL" > my-directory.sql
```

## 2. Import it

1. Open your app in the [Dockhold dashboard](https://app.dockhold.eu).
2. Go to the **Database** tab.
3. Under **Import**, upload `my-directory.sql` and start it.
4. Watch the status go **pending → running → succeeded**. The overview then shows
   the `entries` table with your row count.

Refresh your site. Your data is live.

## Notes

- The import is **all-or-nothing**: if any statement fails, the whole import
  rolls back and your current data is untouched. Fix the reported error and
  re-run.
- Dumps up to **100 MB** are accepted. That's hundreds of thousands of directory
  rows, far more than you'll seed by hand.
- Want a fresh start instead of merging? Add `TRUNCATE entries;` as the first
  line of the SQL file before importing.
