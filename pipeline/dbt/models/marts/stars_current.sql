-- Latest star count per tool — what the hero query on the site reads.
select tool, stars, day as fetched_on
from {{ ref('stg_star_snapshots') }}
qualify row_number() over (partition by tool order by day desc) = 1
order by stars desc
