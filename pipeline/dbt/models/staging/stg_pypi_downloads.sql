-- Daily PyPI downloads per tool, deduplicated (pypistats re-serves the same
-- ~180-day window every run; raw is replaced, so this is belt-and-braces).
select
    tool,
    cast(day as date)        as day,
    cast(downloads as bigint) as downloads
from raw.pypi_downloads
qualify row_number() over (partition by tool, day order by downloads desc) = 1
