create table if not exists public.login_attempts (
  ip inet primary key,
  attempts int not null default 1,
  last_attempt timestamptz not null default now()
);

-- Enable RLS but purposefully don't add any policies so that no client can access it directly
alter table public.login_attempts enable row level security;

-- Create an RPC function that runs with elevated privileges (security definer)
-- This allows the anonymous user in the proxy to check and update the rate limit table
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
    return true; -- Allowed
  end if;

  if now() - v_last_attempt > v_window_interval then
    update public.login_attempts
    set attempts = 1, last_attempt = now()
    where ip = client_ip::inet;
    return true; -- Allowed
  end if;

  if v_attempts >= v_max_attempts then
    return false; -- Blocked
  end if;

  update public.login_attempts
  set attempts = attempts + 1, last_attempt = now()
  where ip = client_ip::inet;

  return true; -- Allowed
end;
$$;
