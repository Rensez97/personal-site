# personal-site

Rense van der Zee — personal site. A static site that doubles as a small demo of a
lightweight data stack: a daily `dlt → dbt → DuckDB` pipeline produces a Parquet
file, and the browser queries it in-place with DuckDB-WASM.

## Layout

| Path | What |
|------|------|
| `site/` | The static site — plain HTML/CSS/JS, no build step. `index.html`, `blog.html`, `more.html`. |
| `site/data/` | Pipeline output the page reads: `metrics.json` + `metrics.parquet`. Committed daily by CI. |
| — DuckDB-WASM | Loaded lazily from jsdelivr, pinned `@duckdb/duckdb-wasm@1.32.0` (in `site/index.html`). Not self-hosted: the eh wasm is ~34 MB, over Cloudflare Pages' 25 MiB/file limit. Falls back to `metrics.json` if the CDN is unreachable. |
| `pipeline/` | The dlt → dbt → DuckDB pipeline itself (see `pipeline/README.md`). |
| `.github/workflows/pipeline.yml` | The daily run: extract → model+test → export → commit. |
| `functions/` | The `/api/*` handlers: contact form → D1 + email, run-press counter. Imported by `worker/index.js`. |
| `worker/index.js` | The Worker entry point — serves `site/` as static assets, routes `/api/*` to `functions/`. |
| `workers/email-notify/` | Tiny Worker holding the `send_email` binding this one can't; called via service binding. |
| `local/` | Working material — photo originals, design exports, drafts, reference repos. Gitignored in full; see `local/README.md`. |

## Hosting

A **Cloudflare Worker with static assets** (`wrangler.toml`), custom domain via
Cloudflare DNS. `site/` is served straight from the edge; the Worker runs only
for `/api/*`. Deploy = `git push origin main` — the connected Git build runs
`wrangler deploy`. Git is the source of truth; a local `wrangler deploy` works
for iterating but the next push overwrites it.

The Hetzner box is **not** in the public path — it's reserved for future private
services (scrapers, n8n experiments) in the separate `homebase-infra` repo.
The contact form + run counter run on the Worker + D1, with email via Cloudflare
Email Routing (`functions/` + `workers/email-notify/`). Public address:
info@rensevanderzee.nl.

## Local preview

The site is static; open `site/index.html` directly, or serve it:

```bash
cd site && python3 -m http.server 8000   # then http://localhost:8000
```

## Roadmap

- [x] Static site (home / writing / more), responsive
- [x] Cloudflare Pages hosting
- [ ] Data pipeline: GitHub Action builds `site/data/data.parquet`
- [ ] Widget on real data via DuckDB-WASM
- [ ] "Ask anything" — Worker translates text → SQL, runs client-side
