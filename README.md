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
| `functions/` | Pages Functions: contact form → D1 + email, run-press counter. |
| `workers/email-notify/` | Tiny Worker holding the `send_email` binding (Pages can't); called via service binding. |
| `docs/blog-drafts/` | Unpublished post drafts. |
| `docs/runbook.md` | A→Z: how to deploy to Cloudflare Pages on the custom domain. |
| `docs/claude/` | Design brief + original Claude Design exports (reference). |

## Hosting

Static site on **Cloudflare Pages** (free), custom domain via Cloudflare DNS.
Deploy = `git push origin main`. See [`docs/runbook.md`](docs/runbook.md).

The Hetzner box is **not** in the public path — it's reserved for future private
services (scrapers, n8n experiments) in the separate `homebase-infra` repo.
The contact form + run counter use Cloudflare Pages Functions + D1, with email
via Email Routing (`functions/` + `workers/email-notify/`; runbook §I2 has the
one-time setup). Public address: info@rensevanderzee.nl → forwards to Hotmail.

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
