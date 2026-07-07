// Server-rendered HTML for the directory. Every value that comes out of the
// database is passed through esc() before it reaches the page, the seed data
// is ours, but an imported dataset is untrusted, so we escape unconditionally
// to keep stored content from becoming stored HTML/script.

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const STYLES = `
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: #0b0d10; color: #e6e8eb; line-height: 1.5;
  }
  a { color: inherit; text-decoration: none; }
  .wrap { max-width: 960px; margin: 0 auto; padding: 0 20px; }
  header.site { border-bottom: 1px solid #1e242b; padding: 28px 0 22px; }
  header.site h1 { margin: 0 0 4px; font-size: 22px; letter-spacing: -0.01em; }
  header.site p { margin: 0; color: #9aa4af; font-size: 14px; }
  form.search { display: flex; gap: 8px; margin: 20px 0 8px; }
  form.search input {
    flex: 1; padding: 11px 14px; border-radius: 10px; border: 1px solid #2a323b;
    background: #12161b; color: #e6e8eb; font-size: 15px;
  }
  form.search button {
    padding: 11px 18px; border-radius: 10px; border: 0; cursor: pointer;
    background: #2563eb; color: #fff; font-weight: 600; font-size: 15px;
  }
  nav.cats { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 4px; }
  nav.cats a {
    font-size: 13px; padding: 6px 12px; border-radius: 999px;
    border: 1px solid #2a323b; color: #c3cad2;
  }
  nav.cats a.active { background: #1b2330; border-color: #2f5ad6; color: #fff; }
  .meta { color: #7d8894; font-size: 13px; margin: 18px 0 10px; }
  .grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
  .card {
    border: 1px solid #1e242b; border-radius: 14px; padding: 16px; background: #101419;
    transition: border-color .15s ease;
  }
  .card:hover { border-color: #33404d; }
  .card h3 { margin: 0 0 4px; font-size: 16px; }
  .card .tl { color: #aeb7c1; font-size: 14px; margin: 0 0 12px; }
  .badges { display: flex; flex-wrap: wrap; gap: 6px; }
  .badge {
    font-size: 11px; padding: 3px 8px; border-radius: 6px;
    background: #171d24; color: #9aa4af; border: 1px solid #232b33;
  }
  .badge.cat { color: #86b3ff; }
  .detail { padding: 28px 0 40px; }
  .detail h2 { margin: 0 0 6px; font-size: 26px; letter-spacing: -0.02em; }
  .detail .tl { color: #aeb7c1; font-size: 17px; margin: 0 0 18px; }
  .detail p.desc { font-size: 16px; color: #d3d9df; max-width: 62ch; }
  .detail a.visit {
    display: inline-block; margin-top: 18px; padding: 10px 18px; border-radius: 10px;
    background: #2563eb; color: #fff; font-weight: 600;
  }
  .back { display: inline-block; margin: 24px 0 0; color: #86b3ff; font-size: 14px; }
  .empty { padding: 40px 0; color: #9aa4af; text-align: center; }
  footer.site {
    border-top: 1px solid #1e242b; margin-top: 40px; padding: 22px 0 40px;
    color: #7d8894; font-size: 13px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;
  }
  footer.site a { color: #86b3ff; }
`;

function layout({ title, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="wrap">${body}</div>
  <div class="wrap">
    <footer class="site">
      <span>A directory template you can deploy in one click.</span>
      <span>Hosted on <a href="https://dockhold.eu">Dockhold</a></span>
    </footer>
  </div>
</body>
</html>`;
}

function card(e) {
  return `<a class="card" href="/e/${esc(e.slug)}">
    <h3>${esc(e.name)}</h3>
    <p class="tl">${esc(e.tagline)}</p>
    <div class="badges">
      <span class="badge cat">${esc(e.category)}</span>
      ${e.pricing ? `<span class="badge">${esc(e.pricing)}</span>` : ""}
    </div>
  </a>`;
}

function categoryNav(categories, active) {
  const all = `<a href="/" class="${active ? "" : "active"}">All</a>`;
  const rest = categories
    .map((c) => {
      const cls = active === c ? "active" : "";
      return `<a href="/?category=${encodeURIComponent(c)}" class="${cls}">${esc(c)}</a>`;
    })
    .join("");
  return `<nav class="cats">${all}${rest}</nav>`;
}

function homePage({ entries, categories, q, category, total }) {
  const searchVal = q ? ` value="${esc(q)}"` : "";
  const heading = category
    ? `${entries.length} in ${esc(category)}`
    : q
    ? `${entries.length} result${entries.length === 1 ? "" : "s"} for “${esc(q)}”`
    : `${total} tools in the directory`;

  const list = entries.length
    ? `<div class="grid">${entries.map(card).join("")}</div>`
    : `<div class="empty">Nothing found. Try another search, or clear the filter.</div>`;

  const body = `
    <header class="site">
      <h1>The AI &amp; Developer Tools Directory</h1>
      <p>A browsable, searchable directory. Deploy your own copy and load your data.</p>
    </header>
    <form class="search" method="get" action="/">
      <input name="q" placeholder="Search tools, taglines, tags…"${searchVal} autocomplete="off" />
      <button type="submit">Search</button>
    </form>
    ${categoryNav(categories, category)}
    <p class="meta">${heading}</p>
    ${list}
  `;
  return layout({ title: "AI & Developer Tools Directory", body });
}

function detailPage(e) {
  const tags = (e.tags || [])
    .map((t) => `<span class="badge">${esc(t)}</span>`)
    .join("");
  const body = `
    <div class="detail">
      <a class="back" href="/">← Back to the directory</a>
      <div style="height:14px"></div>
      <h2>${esc(e.name)}</h2>
      <p class="tl">${esc(e.tagline)}</p>
      <div class="badges">
        <span class="badge cat">${esc(e.category)}</span>
        ${e.pricing ? `<span class="badge">${esc(e.pricing)}</span>` : ""}
        ${tags}
      </div>
      <p class="desc" style="margin-top:18px">${esc(e.description)}</p>
      ${e.url ? `<a class="visit" href="${esc(e.url)}" rel="noopener nofollow" target="_blank">Visit ${esc(e.name)} →</a>` : ""}
    </div>
  `;
  return layout({ title: `${e.name} · Directory`, body });
}

function notFoundPage() {
  const body = `
    <div class="detail">
      <h2>Not found</h2>
      <p class="tl">That entry doesn't exist (or hasn't been imported yet).</p>
      <a class="back" href="/">← Back to the directory</a>
    </div>`;
  return layout({ title: "Not found", body });
}

module.exports = { esc, layout, homePage, detailPage, notFoundPage };
