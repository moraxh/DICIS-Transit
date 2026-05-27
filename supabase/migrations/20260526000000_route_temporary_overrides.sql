-- Route temporary overrides: non-destructive snapshot-based temporary route changes.
-- Admins edit a JSON snapshot of a route's points (stop_order, roles, active flag, coords).
-- Original route_stops rows are never modified. Restoring = deleting/expiring the override.

create table public.route_temporary_overrides (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  -- Ordered snapshot of edited points.
  -- Each element: { stop_id: uuid|null, point_role: "start"|"stop"|"waypoint"|"end",
  --                 stop_order: int, latitude: float, longitude: float,
  --                 active: bool, time_from_previous_mins: int }
  -- stop_id is null for admin-added auxiliary waypoints.
  -- active=false means the stop is skipped (excluded from Mapbox routing, shown suspended to users).
  points jsonb not null,
  -- Cached geometry from Mapbox Directions API (saved on persist to avoid public-map re-fetching).
  -- Array of [lat, lng] pairs.
  cached_geometry jsonb,
  status modification_status not null default 'active',
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  admin_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.route_temporary_overrides enable row level security;

create index idx_rto_route_active
  on public.route_temporary_overrides (route_id, status);

-- Only one active override per route at a time (enforced in app logic + unique partial index).
create unique index idx_rto_one_active_per_route
  on public.route_temporary_overrides (route_id)
  where status = 'active';

-- RLS: anyone authenticated (students + admins) can read active overrides (for public map).
create policy route_temporary_overrides_select_student_or_admin
on public.route_temporary_overrides
for select
to authenticated
using (public.is_student_or_admin());

-- RLS: only admins can insert / update / delete.
create policy route_temporary_overrides_admin_all
on public.route_temporary_overrides
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Grants.
revoke all on table public.route_temporary_overrides from public, anon;
grant select, insert, update, delete on table public.route_temporary_overrides to authenticated;
