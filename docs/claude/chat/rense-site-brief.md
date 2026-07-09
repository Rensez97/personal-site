# Personal Site — Copy & Design Brief

**Thesis (the whole site in one line):** *I build lightweight modern data platforms — and this site is one.*

**How to use this doc:**
- **Part 1** is the actual page copy, top to bottom. Edit the voice to taste, then paste it into **Claude Design** so it designs around real words.
- **Part 2** is a one-page design brief. Paste it alongside the copy so Design knows the vibe, structure, and constraints.
- After Design gives you a look you like, carry **the design + Part 1 copy + the technical notes at the bottom** into **Claude Code** to build the real Astro site, pipeline, and DuckDB-WASM widget.
- `[BRACKETS]` mark the few things only you can fill in.

---

# Part 1 — Page copy (top to bottom)

## Hero (first screen — keep it almost empty)

**Rense van der Zee**

Data engineer. I build data platforms that don't wake you up at night.

*Groningen · DuckDB · dbt · dlt · lightweight over heavyweight*

> `This page ran [N] SQL queries in your browser to draw what's below.`
> *(live line — the number is real, counted from the widget. It's the first proof of the thesis before anyone scrolls.)*

---

## About (anchors, not duties — 4 lines)

I'm currently building the data platform at **Winparts**, a fast-growing European car-parts retailer.

Before that I contributed to one of the largest data migrations in the Netherlands — the mortgage migration at **a.s.r. / Aegon** — through Sogeti, first as a data engineer and before that as a test analyst.

**MSc** in Technology & Operations Management and **BSc** in Information Science, both from the **University of Groningen**.

I have a bias: small, sharp stacks over heavy ones. DuckDB and Parquet before a running cluster. Pipelines that run in CI, not on a server someone has to babysit. Boring infrastructure that stays up.

---

## Flagship widget (the centerpiece — the reason the site exists)

### The modern data stack, measured

Everyone has opinions about which tools are winning. This is the data.

Stars are mindshare. Downloads are usage. Here's both — for the tools I actually build with — refreshed every morning by a pipeline that runs while I sleep.

**[ ▶ Run the pipeline ]**
*(button visually replays the pipeline — extract → transform → load lighting up — then loads fresh Parquet into DuckDB in your browser and draws the charts: GitHub stars + PyPI/npm downloads for duckdb, dlt, dbt, polars over time.)*

**Ask it anything.**
`e.g. "which tool grew fastest this year?"`
This box turns your question into SQL and runs it — in your browser, against the data, never on my server.

*(Optional second tab, so the button always has fresh movement: "What the internet read today" — Wikipedia pageviews, or a Hacker News pulse. Same machinery, lighter data.)*

---

## How this page works (the colophon — the quiet flex)

There's no server doing this. No database, no API behind a login, nothing to page me at 3am.

Every morning a GitHub Action runs a small **dlt → dbt → DuckDB** pipeline and commits one Parquet file. The site itself is static — served from my own **Hetzner** box, behind **Cloudflare**. When you pressed Run, that Parquet loaded into **DuckDB compiled to WebAssembly**, and every query executed right here, in your browser.

It's the whole thesis in miniature: a data platform light enough to fit inside a web page.

---

## Writing

Occasional notes on data engineering — mostly about doing more with less.

- **Do you actually need Snowflake?** A decision framework for smaller companies.
- **DuckLake vs. the traditional lakehouse** — what actually changes.
- **Self-hosting a data stack on Hetzner** — the real costs and the sharp edges.

*(Show 2–3 as "latest" once written, or as "coming soon". Links go to `/blog`.)*

---

## Things I've built

- **CasaCatcher** — automated apartment hunting in Barcelona. `casacatcher.com`
- **The modern data stack, measured** — the dashboard above; here's how it's wired. `[link to colophon / repo]`
- **Data Expo 2026, Utrecht** — a talk on `[TALK TOPIC]`. `[Slides →]`

*(Pointers, not case studies. One line each.)*

---

## Get in touch

`[email]` — or leave a note:

**[ small contact form ]**

*This form posts into a little CRM I built, running behind my VPN. Even the contact box is on-thesis.*

**GitHub** · **LinkedIn** · **Blog** · *[a bit more about me →]* `(links to the thin personal page — one click away, off the main scroll)`

---

# Part 1B — The other two pages

## `/blog` — the writing index

### Notes

Notes on data engineering — mostly about doing more with less. Occasional, not scheduled.

`[RSS]` *(a feed link belongs here — it's the one flourish that reads as "of course this person has RSS".)*

---

**Do you actually need Snowflake?**
A decision framework for smaller companies — and why the answer is usually no.
`[date] · [x min read]`

**DuckLake vs. the traditional lakehouse**
What actually changes when the catalog is a database instead of a pile of log files.
`[date] · [x min read]`

**Self-hosting a data stack on Hetzner**
The real costs and the sharp edges — the stuff the tutorials skip.
`[date] · [x min read]`

*(Until posts exist, show these as the list with a small "first one soon" note, or hide dates. Newest on top once real.)*

**Single-post layout (note for the build):** title, one-line dek, date + reading time, then the body. Keep the same restraint — generous line-height, a readable measure (~65–75 chars), monospace only for code blocks and inline `identifiers`. A quiet "← all notes" link back to the index. No share buttons, no comment section, no popups.

---

## `/…` — the thin personal page

*(Reachable from the footer link "a bit more about me". Human, light, still your voice. No address, nothing you'd rather not have indexed — just the person behind the engineer.)*

### A bit more

The stuff that isn't on a résumé.

**Low and slow.** I cook on a BBQ more than is strictly reasonable — the kind where the cooking is measured in hours and the point is partly the waiting.

**Still playing FireRed.** Some datasets you just return to. Currently working through Pokémon FireRed again, unhurried.

**Researching a dog.** Somewhere between a golden retriever and something smaller. For a data engineer, "getting a dog" mostly means a research phase that refuses to end.

**Building the house.** Mid-renovation — most recently a dormer (dakkapel), and the slow satisfaction of drywall, trim, and getting a step-down ceiling to look intentional.

**Been around.** Recent trips to Colombia and Panama. Always happy to talk routes.

**Tinkering with the server.** The same Hetzner box that serves this site runs my experiments — a habit that keeps leaking back into the day job.

*(Six short blocks is plenty. Add or cut to taste; the point is warmth and brevity, not a life story.)*

---

# Part 2 — Design brief (one page, for Claude Design)

**Thesis:** I build lightweight modern data platforms — and this site *is* one. The site shouldn't *claim* competence; it should *be* a small working example of the work. The medium is the message, so the copy stays understated and the interactive widget carries the proof.

**Format:**
- One-page main site (everything above, single scroll)
- Separate `/blog` page
- Thin personal page (BBQ, travel, DIY) — linked from the footer, **not** on the main scroll. Personal stuff stays one click away.

**Section order (the scroll = the argument):**
Hero → About → **Flagship widget (centerpiece)** → How this page works → Writing → Projects → Contact/footer.
The logic: *who I am (fast) → proof I can do it (live widget) → proof I build it right (colophon) → what I think (writing) → what I've made (projects) → reach me.*

**Voice & tone:** Understated, dry, opinionated, technically confident but never boastful. Short lines. Dutch directness. No marketing fluff, no adjectives doing work the widget already does.

**Aesthetic direction — warm paper / editorial (locked):**
Not a dark dev-site. A light, print-like, *warm* editorial feel — considered and senior, deliberately apart from the dark-terminal genre most data engineers land on. Whitespace-heavy and restrained; precision over decoration. Warm neutrals throughout (cream paper, warm near-black ink, warm grey for in-between text), with a single cool accent providing warm/cool tension so it never reads as beige-on-beige.

**Palette (use these exact tokens):**

| Role | Hex | Notes |
|------|-----|-------|
| Paper (page bg) | `#F4EFE4` | warm cream, not white |
| Surface (cards) | `#FBF8F1` | lifted warm near-white |
| Ink (primary text) | `#221D16` | warm near-black, never pure `#000` |
| Text secondary | `#5A5348` | warm brown-grey |
| Text muted | `#8C8476` | the warm grey — labels, captions, mono meta line |
| Border / hairline | `#E4DCCC` | subtle warm tan |
| Accent | `#0F7A68` | deep teal — links, buttons, the query-count line, chart series |

Accent used sparingly (one accent per view). Text on the teal accent uses paper `#F4EFE4`, not white. Alternates considered and rejected in favour of teal, kept only as fallback: clay `#B15C36` (fully warm) or ink blue `#2A4A78` (classic print).

**Type split (what makes this direction work):**
- **Headings / name:** a restrained text-serif (this is the lever that pushes it from "nice light site" to editorial/senior). Sentence case.
- **Body / UI:** a clean sans.
- **Data texture:** monospace for numbers, metric labels, the live query-count line, and any code-ish UI.

Deliberately avoid amber/gold/yellow accents — a close colleague who freelances in the same space uses amber (`#f9a800`), so that lane is off-limits to avoid looking derivative. The warm-paper base with a cool teal accent and a serif display face is the differentiator.

**Signature interaction — the flagship widget:** design it in three visible states so the concept reads without being functional:
1. **Idle** — the Run button, a hint of the pipeline shape.
2. **Running** — the DAG lighting up extract → transform → load.
3. **Loaded** — the charts (stars + downloads time series) plus the SQL query box and the "ask anything" field.

**Must-haves:**
- The live `"This page ran [N] SQL queries in your browser"` line in the hero.
- The flagship widget as the unmistakable visual centerpiece.
- The "How this page works" colophon immediately after the widget.
- Personal content reachable in one click but absent from the main scroll.

**Constraints:**
- Target build is **static Astro** (Cloudflare in front, Hetzner host). Keep the design to something that maps cleanly to a static site — no patterns that would force a heavy runtime.
- Keep it buildable in Claude Code afterward. Favour clarity over flourishes that are hard to implement.

**Out of scope for Design (belongs to Claude Code):**
The widget here is a **designed placeholder** — mock the look and the states, don't wire it up. The real dlt/dbt/DuckDB pipeline and the in-browser DuckDB-WASM execution get built in Claude Code against live data. Don't let a good-looking fake widget imply that part is done.

---

## Technical notes to carry into Claude Code (not for Design)

- **Stack:** Astro (static) · dlt (extract) → dbt (model) → DuckDB (build Parquet) · GitHub Actions (daily schedule, commits Parquet) · DuckDB-WASM (in-browser query) · Cloudflare (front) · Hetzner (host).
- **Flagship data:** GitHub stars (GitHub API) + PyPI downloads (pypistats.org, keyless, daily, ~24–48h lag) + npm downloads (public, keyless), for duckdb, dlt, dbt, polars. Optional lightweight second tab: Wikipedia pageviews (Wikimedia, keyless) or Hacker News (keyless).
- **"Ask anything" box:** LLM only *translates* text → SQL via a small Cloudflare Worker that holds the API key server-side and is rate-limited. The generated SQL runs client-side in DuckDB-WASM against read-only Parquet — so it never touches your infra. Ship this as a fast-follow after the base widget works.
- **Contact form → CRM:** posts into your self-hosted CRM behind WireGuard; keep it private (Cloudflare Access if you want VPN-free reach). The public site opens only 443 (or use a Cloudflare Tunnel for zero inbound).
- **Scope discipline:** ship hero + about + widget (base version) + colophon first. Ask-anything box, second data tab, and blog posts are follow-ups.
