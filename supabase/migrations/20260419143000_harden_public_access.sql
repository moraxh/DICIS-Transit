-- Harden all app objects so unauthenticated (anon) cannot read transport data.
-- Also ensure the consolidated view executes with caller privileges.

-- Make the consolidated view honor caller policies (RLS on underlying tables).
create or replace view public.public_route_points
with (security_invoker = true)
as
select
  r.id as route_id,
  r.name as route_name,
  r.is_active as route_is_active,
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

-- Remove default broad access from PUBLIC and anon.
revoke all on table public.routes from public, anon;
revoke all on table public.stops from public, anon;
revoke all on table public.route_stops from public, anon;
revoke all on table public.schedules from public, anon;
revoke all on table public.notices from public, anon;
revoke all on table public.route_modifications from public, anon;
revoke all on table public.reports from public, anon;
revoke all on table public.users from public, anon;
revoke all on table public.sessions from public, anon;
revoke all on table public.login_attempts from public, anon;
revoke all on table public.public_route_points from public, anon;

-- Explicit grants for authenticated users only (RLS continues to enforce row-level checks).
grant select, insert, update, delete on table public.routes to authenticated;
grant select, insert, update, delete on table public.stops to authenticated;
grant select, insert, update, delete on table public.route_stops to authenticated;
grant select, insert, update, delete on table public.schedules to authenticated;
grant select, insert, update, delete on table public.notices to authenticated;
grant select, insert, update, delete on table public.route_modifications to authenticated;
grant select, insert, update, delete on table public.reports to authenticated;
grant select, insert, update on table public.users to authenticated;
grant select, insert, update, delete on table public.sessions to authenticated;
grant select on table public.public_route_points to authenticated;

-- Keep login rate-limit RPC callable before authentication (proxy on /api/auth/login/student).
revoke all on function public.check_and_increment_login_limit(text) from public;
grant execute on function public.check_and_increment_login_limit(text) to anon;
grant execute on function public.check_and_increment_login_limit(text) to authenticated;
