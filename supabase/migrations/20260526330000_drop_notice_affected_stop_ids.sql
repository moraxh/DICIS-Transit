-- A1: drop notices.affected_stop_ids. The column was added in 20260526200000 but the UI
-- never populated it (always saved '{}'), and there's no stop-targeting feature. Removing
-- the dead column instead of half-wiring a stop selector.

alter table public.notices
  drop column if exists affected_stop_ids;
