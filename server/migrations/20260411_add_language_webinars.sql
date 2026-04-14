BEGIN;

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
  zoom_join_url,
  price_cents,
  poster_image_url,
  payment_qr_image_url,
  payment_instructions,
  join_link_delivery_mode
)
VALUES
  (
    'beyond-words-enhancing-comprehension-and-language-proficiency-with-a-four-pronged-approach',
    'Beyond Words: Enhancing Comprehension and Language Proficiency with a Four-Pronged Approach',
    'Language & Literacy',
    'A practical webinar on strengthening comprehension and language proficiency through a focused four-pronged instructional approach.',
    '2026-05-16 08:00:00+08',
    '2026-05-16 12:00:00+08',
    'Asia/Manila',
    300,
    true,
    true,
    NULL,
    30000,
    '/images/beyond_words_enhancing.jpg',
    '/images/G-cash.jpg',
    '1. Verify your registration email. 2. Scan the GCash QR code. 3. Pay the exact amount. 4. Submit your reference number, payer name, and GCash number for manual review.',
    'manual'
  ),
  (
    'teaching-literature-and-language-in-a-flipped-classroom',
    'Teaching Literature and Language in a Flipped Classroom',
    'Language & Literacy',
    'Strategies for teaching literature and language in a flipped classroom while improving learner engagement before, during, and after class.',
    '2026-05-30 09:00:00+08',
    '2026-05-30 12:00:00+08',
    'Asia/Manila',
    300,
    true,
    true,
    NULL,
    30000,
    '/images/teaching_literature_and_language.jpg',
    '/images/G-cash.jpg',
    '1. Verify your registration email. 2. Scan the GCash QR code. 3. Pay the exact amount. 4. Submit your reference number, payer name, and GCash number for manual review.',
    'manual'
  )
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  topic = EXCLUDED.topic,
  description = EXCLUDED.description,
  start_at = EXCLUDED.start_at,
  end_at = EXCLUDED.end_at,
  timezone = EXCLUDED.timezone,
  capacity = EXCLUDED.capacity,
  is_published = EXCLUDED.is_published,
  registration_open = EXCLUDED.registration_open,
  price_cents = EXCLUDED.price_cents,
  poster_image_url = EXCLUDED.poster_image_url,
  payment_qr_image_url = EXCLUDED.payment_qr_image_url,
  payment_instructions = EXCLUDED.payment_instructions,
  join_link_delivery_mode = EXCLUDED.join_link_delivery_mode;

COMMIT;
