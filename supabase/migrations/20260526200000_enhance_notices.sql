-- Enhance notices table with category, affected routes, and start time
DO $$ BEGIN
  CREATE TYPE notice_category AS ENUM (
    'delay',
    'detour',
    'cancellation',
    'schedule_change',
    'incident',
    'info',
    'maintenance'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.notices
  ADD COLUMN IF NOT EXISTS category notice_category NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS affected_route_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS affected_stop_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS start_at timestamptz;
