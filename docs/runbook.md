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

## I. The data pipeline — LIVE (since 2026-07-11)

- The scheduled **GitHub Action** (`.github/workflows/pipeline.yml`) runs
  `dlt → dbt → DuckDB` daily at 04:20 UTC, commits `site/data/metrics.json` +
  `metrics.parquet` + `pipeline/history/stars.csv` → the push auto-redeploys.
- The widget loads the Parquet into **DuckDB-WASM** on Run (pinned CDN build);
  falls back to the JSON if the CDN is unreachable.
- Keep the Parquet < 25 MB (it is tiny); if it ever grows, move it to R2.
- After first push: trigger the workflow once manually (Actions tab → daily-pipeline
  → Run workflow) to confirm it's green.

## I2. Contact form + real inbox + run counter — one-time setup (~20 min)

All-Cloudflare, no third-party email service. Three pieces:
`functions/api/contact.js` (Pages Function → D1 + notify),
`workers/email-notify/` (tiny Worker that holds the `send_email` binding —
Pages Functions can't hold one themselves, so it's reached via a service
binding), and **Email Routing** (the real inbox: info@rensevanderzee.nl).

1. **Email Routing (the inbox):** Cloudflare dashboard → your zone → **Email →
   Email Routing → Enable**. This rewrites the domain's MX records to
   Cloudflare (fine — the domain sends/receives no mail today).
   - Destination addresses → add `rensevdzee@hotmail.com` → click the
     verification link Cloudflare mails you.
   - Custom addresses → create `info@rensevanderzee.nl` → forward to the
     Hotmail destination. (Add a catch-all if you want everything@domain.)
   - Result: mail to info@ lands in your Hotmail; replies just work.
2. **D1:** `npx wrangler d1 create site-db`, then
   `npx wrangler d1 execute site-db --remote --file=functions/schema.sql`.
3. **Notify Worker:** `cd workers/email-notify && npx wrangler deploy`
   (first time: `npx wrangler login`). It has no public URL
   (`workers_dev = false`); only the service binding can reach it.
4. **Bind both in the Pages project** → Settings → Functions:
   - D1 bindings: variable `DB` → `site-db`
   - Service bindings: variable `EMAIL` → worker `site-email-notify`
   - Redeploy.
5. **Read your form inbox with SQL:**
   `npx wrangler d1 execute site-db --remote --command "SELECT ts,name,email,substr(message,1,80) FROM messages ORDER BY id DESC LIMIT 20"`
6. **Run-button analytics:**
   `... --command "SELECT date(ts) d, count(*) FROM events WHERE event='run' GROUP BY d ORDER BY d DESC"`
7. **Pageviews:** enable free **Cloudflare Web Analytics** on the Pages project
   (Settings → Web Analytics) — cookieless, no consent banner needed.

Notes:
- The site shows `info@rensevanderzee.nl` as the public address — it only
  works after step 1, so do that before pushing the site live.
- `send_email` may only deliver to *verified destination addresses* — that's
  why the Worker sends to your Hotmail, with the visitor in Reply-To.
- Without steps 2–4 the form shows its honest fallback ("mail me instead")
  and nothing breaks; messages are simply not stored.

## J. Later — "ask anything" (Phase: worker)

- A **Cloudflare Pages Function / Worker** holds the LLM key server-side,
  rate-limited, and only translates text → SQL. The SQL runs client-side in
  DuckDB-WASM against the read-only Parquet — never touches a server.

## K. Later — private services (separate concern)

The public site never needs the Hetzner box. When scrapers / n8n experiments become
real, they live in the **`homebase-infra`** repo, bound to WireGuard, brought up
on demand — and the site reaches them (if ever) only through a narrow Worker
endpoint, never directly. That box's setup (hardening, WireGuard SSH shortcut) is
documented in that repo, not here.
