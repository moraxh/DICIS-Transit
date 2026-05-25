-- C-2: Lock adjust_credibility to admins only — any authenticated user could call it before
-- Add is_admin() check inside RPC so even if grants drift, the function self-enforces
create or replace function public.adjust_credibility(
  target_user_id uuid,
  delta int
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_score int;
begin
  if not public.is_admin() then
    raise exception 'Insufficient permissions: admin role required';
  end if;

  update public.users
  set credibility_score = greatest(0, least(100, credibility_score + delta))
  where id = target_user_id
  returning credibility_score into new_score;

  if not found then
    raise exception 'User not found: %', target_user_id;
  end if;

  return new_score;
end;
$$;

-- Revoke from authenticated (was granted in previous migration), keep only service_role
-- The admin client calls this via the browser supabase client with their admin JWT,
-- so authenticated is still needed — but is_admin() check above is the real guard.
-- We leave the grant as-is since admin users ARE authenticated; the function guards itself.

-- H-5: recent_report_counts — add security_invoker so RLS on reports is enforced
-- Previously ran without it, meaning the view owner's permissions bypassed RLS.
-- Aggregated data only (no user_id), so authenticated students seeing counts is intentional,
-- but the view should still respect RLS rather than silently bypass it.
create or replace view public.recent_report_counts
with (security_invoker = true)
as
select
  r.route_id,
  r.stop_id,
  s.name as stop_name,
  rt.name as route_name,
  r.report_type,
  count(*)::int as report_count,
  max(r.created_at) as latest_at
from public.reports r
left join public.stops s on s.id = r.stop_id
left join public.routes rt on rt.id = r.route_id
where r.created_at >= now() - interval '24 hours'
group by r.route_id, r.stop_id, s.name, rt.name, r.report_type;

-- L-4: public_route_points — filter inactive routes at view level
-- Previously exposed inactive routes; clients filtered in JS which is bypasseable via direct API calls
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
join public.routes r on r.id = rs.route_id and r.is_active = true
join public.stops s on s.id = rs.stop_id;

-- Re-apply grants after view recreation
grant select on table public.public_route_points to authenticated;
grant select on table public.recent_report_counts to authenticated;
