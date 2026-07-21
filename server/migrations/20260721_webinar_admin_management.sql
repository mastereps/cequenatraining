BEGIN;

-- Webinars are archived, never deleted: a hard DELETE cascades through
-- webinar_registrations, payment sessions, and payment proofs, which would
-- destroy the money trail for an event that already ran.
ALTER TABLE public.webinars
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- The admin list and the public "past webinars" view both read newest-first
-- over live rows only.
CREATE INDEX IF NOT EXISTS webinars_live_start_at_idx
  ON public.webinars (start_at DESC)
  WHERE archived_at IS NULL;

COMMIT;
