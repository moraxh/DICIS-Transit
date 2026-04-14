-- Enums
create type user_role as enum ('admin', 'student');
create type modification_status as enum ('active', 'resolved');
create type notice_priority as enum ('low', 'medium', 'high', 'urgent');
create type report_category as enum ('delay', 'early', 'full_bus', 'did_not_pass');
create type route_point_role as enum ('start', 'stop', 'waypoint', 'end');

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  role user_role not null default 'student', 
  username text unique,  -- Only for admin users
  password_hash text,  -- Only for admin users
  credibility_score int not null default 100, -- Only for student users
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  device_fingerprint text not null unique,
  last_ip inet not null,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now()
);

-- Transport core
create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true
);

create table if not exists stops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  latitude double precision not null,
  longitude double precision not null
);

create table if not exists route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid references routes(id) on delete cascade,
  stop_id uuid references stops(id) on delete cascade,
  point_role route_point_role not null default 'stop',
  stop_order int not null,
  time_from_previous_mins int not null,
  unique (route_id, stop_order),
  unique (route_id, stop_id)
);

create table if not exists schedules (
  id uuid primary key default gen_random_uuid(),
  route_id uuid references routes(id) on delete cascade,
  departure_time time not null,
  days_active int[] not null -- Array of integers representing days of the week (0-6)
);

-- Modifications, alerts and reports
create table if not exists route_modifications (
  id uuid primary key default gen_random_uuid(),
  route_id uuid references routes(id) on delete cascade,
  description text not null,
  status modification_status not null default 'active',
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  admin_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  priority notice_priority not null default 'medium',
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  admin_id uuid references users(id) on delete set null
);

create table if not exists reports(
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  route_id uuid references routes(id) on delete set null,
  stop_id uuid references stops(id) on delete set null,
  report_type report_category not null,
  delay_mins int, -- Only for 'delay' type
  created_at timestamptz not null default now()
);