BEGIN;

-- "Past Webinars" section on the home page, placed just after Latest Events.
-- The admin curates which already-finished webinars appear here by selecting
-- their slugs in the content manager (`slugs`). With no slugs chosen the
-- section renders nothing, mirroring the component's empty-state fallback.
INSERT INTO public.page_sections (page, section_key, label, sort_order, content) VALUES
  ('home', 'past_webinars', 'Past Webinars', 52, $j${
    "heading": "Past Webinars",
    "subheading": "A look back at some of the sessions we have already run.",
    "slugs": []
  }$j$::jsonb)
ON CONFLICT (page, section_key) DO NOTHING;

COMMIT;
