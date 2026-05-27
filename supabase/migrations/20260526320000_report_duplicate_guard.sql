-- C2: prevent duplicate reports. The RLS gate caps 5 reports/user/hour but allows all 5
-- to be identical, enabling spam and polluting corroboration counts. Reject a new report
-- when the same user already reported the same type for the same route/stop within 30 min.

create or replace function public.trg_reject_duplicate_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window interval := interval '30 minutes';
  v_dupe   boolean;
begin
  if new.user_id is null then
    return new;
  end if;

  select exists (
    select 1
    from public.reports r
    where r.user_id = new.user_id
      and r.report_type = new.report_type
      and r.created_at >= now() - v_window
      and r.route_id is not distinct from new.route_id
      and r.stop_id  is not distinct from new.stop_id
  ) into v_dupe;

  if v_dupe then
    raise exception 'duplicate report: same type for this route/stop within the last 30 minutes'
      using errcode = 'unique_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_reject_duplicate_report on public.reports;
create trigger trg_reject_duplicate_report
  before insert on public.reports
  for each row execute function public.trg_reject_duplicate_report();

revoke all on function public.trg_reject_duplicate_report() from public, anon, authenticated;
