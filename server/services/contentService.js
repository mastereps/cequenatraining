import { pool, query } from "../db.js";
import { AppError } from "../utils/errors.js";

const VALID_PAGES = new Set(["home", "about"]);

const assertValidPage = (page) => {
  const value = String(page || "").trim().toLowerCase();
  if (!VALID_PAGES.has(value)) {
    throw new AppError(404, "Unknown content page.");
  }
  return value;
};

const mapSection = (row) => ({
  id: row.id,
  page: row.page,
  section_key: row.section_key,
  label: row.label,
  sort_order: row.sort_order,
  is_visible: row.is_visible,
  content: row.content || {},
});

/**
 * Public: ordered, visible sections used to render a marketing page.
 */
export const listVisiblePageSections = async (page) => {
  const normalizedPage = assertValidPage(page);
  const result = await query(
    `
    SELECT id, page, section_key, label, sort_order, is_visible, content
    FROM public.page_sections
    WHERE page = $1
      AND is_visible = true
    ORDER BY sort_order ASC, section_key ASC
    `,
    [normalizedPage],
  );

  return result.rows.map(mapSection);
};

/**
 * Admin: every section for a page, including hidden ones.
 */
export const listAllPageSections = async (page) => {
  const normalizedPage = assertValidPage(page);
  const result = await query(
    `
    SELECT id, page, section_key, label, sort_order, is_visible, content
    FROM public.page_sections
    WHERE page = $1
    ORDER BY sort_order ASC, section_key ASC
    `,
    [normalizedPage],
  );

  return result.rows.map(mapSection);
};

/**
 * Admin: persist a new ordering for a page in a single transaction.
 * `order` is an array of { section_key, sort_order }.
 */
export const updatePageSectionOrder = async (page, order) => {
  const normalizedPage = assertValidPage(page);
  if (!Array.isArray(order) || order.length === 0) {
    throw new AppError(400, "An ordered list of sections is required.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const entry of order) {
      const sectionKey = String(entry?.section_key || "").trim();
      const sortOrder = Number(entry?.sort_order);
      if (!sectionKey || !Number.isFinite(sortOrder)) {
        throw new AppError(400, "Each order entry needs a section_key and numeric sort_order.");
      }

      await client.query(
        `
        UPDATE public.page_sections
        SET sort_order = $1
        WHERE page = $2
          AND section_key = $3
        `,
        [Math.trunc(sortOrder), normalizedPage, sectionKey],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return listAllPageSections(normalizedPage);
};

/**
 * Admin: update a single section's content and/or visibility.
 */
export const updatePageSection = async (page, sectionKey, { content, isVisible }) => {
  const normalizedPage = assertValidPage(page);
  const key = String(sectionKey || "").trim();
  if (!key) {
    throw new AppError(400, "A section key is required.");
  }

  if (content !== undefined && (typeof content !== "object" || content === null || Array.isArray(content))) {
    throw new AppError(400, "Section content must be an object.");
  }

  const result = await query(
    `
    UPDATE public.page_sections
    SET
      content = COALESCE($1::jsonb, content),
      is_visible = COALESCE($2::boolean, is_visible)
    WHERE page = $3
      AND section_key = $4
    RETURNING id, page, section_key, label, sort_order, is_visible, content
    `,
    [
      content === undefined ? null : JSON.stringify(content),
      isVisible === undefined ? null : Boolean(isVisible),
      normalizedPage,
      key,
    ],
  );

  if (result.rows.length === 0) {
    throw new AppError(404, "Section not found.");
  }

  return mapSection(result.rows[0]);
};
