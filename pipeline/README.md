# Pipeline — the data platform behind rensevanderzee.nl

The small **dlt → dbt → DuckDB** pipeline the site's colophon describes. It runs
every morning in a GitHub Action (`.github/workflows/pipeline.yml`), never on a
server, and commits its output back into `site/data/`.

## What it does

```
extract_load.py   dlt      pulls GitHub repo snapshots + PyPI download history
                           for duckdb, polars, dbt, dlt into pipeline/warehouse.duckdb (raw schema)
dbt/              dbt      models raw -> staging -> marts inside the same DuckDB file
export.py         duckdb   runs the export queries against the marts and writes
                           site/data/metrics.json (+ metrics.parquet)
```

The Parquet carries all three marts (`downloads_weekly`, `stars_history`,
`stars_current`) in long format — it is what DuckDB-WASM queries in the
visitor's browser when they press Run. The JSON is the hero's data source and
the fallback contract when wasm can't load.

State that must accumulate over time (daily star counts — GitHub only exposes
the current total) lives in `history/stars.csv`, which the Action commits along
with the outputs. Download history needs no state: pypistats serves ~180 days
back on every call.

## Run it locally

```bash
pip install -r pipeline/requirements.txt
python pipeline/extract_load.py
(cd pipeline/dbt && dbt build --profiles-dir .)
python pipeline/export.py
```

No keys, no secrets: every source is public and keyless (GitHub unauthenticated
rate limit is plenty for 4 repos/day).

## Design notes

- **One boundary out:** the site reads only `site/data/metrics.json`. The JSON
  schema is the contract; everything behind it can change.
- **Honesty rule:** the site may only claim what this pipeline actually does.
  If you add a claim to the page, add the machinery here first.
- **Why Actions, not the VPS:** scheduled jobs belong in CI — reviewable,
  reproducible, and nothing to babysit. The VPS is for the private, heavier
  services only.
