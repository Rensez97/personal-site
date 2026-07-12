# Runbook — Ship the site, A → Z

How to get `personal-site` live on the web, from an empty GitHub repo to a public
HTTPS site on your domain. Architecture: **a Cloudflare Worker with static
assets**, the box stays out of the public path.

```
  you ──git push──► GitHub repo ──build──► Cloudflare Worker ──HTTPS/CDN──► visitors
                        ▲                        │
                        │                        └── custom domain (Cloudflare DNS)
        GitHub Actions ─┘  (daily: build Parquet, commit → auto-redeploy)   [later]
```

Legend: 🖐 = dashboard/UI · 💻 = shell on your laptop.

> **This started as a Cloudflare *Pages* project and is now a *Worker* with
> static assets** (Cloudflare is unifying the two; the migration happened to us
> mid-setup). It matters, because the two models differ:
> - `site/` is served by **static assets**; `worker/index.js` runs only for
>   routes that don't match a file (i.e. `/api/*`).
> - Pages' file-based routing (`functions/api/foo.js` → `/api/foo`) does **not**
>   apply. `worker/index.js` routes explicitly — it imports and reuses the
>   handlers in `functions/api/*`, so the logic still lives in one place.
> - Config + bindings live in the root **`wrangler.toml`**, deployed with
>   `wrangler deploy` (not `wrangler pages deploy`).
> - If Cloudflare's autoconfig bot opens a PR offering to migrate to
>   `wrangler.jsonc`, **close it** — we're already on this model.

**Cost:** Workers Free plan — 100k requests/day, free HTTPS, static assets don't
count against the limit. €0/month. You only pay for the domain and, later, LLM
calls.

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

## D. 🖐 Create the Worker + connect Git

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Worker** →
   **Connect to Git** → authorize GitHub → pick `personal-site`.
2. Build settings — plain static HTML plus a tiny router, so **no build step**:
   | Field | Value |
   |-------|-------|
   | Build command | *(leave empty)* |
   | Deploy command | `npx wrangler deploy` |
   | Root directory | `/` |
3. Everything else (entry point, assets dir, bindings) comes from the root
   **`wrangler.toml`** — that file is the source of truth, not the dashboard.
4. **Save and Deploy.** You get a `personal-site.<subdomain>.workers.dev` URL.

---

## E. 🖐 Attach your custom domain

1. In the Worker → **Domains & Routes** → **Add** → **Custom domain** → enter
   your apex (`yourdomain.nl`) → Cloudflare auto-creates the proxied DNS record.
2. Repeat for `www.yourdomain.nl` if you want it.
3. TLS certs issue automatically within a minute or two.

> **Deploys take a moment to propagate to the custom domain.** `workers.dev`
> updates instantly; the custom domain can serve the *previous* version for a
> few seconds. Don't panic-debug a deploy you made 10 seconds ago.

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

- **Deploy:** `git push origin main` → the Git build runs `wrangler deploy`.
  **Git is the source of truth.** A local `npx wrangler deploy` also works and is
  faster for iterating, but the *next* `git push` overwrites it with whatever is
  committed — so commit anything you want to keep. (Debugging with uncommitted
  local deploys while pushes land is a great way to confuse yourself. It was.)
- **`workers/email-notify/` is NOT deployed by `git push`** — the Git build only
  builds the root Worker. Deploy it by hand:
  `cd workers/email-notify && npx wrangler deploy`.
- **Roll back:** Worker → Deployments → pick a previous version → **Rollback**.
- **Logs:** `[observability]` is enabled on both Workers → Worker → **Logs** in
  the dashboard. (`npx wrangler tail` proved unreliable here — prefer the
  dashboard, or temporarily surface state in an HTTP response.)

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

## I2. Contact form + real inbox + run counter — LIVE (since 2026-07-12)

All-Cloudflare, no third-party email service. Four pieces:

| Piece | What it does |
|-------|--------------|
| `worker/index.js` | Routes `POST /api/*`; everything else is a static asset |
| `functions/api/*.js` | The actual handlers (contact → D1 + notify; event → D1). Imported by the router — *not* Pages file-based routing |
| `workers/email-notify/` | Separate Worker holding the `send_email` binding (the site Worker can't hold one), reached via service binding `EMAIL` |
| **Email Routing** | The real inbox: `info@rensevanderzee.nl` |

### Setup

1. **Email Routing (the inbox):** zone → **Email → Email Routing → Enable**
   (rewrites the domain's MX records to Cloudflare).
   - Destination addresses → add **`rensevdzee@gmail.com`** *and*
     `rensevdzee@hotmail.com` → click both verification links.
   - Custom addresses → create `info@rensevanderzee.nl` → forward to Hotmail.
   - Result: mail *to* info@ lands in Hotmail; replies just work.
2. **D1:** `npx wrangler d1 create site-db`, then
   `npx wrangler d1 execute site-db --remote --file=functions/schema.sql`.
   Put the returned `database_id` in the root `wrangler.toml`.
3. **Notify Worker:** `cd workers/email-notify && npx wrangler deploy`.
   No public URL (`workers_dev = false`) — only the service binding reaches it.
   **It is not deployed by `git push`** (the Git build only builds the root
   Worker) — redeploy it by hand whenever you change it.
4. **Bindings — in `wrangler.toml`, NOT the dashboard.** The root
   `wrangler.toml` declares `DB` (D1) and `EMAIL` (service → `site-email-notify`).
   The dashboard's "Add binding" button silently does nothing for this project,
   so don't waste an afternoon on it (we did). `git push` → deploy.
5. **Read your form inbox with SQL:**
   `npx wrangler d1 execute site-db --remote --command "SELECT ts,name,email,substr(message,1,80) FROM messages ORDER BY id DESC LIMIT 20"`
6. **Run-button analytics:**
   `... --command "SELECT date(ts) d, count(*) FROM events WHERE event='run' GROUP BY d ORDER BY d DESC"`
7. **Pageviews:** enable free **Cloudflare Web Analytics** — cookieless, no
   consent banner needed.

### Email delivery — read this before debugging

- **Notifications go to Gmail, not Hotmail.** Outlook/Hotmail rejects Cloudflare
  Email Routing's shared sending IPs on reputation:
  `451 4.7.650 ... temporarily rate limited due to IP reputation`. Mail to
  Hotmail is silently deferred — it lands in *neither* inbox nor spam. The
  notify Worker sends to **both** (`MAIL_TO` in its `wrangler.toml`); Gmail is
  the one that actually arrives. If you ever *need* Hotmail delivery, you need a
  real ESP (Resend et al.) — this is not fixable in code.
- Recipients live **only** in `workers/email-notify/wrangler.toml` (`MAIL_FROM` /
  `MAIL_TO`), read via `env`. Don't hardcode addresses in `index.js`.
- Every `MAIL_TO` address must be a **verified** Email Routing destination.

### Two traps that cost hours (both self-inflicted)

- **TOML ordering.** `send_email = [...]` is a *top-level* key and must appear
  **before** any `[table]` header. Put it under `[vars]` and TOML nests it into
  that table: it silently becomes a plain variable, `env.NOTIFY` is `undefined`,
  and the Worker throws on every request. Check the deploy output — it must say
  `env.NOTIFY … Send Email`, not `env.send_email … Environment Variable`.
- **`Promise.allSettled` does not catch synchronous throws.** `new EmailMessage()`
  / `.send()` can throw *synchronously*; inside a plain `.map()` callback that
  throw escapes `allSettled` and crashes the Worker (`error 1101`). The callback
  must be `async` so the throw becomes a rejection.

Both were invisible because `contact.js` swallowed notify failures with
`.catch(() => {})` — the form happily returned `{"ok":true}` while the notify
Worker crashed on every call. It now `console.error`s failures, and
`[observability]` is on for both Workers so the logs are queryable.

Without steps 2–4 the form shows its honest fallback ("mail me instead") and
nothing breaks; messages are simply not stored.

## J. Later — "ask anything" (Phase: worker)

- A route in the **site Worker** (add it to `worker/index.js`, handler in
  `functions/api/`) holds the LLM key server-side, rate-limited, and only
  translates text → SQL. The SQL runs client-side in DuckDB-WASM against the
  read-only Parquet — never touches a server.

## K. Later — private services (separate concern)

The public site never needs the Hetzner box. When scrapers / n8n experiments become
real, they live in the **`homebase-infra`** repo, bound to WireGuard, brought up
on demand — and the site reaches them (if ever) only through a narrow Worker
endpoint, never directly. That box's setup (hardening, WireGuard SSH shortcut) is
documented in that repo, not here.
