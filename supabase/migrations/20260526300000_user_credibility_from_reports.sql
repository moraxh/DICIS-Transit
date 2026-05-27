-- C1 (Opción B): derive users.credibility_score from the user's report history.
-- The auto report-credibility system (20260526100000) scores individual reports but never
-- touched users.credibility_score, leaving the insert gate (RLS credibility_score > 0) frozen
-- at 100 forever. This wires the user-level score to actual reporting behavior.
--
-- Model: base 100, penalize spam/rejected reports, reward verified reports, clamp 0-100.
-- This replaces the manual adjust_credibility flow, which is dropped below (B1).

-- 1. Function: recompute a single user's credibility from their report history
create or replace function public.recompute_user_credibility(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_verified int := 0;
  v_rejected int := 0;
  v_spam     int := 0;
  v_score    int;
begin
  if p_user_id is null then return; end if;

  select
    count(*) filter (where status = 'verified'),
    count(*) filter (where status = 'rejected'),
    count(*) filter (where status = 'spam')
  into v_verified, v_rejected, v_spam
  from public.reports
  where user_id = p_user_id;

  -- base 100, +5 per verified (cap +30), -10 per rejected, -25 per spam
  v_score := 100
    + least(v_verified * 5, 30)
    - (v_rejected * 10)
    - (v_spam * 25);

  v_score := greatest(0, least(100, v_score));

  update public.users
  set credibility_score = v_score
  where id = p_user_id;
end;
$$;

-- 2. Trigger fn: recompute on report insert (new report by user)
create or replace function public.trg_user_credibility_on_report_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_user_credibility(new.user_id);
  return new;
end;
$$;

drop trigger if exists trg_user_credibility_report_insert on public.reports;
create trigger trg_user_credibility_report_insert
  after insert on public.reports
  for each row execute function public.trg_user_credibility_on_report_insert();

-- 3. Trigger fn: recompute on report status change (moderation outcome)
create or replace function public.trg_user_credibility_on_report_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    perform public.recompute_user_credibility(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_user_credibility_report_status on public.reports;
create trigger trg_user_credibility_report_status
  after update of status on public.reports
  for each row execute function public.trg_user_credibility_on_report_status();

-- 4. Backfill all existing users from their current report history
do $$
declare
  u record;
begin
  for u in select id from public.users loop
    perform public.recompute_user_credibility(u.id);
  end loop;
end;
$$;

-- 5. Lock down the new functions (auto-only, security definer)
revoke all on function public.recompute_user_credibility(uuid) from public, anon, authenticated;
revoke all on function public.trg_user_credibility_on_report_insert() from public, anon, authenticated;
revoke all on function public.trg_user_credibility_on_report_status() from public, anon, authenticated;

-- 6. B1: drop the now-obsolete manual adjustment function.
-- Under the derived model the user score is computed, not manually set.
drop function if exists public.adjust_credibility(uuid, int);
