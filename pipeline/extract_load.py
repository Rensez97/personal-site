"""Extract + load (the `dlt` step).

Pulls public, keyless sources for the four tools the site tracks and loads
them into pipeline/warehouse.duckdb under the `raw` schema:

  raw.github_repos    one snapshot row per repo per run (stars, forks, ...)
  raw.pypi_downloads  daily download counts, ~180 days back (pypistats.org)

GitHub only exposes the *current* star total, so history has to accumulate:
each run also appends today's snapshot to history/stars.csv, which dbt reads
as a source. The Action commits that file, so the time series grows one row
per tool per day.
"""

import csv
import time
from datetime import date
from pathlib import Path

import dlt
import requests

HERE = Path(__file__).parent
DB_PATH = HERE / "warehouse.duckdb"
HISTORY = HERE / "history" / "stars.csv"

TOOLS = {
    "duckdb": {"repo": "duckdb/duckdb", "pypi": "duckdb"},
    "polars": {"repo": "pola-rs/polars", "pypi": "polars"},
    "dbt": {"repo": "dbt-labs/dbt-core", "pypi": "dbt-core"},
    "dlt": {"repo": "dlt-hub/dlt", "pypi": "dlt"},
}

session = requests.Session()
session.headers["User-Agent"] = "rensevanderzee.nl site pipeline (github.com/Rensez97/personal-site)"


def get_json(url: str, tries: int = 3):
    for attempt in range(tries):
        resp = session.get(url, timeout=60)
        if resp.status_code == 429 and attempt < tries - 1:
            time.sleep(15 * (attempt + 1))
            continue
        resp.raise_for_status()
        return resp.json()


@dlt.resource(name="github_repos", write_disposition="replace")
def github_repos():
    today = date.today().isoformat()
    for tool, cfg in TOOLS.items():
        repo = get_json(f"https://api.github.com/repos/{cfg['repo']}")
        yield {
            "tool": tool,
            "repo": cfg["repo"],
            "stars": repo["stargazers_count"],
            "forks": repo["forks_count"],
            "open_issues": repo["open_issues_count"],
            "fetched_on": today,
        }


@dlt.resource(name="pypi_downloads", write_disposition="replace")
def pypi_downloads():
    for tool, cfg in TOOLS.items():
        overall = get_json(f"https://pypistats.org/api/packages/{cfg['pypi']}/overall?mirrors=false")
        for row in overall["data"]:
            if row["category"] == "without_mirrors":
                yield {"tool": tool, "day": row["date"], "downloads": row["downloads"]}
        time.sleep(2)  # pypistats rate-limits bursts


def append_star_history(snapshots: list[dict]) -> None:
    HISTORY.parent.mkdir(exist_ok=True)
    seen = set()
    if HISTORY.exists():
        with open(HISTORY, newline="") as f:
            seen = {(r["tool"], r["day"]) for r in csv.DictReader(f)}
    else:
        with open(HISTORY, "w", newline="") as f:
            csv.writer(f).writerow(["tool", "day", "stars"])
    with open(HISTORY, "a", newline="") as f:
        writer = csv.writer(f)
        for snap in snapshots:
            if (snap["tool"], snap["fetched_on"]) not in seen:
                writer.writerow([snap["tool"], snap["fetched_on"], snap["stars"]])


def main() -> None:
    snapshots = list(github_repos())
    append_star_history(snapshots)

    pipeline = dlt.pipeline(
        pipeline_name="site_metrics",
        destination=dlt.destinations.duckdb(str(DB_PATH)),
        dataset_name="raw",
    )
    info = pipeline.run([dlt.resource(snapshots, name="github_repos", write_disposition="replace"),
                         pypi_downloads()])
    print(info)


if __name__ == "__main__":
    main()
