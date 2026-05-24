-- MEDIUM-4: Add schedule_type to routes — eliminates fragile name-string filtering
alter table public.routes
  add column if not exists schedule_type text not null default 'weekday'
    check (schedule_type in ('weekday', 'saturday', 'sunday'));

-- Backfill from existing name convention (Sábados: prefix → saturday, rest → weekday)
update public.routes
  set schedule_type = 'saturday'
  where lower(name) like '%sábado%'
     or lower(name) like '%sabado%'
     or lower(name) like 'sab%';

-- DB-3: Add status to reports for moderation workflow
alter table public.reports
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'verified', 'false', 'spam'));

-- Index on status for admin filter queries
create index if not exists idx_reports_status
  on public.reports(status);

-- Rebuild public_route_points view to include schedule_type
create or replace view public.public_route_points
with (security_invoker = true)
as
select
  r.id as route_id,
  r.name as route_name,
  r.is_active as route_is_active,
  r.direction as route_direction,
  r.schedule_type as route_schedule_type,
  rs.stop_order,
  rs.point_role,
  rs.time_from_previous_mins,
  sum(rs.time_from_previous_mins) over (
    partition by rs.route_id
    order by rs.stop_order
    rows between unbounded preceding and current row
  ) as cumulative_minutes,
  s.id as stop_id,
  s.name as stop_name,
  s.latitude,
  s.longitude
from public.route_stops rs
join public.routes r on r.id = rs.route_id
join public.stops s on s.id = rs.stop_id;
