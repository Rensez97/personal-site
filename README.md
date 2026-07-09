# personal-site

Rense van der Zee — personal site. A static site that doubles as a small demo of a
lightweight data stack: a daily `dlt → dbt → DuckDB` pipeline produces a Parquet
file, and the browser queries it in-place with DuckDB-WASM.

## Layout

| Path | What |
|------|------|
| `site/` | The static site — plain HTML/CSS/JS, no build step. `index.html`, `blog.html`, `more.html`. |
| `docs/runbook.md` | A→Z: how to deploy to Cloudflare Pages on the custom domain. |
| `docs/claude/` | Design brief + original Claude Design exports (reference). |

## Hosting

Static site on **Cloudflare Pages** (free), custom domain via Cloudflare DNS.
Deploy = `git push origin main`. See [`docs/runbook.md`](docs/runbook.md).

The Hetzner box is **not** in the public path — it's reserved for future private
services (scrapers, n8n, a CRM) in the separate `homebase-infra` repo.

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
