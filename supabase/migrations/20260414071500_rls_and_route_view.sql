-- Role helpers for RLS checks
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() ->> 'app_role') = 'admin'
    or exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = 'admin'
    ),
    false
  );
$$;

create or replace function public.is_student()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() ->> 'app_role') = 'student'
    or exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = 'student'
    ),
    false
  );
$$;

create or replace function public.is_student_or_admin()
returns boolean
language sql
stable
as $$
  select public.is_student() or public.is_admin();
$$;

-- Helpful indexes
create index if not exists idx_route_stops_route_order
  on public.route_stops (route_id, stop_order);

create index if not exists idx_schedules_route_departure
  on public.schedules (route_id, departure_time);

create index if not exists idx_reports_user_created_at
  on public.reports (user_id, created_at desc);

-- Enable RLS on transport and operations tables
alter table public.routes enable row level security;
alter table public.stops enable row level security;
alter table public.route_stops enable row level security;
alter table public.schedules enable row level security;
alter table public.notices enable row level security;
alter table public.route_modifications enable row level security;
alter table public.reports enable row level security;

-- Routes
 drop policy if exists routes_select_student_or_admin on public.routes;
create policy routes_select_student_or_admin
on public.routes
for select
to authenticated
using (public.is_student_or_admin());

drop policy if exists routes_admin_all on public.routes;
create policy routes_admin_all
on public.routes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Stops
 drop policy if exists stops_select_student_or_admin on public.stops;
create policy stops_select_student_or_admin
on public.stops
for select
to authenticated
using (public.is_student_or_admin());

drop policy if exists stops_admin_all on public.stops;
create policy stops_admin_all
on public.stops
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Route stops
 drop policy if exists route_stops_select_student_or_admin on public.route_stops;
create policy route_stops_select_student_or_admin
on public.route_stops
for select
to authenticated
using (public.is_student_or_admin());

drop policy if exists route_stops_admin_all on public.route_stops;
create policy route_stops_admin_all
on public.route_stops
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Schedules
 drop policy if exists schedules_select_student_or_admin on public.schedules;
create policy schedules_select_student_or_admin
on public.schedules
for select
to authenticated
using (public.is_student_or_admin());

drop policy if exists schedules_admin_all on public.schedules;
create policy schedules_admin_all
on public.schedules
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Notices
 drop policy if exists notices_select_student_or_admin on public.notices;
create policy notices_select_student_or_admin
on public.notices
for select
to authenticated
using (public.is_student_or_admin());

drop policy if exists notices_admin_all on public.notices;
create policy notices_admin_all
on public.notices
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Route modifications
 drop policy if exists route_modifications_select_student_or_admin on public.route_modifications;
create policy route_modifications_select_student_or_admin
on public.route_modifications
for select
to authenticated
using (public.is_student_or_admin());

drop policy if exists route_modifications_admin_all on public.route_modifications;
create policy route_modifications_admin_all
on public.route_modifications
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Reports: students can create their own reports with anti-spam and credibility gates.
 drop policy if exists reports_select_own_or_admin on public.reports;
create policy reports_select_own_or_admin
on public.reports
for select
to authenticated
using (
  public.is_admin() or user_id = auth.uid()
);

drop policy if exists reports_insert_student_guarded on public.reports;
create policy reports_insert_student_guarded
on public.reports
for insert
to authenticated
with check (
  public.is_student()
  and user_id = auth.uid()
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'student'
      and u.credibility_score > 0
  )
  and (
    select count(*)
    from public.reports r
    where r.user_id = auth.uid()
      and r.created_at >= now() - interval '1 hour'
  ) < 5
);

drop policy if exists reports_admin_update on public.reports;
create policy reports_admin_update
on public.reports
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists reports_admin_delete on public.reports;
create policy reports_admin_delete
on public.reports
for delete
to authenticated
using (public.is_admin());

-- Consolidated map view: route + ordered points + cumulative deterministic minutes
create or replace view public.public_route_points as
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
