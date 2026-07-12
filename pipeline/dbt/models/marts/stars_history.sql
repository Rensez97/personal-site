-- The accumulating daily star series (grows by one row per tool per day).
select tool, day, stars
from {{ ref('stg_star_snapshots') }}
order by tool, day
