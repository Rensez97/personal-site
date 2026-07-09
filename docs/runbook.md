# Runbook — Ship the site, A → Z

How to get `personal-site` live on the web, from an empty GitHub repo to a public
HTTPS site on your domain. Architecture: **static site on Cloudflare Pages**, the
box stays out of the public path.

```
  you ──git push──► GitHub repo ──build──► Cloudflare Pages ──HTTPS/CDN──► visitors
                        ▲                        │
                        │                        └── custom domain (Cloudflare DNS)
        GitHub Actions ─┘  (daily: build Parquet, commit → auto-redeploy)   [later]
```

Legend: 🖐 = dashboard/UI · 💻 = shell on your laptop.

**Cost:** Cloudflare Pages Free plan — unlimited requests + bandwidth, 500
builds/month, free HTTPS, preview deploys. €0/month. Limits to know: 25 MB/file
(the Parquet is KB-sized, fine). You only pay for the domain and, later, LLM calls.

---

## A. Prerequisites (one-time)

- A **GitHub** account (`Rensez97`) — already have it, SSH auth already works.
- A **Cloudflare** account (free) — create at cloudflare.com if you haven't.
- Your **domain** at mijndomein.nl.

---

## B. 💻 Push the repo to GitHub

1. 🖐 On github.com → **New repository** → name `personal-site` → **empty** (no
   README/.gitignore, the repo already has commits) → Create.
   - Public or private? **Public** is fine and lets the "repo ↗" links work; if you
     prefer private, first prune `docs/claude/` (design brief) — no secrets are at
     risk either way (`.env` patterns are gitignored).
2. 💻 Connect and push:
   ```bash
   cd /home/rense/personal-site
   git remote add origin git@github.com:Rensez97/personal-site.git
   git push -u origin main
   ```

---

## C. 🖐 Point the domain at Cloudflare

1. Cloudflare dashboard → **Add a site** → your domain → **Free** plan.
2. Cloudflare shows **two nameservers** (e.g. `xxx.ns.cloudflare.com`). Copy both.
3. mijndomein.nl → your domain → **Naamservers** → switch to **custom** → paste
   Cloudflare's two, remove the old ones, save.
4. Back in Cloudflare → **Check nameservers**. Wait for the zone to go **Active**
   (usually <1 h, up to 24 h; you get an email).

---

## D. 🖐 Create the Pages project

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git** → authorize GitHub → pick `personal-site`.
2. Build settings — the site is plain static HTML, so **no build step**:
   | Field | Value |
   |-------|-------|
   | Framework preset | **None** |
   | Build command | *(leave empty)* |
   | Build output directory | `site` |
   | Root directory | `/` |
3. **Save and Deploy.** First deploy runs in ~30 s and gives you a
   `personal-site.pages.dev` URL — open it, the site should be live.

> Later, if you convert to Astro: set Build command `npm run build`, output `dist`.

---

## E. 🖐 Attach your custom domain

1. In the Pages project → **Custom domains** → **Set up a domain** → enter your
   apex (`yourdomain.nl`) → Cloudflare auto-creates the proxied DNS record.
2. Repeat for `www.yourdomain.nl` (Cloudflare offers a redirect to apex).
3. TLS certs issue automatically within a minute or two.

---

## F. 🖐 HTTPS hardening (once the domain resolves)

Cloudflare dashboard → **SSL/TLS**:
- Encryption mode: **Full** (or Full (strict)).
- **Edge Certificates** → enable **Always Use HTTPS** and **Automatic HTTPS Rewrites**.
- Optionally enable **HSTS** once you're confident the site is stable.

---

## G. 🖐 Verify

- `https://yourdomain.nl` loads with a padlock; issuer is Cloudflare.
- The "Run the pipeline" widget animates and draws the charts.
- `www` redirects to apex (or also loads).

**Done — the site is live.** From here, deploying is just `git push`.

---

## H. Day-to-day

- **Deploy:** `git push origin main` → Pages rebuilds and deploys automatically.
- **Preview:** push a branch / open a PR → Pages gives a unique preview URL before
  you merge.
- **Roll back:** Pages → Deployments → pick a previous deploy → **Rollback**.
- **Cache:** if an HTML change doesn't show, Pages purges its own cache on deploy;
  for edge cache you can **Purge Everything** under Caching (rarely needed).

---

## I. Later — the data pipeline (Phase: data)

Not needed to be live; wires real numbers into the widget.
- A scheduled **GitHub Action** runs `dlt → dbt → DuckDB`, writes
  `site/data/data.parquet`, and commits it → the push auto-redeploys Pages.
- The widget swaps its inline demo data for **DuckDB-WASM** loading that Parquet.
- Keep the Parquet < 25 MB (it will be tiny); if it ever grows, move it to R2.

## J. Later — "ask anything" (Phase: worker)

- A **Cloudflare Pages Function / Worker** holds the LLM key server-side,
  rate-limited, and only translates text → SQL. The SQL runs client-side in
  DuckDB-WASM against the read-only Parquet — never touches a server.

## K. Later — private services (separate concern)

The public site never needs the Hetzner box. When scrapers / n8n / a CRM become
real, they live in the **`homebase-infra`** repo, bound to WireGuard, brought up
on demand — and the site reaches them (if ever) only through a narrow Worker
endpoint, never directly. That box's setup (hardening, WireGuard SSH shortcut) is
documented in that repo, not here.
