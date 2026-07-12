"""Export (the last step): query the dbt marts and write what the site serves.

Outputs:
  site/data/metrics.json     the one contract the frontend reads
  site/data/metrics.parquet  the same marts as Parquet — the file the colophon
                             talks about, and the input for the DuckDB-WASM
                             step when that lands

HERO_SQL is executed here *verbatim* — it is the same text the homepage hero
types out, so the query on screen is the query that produced the numbers.
Keep the two in sync (site/index.html, data-hero-sql).
"""

import json
import os
import subprocess
import time
from datetime import date
from pathlib import Path

import duckdb

HERE = Path(__file__).parent
SITE_DATA = HERE.parent / "site" / "data"

HERO_SQL = """SELECT tool, stars
FROM stars_current
ORDER BY stars DESC
LIMIT 3;"""

WEEKS_BACK = 26  # ~6 months of complete weeks; pypistats serves ~180 days


def main() -> None:
    con = duckdb.connect(str(HERE / "warehouse.duckdb"), read_only=False)

    t0 = time.perf_counter()
    hero_rows = con.execute(HERO_SQL).fetchall()
    hero_ms = max(1, round((time.perf_counter() - t0) * 1000))

    stars = [
        {"tool": t, "stars": s, "fetched_on": str(d)}
        for t, s, d in con.execute(
            "SELECT tool, stars, fetched_on FROM stars_current ORDER BY stars DESC"
        ).fetchall()
    ]

    weeks = [
        str(w) for (w,) in con.execute(
            f"""SELECT week::date FROM downloads_weekly
                GROUP BY 1
                HAVING count(DISTINCT tool) = (SELECT count(DISTINCT tool) FROM downloads_weekly)
                ORDER BY 1 DESC LIMIT {WEEKS_BACK}"""
        ).fetchall()
    ][::-1]
    series = []
    for (tool,) in con.execute("SELECT DISTINCT tool FROM downloads_weekly ORDER BY tool").fetchall():
        rows = dict(con.execute(
            "SELECT week::date::varchar, downloads FROM downloads_weekly WHERE tool = ?", [tool]
        ).fetchall())
        series.append({"tool": tool, "data": [rows.get(w) for w in weeks]})

    history_days = [
        str(d) for (d,) in con.execute(
            "SELECT DISTINCT day FROM stars_history ORDER BY day"
        ).fetchall()
    ]
    history_series = []
    for (tool,) in con.execute("SELECT DISTINCT tool FROM stars_history ORDER BY tool").fetchall():
        rows = dict(con.execute(
            "SELECT day::varchar, stars FROM stars_history WHERE tool = ?", [tool]
        ).fetchall())
        history_series.append({"tool": tool, "data": [rows.get(d) for d in history_days]})

    # Provenance: which commit built this data, and where to see the run.
    # In CI GITHUB_* is set; locally we fall back to the working tree's HEAD.
    sha = os.environ.get("GITHUB_SHA")
    if not sha:
        try:
            sha = subprocess.check_output(
                ["git", "rev-parse", "HEAD"], cwd=HERE, text=True
            ).strip()
        except Exception:
            sha = None
    run_url = None
    if os.environ.get("GITHUB_RUN_ID") and os.environ.get("GITHUB_REPOSITORY"):
        run_url = (
            f"{os.environ.get('GITHUB_SERVER_URL', 'https://github.com')}/"
            f"{os.environ['GITHUB_REPOSITORY']}/actions/runs/{os.environ['GITHUB_RUN_ID']}"
        )

    metrics = {
        "updated": date.today().isoformat(),
        "generated_by": "dlt -> dbt -> DuckDB, in a GitHub Action",
        "build": {"sha": sha, "run_url": run_url},
        "hero": {
            "sql": HERO_SQL,
            "rows": [{"tool": t, "stars": s} for t, s in hero_rows],
            "elapsed_ms": hero_ms,
        },
        "stars": stars,
        "downloads_weekly": {"weeks": weeks, "series": series},
        "stars_history": {"days": history_days, "series": history_series},
    }

    SITE_DATA.mkdir(parents=True, exist_ok=True)
    (SITE_DATA / "metrics.json").write_text(json.dumps(metrics, indent=1) + "\n")

    con.execute(f"""
        COPY (
            SELECT 'downloads_weekly' AS mart, tool, week::date AS day, downloads AS value
            FROM downloads_weekly
            UNION ALL
            SELECT 'stars_history', tool, day, stars FROM stars_history
            UNION ALL
            SELECT 'stars_current', tool, fetched_on, stars FROM stars_current
        ) TO '{(SITE_DATA / "metrics.parquet").as_posix()}' (FORMAT PARQUET)
    """)
    con.close()
    print(f"wrote metrics.json + metrics.parquet · hero query {hero_ms} ms · updated {metrics['updated']}")


if __name__ == "__main__":
    main()
