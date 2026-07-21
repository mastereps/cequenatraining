BEGIN;

-- Store buy-links move out of the frontend and into the database so the admin
-- Books editor can manage them. `webinar/src/utils/bookAvailability.ts` carried a
-- hardcoded map keyed by slug; the seed below moves those exact rows over.
CREATE TABLE IF NOT EXISTS public.book_external_links (
    id serial PRIMARY KEY,
    book_id integer NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    label text NOT NULL,
    url text NOT NULL,
    region text NOT NULL DEFAULT 'local',
    channel text NOT NULL DEFAULT 'marketplace',
    sort_order integer NOT NULL DEFAULT 0,
    CONSTRAINT book_external_links_region_check
        CHECK (region IN ('local', 'international')),
    CONSTRAINT book_external_links_channel_check
        CHECK (channel IN ('marketplace', 'publisher-direct'))
);

CREATE INDEX IF NOT EXISTS book_external_links_book_id_idx
    ON public.book_external_links (book_id, sort_order);

-- Per-book opt out of the on-site cart. Inert while CART_CHECKOUT_ENABLED is
-- false; `false` mirrors the old `internalAvailable: false` entry in the map.
ALTER TABLE public.books
    ADD COLUMN IF NOT EXISTS internal_purchase_enabled boolean NOT NULL DEFAULT true;

-- Idempotent: seeds a book only when it has no links yet, so re-running never
-- duplicates rows and never overwrites links an admin has since edited.
INSERT INTO public.book_external_links (book_id, label, url, region, channel, sort_order)
SELECT b.id, seed.label, seed.url, seed.region, seed.channel, seed.sort_order
FROM public.books b
JOIN (
    VALUES
        (
            'beyond-the-ordeal-book-of-poems',
            'Lazada',
            'https://www.lazada.com.ph/products/pdp-i5336173197.html?spm=a2o4l.searchlist.list.2.96a81453yd5QEl',
            'local',
            'marketplace',
            0
        ),
        (
            'beyond-the-ordeal-book-of-poems',
            'Amazon',
            'https://www.amazon.com/Beyond-Ordeal-poems-Maria-Ceque%C3%B1a-ebook/dp/B0CVW135KM',
            'international',
            'marketplace',
            1
        ),
        (
            'metacognitive-strategy-use-and-curriculum-design',
            'Ethics Press',
            'https://ethicspress.com/products/metacognitive-strategy-use-and-curriculum-design',
            'international',
            'publisher-direct',
            0
        )
) AS seed (slug, label, url, region, channel, sort_order) ON seed.slug = b.slug
WHERE NOT EXISTS (
    SELECT 1 FROM public.book_external_links existing WHERE existing.book_id = b.id
);

UPDATE public.books
SET internal_purchase_enabled = false
WHERE slug = 'metacognitive-strategy-use-and-curriculum-design'
  AND internal_purchase_enabled IS DISTINCT FROM false;

COMMIT;
