BEGIN;

ALTER TABLE public.webinars
  ADD COLUMN IF NOT EXISTS poster_image_url text,
  ADD COLUMN IF NOT EXISTS payment_qr_image_url text,
  ADD COLUMN IF NOT EXISTS payment_instructions text,
  ADD COLUMN IF NOT EXISTS join_link_delivery_mode text NOT NULL DEFAULT 'auto';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'webinars_join_link_delivery_mode_valid'
      AND conrelid = 'public.webinars'::regclass
  ) THEN
    ALTER TABLE public.webinars
      DROP CONSTRAINT webinars_join_link_delivery_mode_valid;
  END IF;

  ALTER TABLE public.webinars
    ADD CONSTRAINT webinars_join_link_delivery_mode_valid
    CHECK (join_link_delivery_mode IN ('auto', 'manual'));
END
$$;

ALTER TABLE public.webinar_registrations
  ADD COLUMN IF NOT EXISTS zoom_link_sent_at timestamptz;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'webinar_registrations_payment_status_valid'
      AND conrelid = 'public.webinar_registrations'::regclass
  ) THEN
    ALTER TABLE public.webinar_registrations
      DROP CONSTRAINT webinar_registrations_payment_status_valid;
  END IF;

  ALTER TABLE public.webinar_registrations
    ADD CONSTRAINT webinar_registrations_payment_status_valid
    CHECK (payment_status IN ('unpaid', 'proof_submitted', 'paid', 'rejected', 'refunded'));
END
$$;

UPDATE public.webinar_registrations
SET payment_status = CASE
  WHEN payment_status = 'payment_pending' THEN 'proof_submitted'
  WHEN payment_status = 'failed' THEN 'rejected'
  ELSE payment_status
END
WHERE payment_status IN ('payment_pending', 'failed');

CREATE TABLE IF NOT EXISTS public.webinar_payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL UNIQUE REFERENCES public.webinar_registrations(id) ON DELETE CASCADE,
  reference_number text NOT NULL,
  payer_name text NOT NULL,
  payer_gcash_number text NOT NULL,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'submitted',
  review_notes text,
  submitted_at timestamptz NOT NULL DEFAULT NOW(),
  reviewed_at timestamptz,
  reviewed_by integer REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT webinar_payment_proofs_amount_positive CHECK (amount_cents > 0),
  CONSTRAINT webinar_payment_proofs_status_valid CHECK (status IN ('submitted', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS webinar_payment_proofs_status_idx
  ON public.webinar_payment_proofs (status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS webinar_payment_proofs_reviewer_idx
  ON public.webinar_payment_proofs (reviewed_by, reviewed_at DESC)
  WHERE reviewed_by IS NOT NULL;

DROP TRIGGER IF EXISTS webinar_payment_proofs_set_updated_at ON public.webinar_payment_proofs;
CREATE TRIGGER webinar_payment_proofs_set_updated_at
BEFORE UPDATE ON public.webinar_payment_proofs
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

UPDATE public.webinars
SET
  poster_image_url = COALESCE(poster_image_url, '/images/Integrating_AI_in_teaching_and_learning.jpg'),
  payment_qr_image_url = COALESCE(payment_qr_image_url, '/images/G-cash.jpg'),
  payment_instructions = COALESCE(
    payment_instructions,
    '1. Verify your registration email. 2. Scan the GCash QR code. 3. Pay the exact amount. 4. Submit your reference number, payer name, and GCash number for manual review.'
  ),
  join_link_delivery_mode = 'manual',
  price_cents = COALESCE(price_cents, 30000)
WHERE slug = 'integrating-ai-in-teaching-and-learning';

COMMIT;
