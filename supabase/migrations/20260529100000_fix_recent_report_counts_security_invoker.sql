-- Restore security_invoker so RLS on reports is enforced (lost in 20260526110000).
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
  and r.status not in ('spam', 'rejected')
group by r.route_id, r.stop_id, s.name, rt.name, r.report_type;

revoke all on public.recent_report_counts from public, anon;
grant select on public.recent_report_counts to authenticated;
