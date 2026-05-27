-- Auto credibility system: scores based on corroboration patterns, no manual admin adjustment.

-- 1. Add credibility columns to reports
alter table public.reports
  add column if not exists credibility_score int not null default 50,
  add column if not exists corroboration_count int not null default 0,
  add column if not exists credibility_factors jsonb not null default '{}';

-- 2. Function: compute credibility score for a single report
create or replace function public.compute_report_credibility(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report          public.reports%rowtype;
  v_score           int := 50;
  v_corroboration   int := 0;
  v_factors         jsonb := '{}';
  v_same_type_route int := 0;
  v_same_stop       int := 0;
  v_reporter_history int := 0;
  v_time_window     interval := interval '2 hours';
begin
  select * into v_report from public.reports where id = p_report_id;
  if not found then return; end if;

  -- Factor 1: other reports of same type on same route within 2h window
  if v_report.route_id is not null then
    select count(*) into v_same_type_route
    from public.reports r
    where r.id <> p_report_id
      and r.route_id = v_report.route_id
      and r.report_type = v_report.report_type
      and abs(extract(epoch from (r.created_at - v_report.created_at))) <= extract(epoch from v_time_window)
      and r.user_id <> v_report.user_id  -- must be independent reporters
      and r.status <> 'spam';
  end if;

  -- Factor 2: same stop corroboration
  if v_report.stop_id is not null then
    select count(*) into v_same_stop
    from public.reports r
    where r.id <> p_report_id
      and r.stop_id = v_report.stop_id
      and r.report_type = v_report.report_type
      and abs(extract(epoch from (r.created_at - v_report.created_at))) <= extract(epoch from v_time_window)
      and r.user_id <> v_report.user_id
      and r.status <> 'spam';
  end if;

  -- Factor 3: reporter history — how many verified reports this user has
  if v_report.user_id is not null then
    select count(*) into v_reporter_history
    from public.reports r
    where r.user_id = v_report.user_id
      and r.id <> p_report_id
      and r.status = 'verified';
  end if;

  -- Total independent corroboration (deduplicated by user via route+stop overlap)
  v_corroboration := greatest(v_same_type_route, v_same_stop);

  -- Score formula:
  --   base: 50
  --   +12 per independent corroborating report (cap at +40)
  --   +5  per stop corroboration (cap at +15)
  --   +3  per verified reporter history (cap at +10)
  v_score := 50
    + least(v_same_type_route * 12, 40)
    + least(v_same_stop * 5, 15)
    + least(v_reporter_history * 3, 10);

  -- Verified status bumps trust floor to 70
  if v_report.status = 'verified' then
    v_score := greatest(v_score, 70);
  end if;

  -- Spam/rejected status caps score
  if v_report.status in ('spam', 'rejected') then
    v_score := least(v_score, 20);
  end if;

  -- Clamp 0–100
  v_score := greatest(0, least(100, v_score));

  v_factors := jsonb_build_object(
    'same_type_route_corroborations', v_same_type_route,
    'same_stop_corroborations', v_same_stop,
    'reporter_verified_history', v_reporter_history,
    'time_window_hours', 2
  );

  update public.reports
  set credibility_score     = v_score,
      corroboration_count   = v_corroboration,
      credibility_factors   = v_factors
  where id = p_report_id;
end;
$$;

-- 3. Function: recompute credibility for all reports on same route/stop/type near a given report
create or replace function public.recompute_nearby_credibility(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.reports%rowtype;
  r        record;
begin
  select * into v_report from public.reports where id = p_report_id;
  if not found then return; end if;

  -- Recompute the new report itself
  perform public.compute_report_credibility(p_report_id);

  -- Recompute other reports that share route+type within 2h window (they gain new corroboration)
  for r in
    select id from public.reports
    where id <> p_report_id
      and route_id = v_report.route_id
      and report_type = v_report.report_type
      and abs(extract(epoch from (created_at - v_report.created_at))) <= 7200
      and status <> 'spam'
  loop
    perform public.compute_report_credibility(r.id);
  end loop;
end;
$$;

-- 4. Trigger: auto-compute on INSERT
create or replace function public.trg_report_credibility_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_nearby_credibility(new.id);
  return new;
end;
$$;

drop trigger if exists trg_report_credibility_insert on public.reports;
create trigger trg_report_credibility_insert
  after insert on public.reports
  for each row execute function public.trg_report_credibility_on_insert();

-- 5. Trigger: recompute when status changes (spam/verified affects score)
create or replace function public.trg_report_credibility_on_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    perform public.recompute_nearby_credibility(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_report_credibility_status on public.reports;
create trigger trg_report_credibility_status
  after update of status on public.reports
  for each row execute function public.trg_report_credibility_on_status_change();

-- 6. Guard trigger: block admin from writing credibility columns
create or replace function public.trg_protect_credibility_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.credibility_score is distinct from old.credibility_score
    or new.corroboration_count is distinct from old.corroboration_count
    or new.credibility_factors is distinct from old.credibility_factors)
    and public.is_admin()
  then
    raise exception 'credibility columns are read-only for admins'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_credibility on public.reports;
create trigger trg_protect_credibility
  before update on public.reports
  for each row execute function public.trg_protect_credibility_columns();

-- 7. Revoke adjust_credibility (manual admin cred adjustment) from all roles
revoke execute on function public.adjust_credibility(uuid, int) from authenticated;

-- 8. Backfill existing reports
do $$
declare
  r record;
begin
  for r in select id from public.reports order by created_at asc loop
    perform public.compute_report_credibility(r.id);
  end loop;
end;
$$;

-- 9. Grant permissions for new function (auto only, security definer — no external calls needed)
revoke all on function public.compute_report_credibility(uuid) from public, anon, authenticated;
revoke all on function public.recompute_nearby_credibility(uuid) from public, anon, authenticated;
revoke all on function public.trg_report_credibility_on_insert() from public, anon, authenticated;
revoke all on function public.trg_report_credibility_on_status_change() from public, anon, authenticated;
revoke all on function public.trg_protect_credibility_columns() from public, anon, authenticated;
