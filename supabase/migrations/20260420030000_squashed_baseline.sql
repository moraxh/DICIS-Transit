-- Squashed baseline migration (consolidates previous migrations)

create extension if not exists pgcrypto;

-- Enums
create type user_role as enum ('admin', 'student');
create type modification_status as enum ('active', 'resolved');
create type notice_priority as enum ('low', 'medium', 'high', 'urgent');
create type report_category as enum ('delay', 'early', 'full_bus', 'did_not_pass');
create type route_point_role as enum ('start', 'stop', 'waypoint', 'end');

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  role user_role not null default 'student',
  username text unique,
  password_hash text,
  credibility_score int not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  device_fingerprint text not null unique,
  last_ip inet not null,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now()
);

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  direction text not null default 'to_dicis' check (direction in ('to_dicis', 'from_dicis'))
);

create table if not exists public.stops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  latitude double precision not null,
  longitude double precision not null
);

create table if not exists public.route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid references public.routes(id) on delete cascade,
  stop_id uuid references public.stops(id) on delete cascade,
  point_role route_point_role not null default 'stop',
  stop_order int not null,
  time_from_previous_mins int not null,
  unique (route_id, stop_order),
  unique (route_id, stop_id)
);

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  route_id uuid references public.routes(id) on delete cascade,
  departure_time time not null,
  days_active int[] not null
);

create table if not exists public.route_modifications (
  id uuid primary key default gen_random_uuid(),
  route_id uuid references public.routes(id) on delete cascade,
  description text not null,
  status modification_status not null default 'active',
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  admin_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  priority notice_priority not null default 'medium',
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  admin_id uuid references public.users(id) on delete set null
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  route_id uuid references public.routes(id) on delete set null,
  stop_id uuid references public.stops(id) on delete set null,
  report_type report_category not null,
  delay_mins int,
  created_at timestamptz not null default now()
);

create table if not exists public.login_attempts (
  ip inet primary key,
  attempts int not null default 1,
  last_attempt timestamptz not null default now()
);

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

create or replace function public.check_and_increment_login_limit(client_ip text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts int;
  v_last_attempt timestamptz;
  v_max_attempts constant int := 5;
  v_window_interval constant interval := interval '1 hour';
begin
  select attempts, last_attempt into v_attempts, v_last_attempt
  from public.login_attempts
  where ip = client_ip::inet;

  if not found then
    insert into public.login_attempts (ip, attempts, last_attempt)
    values (client_ip::inet, 1, now());
    return true;
  end if;

  if now() - v_last_attempt > v_window_interval then
    update public.login_attempts
    set attempts = 1, last_attempt = now()
    where ip = client_ip::inet;
    return true;
  end if;

  if v_attempts >= v_max_attempts then
    return false;
  end if;

  update public.login_attempts
  set attempts = attempts + 1, last_attempt = now()
  where ip = client_ip::inet;

  return true;
end;
$$;

-- Helpful indexes
create index if not exists idx_route_stops_route_order
  on public.route_stops (route_id, stop_order);

create index if not exists idx_schedules_route_departure
  on public.schedules (route_id, departure_time);

create index if not exists idx_reports_user_created_at
  on public.reports (user_id, created_at desc);

-- Enable RLS
alter table public.routes enable row level security;
alter table public.stops enable row level security;
alter table public.route_stops enable row level security;
alter table public.schedules enable row level security;
alter table public.notices enable row level security;
alter table public.route_modifications enable row level security;
alter table public.reports enable row level security;
alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.login_attempts enable row level security;

-- Transport policies
create policy routes_select_student_or_admin
on public.routes
for select
to authenticated
using (public.is_student_or_admin());

create policy routes_admin_all
on public.routes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy stops_select_student_or_admin
on public.stops
for select
to authenticated
using (public.is_student_or_admin());

create policy stops_admin_all
on public.stops
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy route_stops_select_student_or_admin
on public.route_stops
for select
to authenticated
using (public.is_student_or_admin());

create policy route_stops_admin_all
on public.route_stops
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy schedules_select_student_or_admin
on public.schedules
for select
to authenticated
using (public.is_student_or_admin());

create policy schedules_admin_all
on public.schedules
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy notices_select_student_or_admin
on public.notices
for select
to authenticated
using (public.is_student_or_admin());

create policy notices_admin_all
on public.notices
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy route_modifications_select_student_or_admin
on public.route_modifications
for select
to authenticated
using (public.is_student_or_admin());

create policy route_modifications_admin_all
on public.route_modifications
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy reports_select_own_or_admin
on public.reports
for select
to authenticated
using (public.is_admin() or user_id = auth.uid());

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

create policy reports_admin_update
on public.reports
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy reports_admin_delete
on public.reports
for delete
to authenticated
using (public.is_admin());

-- Users and sessions policies
create policy "Users can read own data"
on public.users
for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "Students can insert own user"
on public.users
for insert
to authenticated
with check (
  id = auth.uid()
  and role = 'student'
  and credibility_score = 100
);

create policy "Admins can update users"
on public.users
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Users can read own sessions"
on public.sessions
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "Users can insert own session"
on public.sessions
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update own session"
on public.sessions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Admins can delete sessions"
on public.sessions
for delete
to authenticated
using (public.is_admin());

-- Views
create or replace view public.public_route_points
with (security_invoker = true)
as
select
  r.id as route_id,
  r.name as route_name,
  r.is_active as route_is_active,
  r.direction as route_direction,
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

create or replace view public.recent_report_counts as
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

-- Grants / revokes
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
revoke all on table public.recent_report_counts from public, anon;

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
grant select on table public.recent_report_counts to authenticated;

revoke all on function public.check_and_increment_login_limit(text) from public;
grant execute on function public.check_and_increment_login_limit(text) to anon;
grant execute on function public.check_and_increment_login_limit(text) to authenticated;
