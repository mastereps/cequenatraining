BEGIN;

-- Smoke test for the automatic migration runner, and a useful comment in its
-- own right. Metadata only: no schema change, no data change, no lock beyond
-- the catalog row for this table.
COMMENT ON TABLE public.page_sections IS
  'Editable, reorderable marketing page sections (home, about). One row per section; content holds the curated editable fields.';

COMMIT;
