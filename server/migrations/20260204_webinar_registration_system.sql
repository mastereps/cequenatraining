BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE OR REPLACE FUNCTION public.set_row_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.webinars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  topic text NOT NULL DEFAULT 'General',
  description text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Manila',
  capacity integer,
  is_published boolean NOT NULL DEFAULT false,
  registration_open boolean NOT NULL DEFAULT true,
  zoom_join_url text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT webinars_capacity_non_negative CHECK (capacity IS NULL OR capacity >= 0),
  CONSTRAINT webinars_end_after_start CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS webinars_start_at_idx ON public.webinars (start_at);
CREATE INDEX IF NOT EXISTS webinars_topic_idx ON public.webinars (topic);
CREATE INDEX IF NOT EXISTS webinars_public_idx
  ON public.webinars (is_published, registration_open, start_at);

DROP TRIGGER IF EXISTS webinars_set_updated_at ON public.webinars;
CREATE TRIGGER webinars_set_updated_at
BEFORE UPDATE ON public.webinars
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TABLE IF NOT EXISTS public.webinar_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id uuid NOT NULL REFERENCES public.webinars(id) ON DELETE CASCADE,
  email citext NOT NULL,
  full_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  verify_token_hash text,
  verify_token_expires_at timestamptz,
  verified_at timestamptz,
  zoom_registrant_join_url text,
  optional_fields_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_verification_email_sent_at timestamptz,
  last_confirmation_email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT webinar_registrations_status_valid CHECK (
    status IN ('pending', 'verified', 'cancelled')
  ),
  CONSTRAINT webinar_registrations_unique_email_per_webinar UNIQUE (webinar_id, email)
);

CREATE INDEX IF NOT EXISTS webinar_registrations_webinar_status_idx
  ON public.webinar_registrations (webinar_id, status);
CREATE INDEX IF NOT EXISTS webinar_registrations_verify_token_hash_idx
  ON public.webinar_registrations (verify_token_hash)
  WHERE verify_token_hash IS NOT NULL;

DROP TRIGGER IF EXISTS webinar_registrations_set_updated_at ON public.webinar_registrations;
CREATE TRIGGER webinar_registrations_set_updated_at
BEFORE UPDATE ON public.webinar_registrations
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TABLE IF NOT EXISTS public.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email citext NOT NULL,
  template_key text NOT NULL,
  payload_json jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  sent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT email_outbox_status_valid CHECK (
    status IN ('pending', 'sending', 'sent', 'failed')
  )
);

CREATE INDEX IF NOT EXISTS email_outbox_status_created_at_idx
  ON public.email_outbox (status, created_at);

DROP TRIGGER IF EXISTS email_outbox_set_updated_at ON public.email_outbox;
CREATE TRIGGER email_outbox_set_updated_at
BEFORE UPDATE ON public.email_outbox
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TABLE IF NOT EXISTS public.webinar_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key text NOT NULL,
  webinar_id uuid NOT NULL REFERENCES public.webinars(id) ON DELETE CASCADE,
  email citext NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT webinar_rate_limits_unique_window UNIQUE (action_key, webinar_id, email, window_start)
);

CREATE INDEX IF NOT EXISTS webinar_rate_limits_lookup_idx
  ON public.webinar_rate_limits (action_key, webinar_id, email, window_start DESC);

DROP TRIGGER IF EXISTS webinar_rate_limits_set_updated_at ON public.webinar_rate_limits;
CREATE TRIGGER webinar_rate_limits_set_updated_at
BEFORE UPDATE ON public.webinar_rate_limits
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TABLE IF NOT EXISTS public.api_idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_key text NOT NULL,
  idempotency_key_hash text NOT NULL,
  webinar_id uuid NOT NULL REFERENCES public.webinars(id) ON DELETE CASCADE,
  email citext NOT NULL,
  response_status integer NOT NULL,
  response_body_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT api_idempotency_unique_endpoint_hash UNIQUE (endpoint_key, idempotency_key_hash)
);

CREATE INDEX IF NOT EXISTS api_idempotency_keys_expiry_idx
  ON public.api_idempotency_keys (expires_at);

INSERT INTO public.webinars (
  slug,
  title,
  topic,
  description,
  start_at,
  end_at,
  timezone,
  capacity,
  is_published,
  registration_open,
  zoom_join_url
)
VALUES
  (
    'research-writing-for-publication',
    'Research Writing for Publication',
    'Research & Publication',
    'Learn practical strategies for developing publication-ready manuscripts and navigating peer review.',
    '2026-03-15 08:30:00+08',
    '2026-03-15 10:30:00+08',
    'Asia/Manila',
    300,
    true,
    true,
    'https://zoom.us/j/9100100100?pwd=research'
  ),
  (
    'flipped-model-in-an-online-platform',
    'Flipped Model in an Online Platform',
    'Digital Learning',
    'Explore flipped learning frameworks that improve engagement in synchronous and asynchronous classes.',
    '2026-03-22 08:00:00+08',
    '2026-03-22 11:00:00+08',
    'Asia/Manila',
    250,
    true,
    true,
    'https://zoom.us/j/9100100200?pwd=flipped'
  ),
  (
    'integrating-21st-century-skills-in-a-digital-classroom',
    'Integrating 21st Century Skills in a Digital Classroom',
    'Classroom Strategies',
    'A practical workshop on embedding communication, collaboration, and critical thinking in digital instruction.',
    '2026-03-29 08:00:00+08',
    '2026-03-29 10:00:00+08',
    'Asia/Manila',
    200,
    true,
    true,
    'https://zoom.us/j/9100100300?pwd=skills'
  )
ON CONFLICT (slug) DO NOTHING;

COMMIT;
