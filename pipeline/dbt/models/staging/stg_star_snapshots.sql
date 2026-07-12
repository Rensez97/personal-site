-- One star-count snapshot per tool per day, accumulated by the daily run in
-- history/stars.csv (GitHub only exposes the current total, so we build the
-- series ourselves). Path is relative to the dbt working dir (pipeline/dbt).
select
    tool,
    cast(day as date)     as day,
    cast(stars as bigint) as stars
from read_csv_auto('../history/stars.csv', header = true)
