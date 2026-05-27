-- A3: corroboration_count stored the MAX of the two corroboration channels (route, stop)
-- via greatest(), undercounting reports corroborated on both. The score formula already
-- sums them separately and correctly, so only the stored count was wrong. Switch to SUM.
-- Only the corroboration line changes; the rest of compute_report_credibility is unchanged.

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

  if v_report.route_id is not null then
    select count(*) into v_same_type_route
    from public.reports r
    where r.id <> p_report_id
      and r.route_id = v_report.route_id
      and r.report_type = v_report.report_type
      and abs(extract(epoch from (r.created_at - v_report.created_at))) <= extract(epoch from v_time_window)
      and r.user_id <> v_report.user_id
      and r.status <> 'spam';
  end if;

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

  if v_report.user_id is not null then
    select count(*) into v_reporter_history
    from public.reports r
    where r.user_id = v_report.user_id
      and r.id <> p_report_id
      and r.status = 'verified';
  end if;

  -- A3 fix: sum both corroboration channels instead of taking the max.
  v_corroboration := v_same_type_route + v_same_stop;

  v_score := 50
    + least(v_same_type_route * 12, 40)
    + least(v_same_stop * 5, 15)
    + least(v_reporter_history * 3, 10);

  if v_report.status = 'verified' then
    v_score := greatest(v_score, 70);
  end if;

  if v_report.status in ('spam', 'rejected') then
    v_score := least(v_score, 20);
  end if;

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

revoke all on function public.compute_report_credibility(uuid) from public, anon, authenticated;
