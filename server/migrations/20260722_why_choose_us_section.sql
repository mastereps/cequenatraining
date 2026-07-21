BEGIN;

-- "Why Choose Us" section on the home page, between What We Do and Featured
-- Books. Values mirror the component's hardcoded defaults so the rendered page
-- is identical whether or not this row is present.
INSERT INTO public.page_sections (page, section_key, label, sort_order, content) VALUES
  ('home', 'why_choose_us', 'Why Choose Us', 35, $j${
    "eyebrow": "Why Choose Us",
    "heading": "Learning Built for Educators",
    "subheading": "Credible sessions, CPD growth, and publications for researchers, teachers, and lifelong learners.",
    "cta_label": "Explore Webinars",
    "reasons": [
      { "title": "Expert-Led Webinars", "text": "Sessions led by seasoned educators and researchers." },
      { "title": "CPD Units for Members", "text": "Earn CPD units from qualified webinars." },
      { "title": "Made for Researchers & Teachers", "text": "Topics built around real teaching and research." },
      { "title": "Flexible Online Learning", "text": "Join from anywhere, on your own schedule." },
      { "title": "Internationally Recognized Books", "text": "Titles with genuine academic standing." },
      { "title": "Local Poetry & Cultural Works", "text": "Filipino poetry and literary works worth keeping." }
    ]
  }$j$::jsonb)
ON CONFLICT (page, section_key) DO NOTHING;

COMMIT;
