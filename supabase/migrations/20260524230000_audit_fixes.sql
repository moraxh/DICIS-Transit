-- Fix: reports.status 'false' → 'rejected' (LOW: semantic clarity before production)
-- Update existing rows first, then recreate the constraint
update public.reports set status = 'rejected' where status = 'false';

alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports
  add constraint reports_status_check
    check (status in ('pending', 'verified', 'rejected', 'spam'));

-- Fix: delay_mins CHECK constraint — server-side enforcement (MEDIUM)
alter table public.reports
  add constraint delay_mins_range
    check (delay_mins is null or (delay_mins > 0 and delay_mins <= 120));

-- Fix: index on login_attempts.last_attempt for cleanup query (LOW)
create index if not exists idx_login_attempts_last_attempt
  on public.login_attempts(last_attempt);

-- Fix: composite index on reports for recent_report_counts view (DB)
create index if not exists idx_reports_created_at_route_stop
  on public.reports(created_at desc, route_id, stop_id);

-- Remove legacy unused columns from public.users (LOW)
alter table public.users
  drop column if exists username,
  drop column if exists password_hash;
