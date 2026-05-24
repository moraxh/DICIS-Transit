-- DB-1: Index on reports.created_at for recent_report_counts view (full table scan → index scan)
create index if not exists idx_reports_created_at_desc
  on public.reports(created_at desc);

-- DB-2: Cleanup stale login_attempts rows (prevents unbounded table growth)
-- Rows older than 7 days are safe to delete (window is 1 hour, 7 days is very conservative)
delete from public.login_attempts
  where last_attempt < now() - interval '7 days';

-- MEDIUM-2: Document that recent_report_counts intentionally exposes aggregated data
-- to authenticated users. No PII (user_id) is exposed — only counts per route/stop.
comment on view public.recent_report_counts is
  'Intentionally readable by authenticated users. Exposes aggregated report counts
   per route/stop for the past 24 hours. No user_id exposed. Used for map markers.';
