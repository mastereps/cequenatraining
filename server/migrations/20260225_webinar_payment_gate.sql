BEGIN;

ALTER TABLE public.webinars
  ADD COLUMN IF NOT EXISTS price_cents integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'webinars_price_cents_non_negative'
      AND conrelid = 'public.webinars'::regclass
  ) THEN
    ALTER TABLE public.webinars
      ADD CONSTRAINT webinars_price_cents_non_negative
      CHECK (price_cents IS NULL OR price_cents >= 0);
  END IF;
END
$$;

ALTER TABLE public.webinar_registrations
  ADD COLUMN IF NOT EXISTS payment_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'webinar_registrations_payment_status_valid'
      AND conrelid = 'public.webinar_registrations'::regclass
  ) THEN
    ALTER TABLE public.webinar_registrations
      ADD CONSTRAINT webinar_registrations_payment_status_valid
      CHECK (payment_status IN ('unpaid', 'payment_pending', 'paid', 'failed', 'refunded'));
  END IF;
END
$$;

UPDATE public.webinar_registrations wr
SET payment_required = true
FROM public.webinars w
WHERE wr.webinar_id = w.id
  AND COALESCE(w.price_cents, 0) > 0;

UPDATE public.webinar_registrations
SET payment_status = 'paid',
    paid_at = COALESCE(paid_at, verified_at, NOW())
WHERE payment_required = false
  AND payment_status <> 'paid';

CREATE TABLE IF NOT EXISTS public.webinar_payment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.webinar_registrations(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'paymongo',
  provider_checkout_id text NOT NULL,
  provider_checkout_url text,
  provider_payment_id text,
  status text NOT NULL DEFAULT 'payment_pending',
  amount_cents integer NOT NULL,
  currency character(3) NOT NULL DEFAULT 'PHP',
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT webinar_payment_sessions_amount_positive CHECK (amount_cents > 0),
  CONSTRAINT webinar_payment_sessions_status_valid CHECK (
    status IN ('payment_pending', 'paid', 'failed', 'refunded', 'refund_pending', 'refund_failed')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS webinar_payment_sessions_provider_checkout_unique
  ON public.webinar_payment_sessions (provider, provider_checkout_id);

CREATE UNIQUE INDEX IF NOT EXISTS webinar_payment_sessions_provider_payment_unique
  ON public.webinar_payment_sessions (provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS webinar_payment_sessions_registration_idx
  ON public.webinar_payment_sessions (registration_id, created_at DESC);

DROP TRIGGER IF EXISTS webinar_payment_sessions_set_updated_at ON public.webinar_payment_sessions;
CREATE TRIGGER webinar_payment_sessions_set_updated_at
BEFORE UPDATE ON public.webinar_payment_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

COMMIT;
