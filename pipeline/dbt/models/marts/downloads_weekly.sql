-- Weekly PyPI downloads per tool. Only complete weeks (7 observed days), so
-- the chart never shows a fake dip at the edges of pypistats' window.
select
    tool,
    date_trunc('week', day) as week,
    sum(downloads)          as downloads
from {{ ref('stg_pypi_downloads') }}
group by 1, 2
having count(*) = 7
order by tool, week
