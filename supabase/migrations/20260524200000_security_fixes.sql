-- HIGH-1: Fix TOCTOU race condition in login rate limiting (SELECT then UPDATE → atomic UPSERT)
-- HIGH-2: Revoke anon execute grant (prevents DoS of rate limiter via direct RPC call)
-- HIGH-6: Add atomic credibility adjustment RPC (replaces read-modify-write in admin reports)

-- HIGH-1 + HIGH-2: Replace check_and_increment_login_limit with atomic version
create or replace function public.check_and_increment_login_limit(client_ip text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts int;
  v_max_attempts constant int := 5;
  v_window_interval constant interval := interval '1 hour';
begin
  insert into public.login_attempts (ip, attempts, last_attempt)
  values (client_ip::inet, 1, now())
  on conflict (ip) do update
    set
      attempts = case
        when now() - login_attempts.last_attempt > v_window_interval
        then 1
        else login_attempts.attempts + 1
      end,
      last_attempt = now()
  returning attempts into v_attempts;

  return v_attempts <= v_max_attempts;
end;
$$;

-- HIGH-2: Revoke anon access — function is only called server-side with service role
revoke execute on function public.check_and_increment_login_limit(text) from anon;
revoke execute on function public.check_and_increment_login_limit(text) from public;

-- HIGH-6: Atomic credibility adjustment — eliminates read-modify-write race between admins
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

revoke all on function public.adjust_credibility(uuid, int) from public, anon;
grant execute on function public.adjust_credibility(uuid, int) to authenticated;
