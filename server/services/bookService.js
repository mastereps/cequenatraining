import { pool, query } from "../db.js";
import { AppError } from "../utils/errors.js";
import { normalizeSlug } from "../utils/validation.js";

const BOOK_COLUMNS = `
  id,
  slug,
  title,
  price_cents,
  currency,
  cover_image_url,
  short_description,
  details,
  in_stock,
  is_active,
  internal_purchase_enabled,
  created_at
`;

const REGIONS = new Set(["local", "international"]);
const CHANNELS = new Set(["marketplace", "publisher-direct"]);

// Re-exported so /products/:slug callers and the existing tests keep their import site.
export { normalizeSlug };

const trimmed = (value, maxLength) => String(value ?? "").trim().slice(0, maxLength);

/**
 * Buy-links are rendered as anchors on the storefront, so only http(s) is
 * accepted - a `javascript:` url here would be a stored XSS.
 */
export const parseExternalLinks = (raw) => {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    throw new AppError(400, "External links must be a list.");
  }
  if (raw.length > 20) {
    throw new AppError(400, "A book can have at most 20 external links.");
  }

  return raw.map((entry, index) => {
    const label = trimmed(entry?.label, 80);
    const url = trimmed(entry?.url, 2000);
    const region = trimmed(entry?.region, 20) || "local";
    const channel = trimmed(entry?.channel, 20) || "marketplace";

    if (!label) throw new AppError(400, "Every external link needs a label.");
    if (!/^https?:\/\/\S+$/i.test(url)) {
      throw new AppError(400, `"${label}" needs a link starting with http:// or https://.`);
    }
    if (!REGIONS.has(region)) {
      throw new AppError(400, `"${label}" has an unknown region.`);
    }
    if (!CHANNELS.has(channel)) {
      throw new AppError(400, `"${label}" has an unknown channel.`);
    }

    return { label, url, region, channel, sort_order: index };
  });
};

/**
 * Validates the editable book columns. With `partial`, absent keys are left out
 * so a PATCH only touches what it sent.
 */
export const parseBookInput = (payload, { partial = false } = {}) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new AppError(400, "A book payload is required.");
  }

  const fields = {};
  const has = (key) => payload[key] !== undefined;

  if (!partial || has("slug") || has("title")) {
    const title = trimmed(payload.title, 300);
    if (!partial || has("title")) {
      if (!title) throw new AppError(400, "A title is required.");
      fields.title = title;
    }
    // A blank slug on create is derived from the title.
    const slug = normalizeSlug(payload.slug || (partial ? "" : title));
    if (!partial || has("slug")) {
      if (!slug) throw new AppError(400, "A url slug is required.");
      fields.slug = slug;
    }
  }

  if (!partial || has("price_cents")) {
    const price = Number(payload.price_cents);
    if (!Number.isInteger(price) || price < 0) {
      throw new AppError(400, "Price must be a whole number of centavos, 0 or more.");
    }
    fields.price_cents = price;
  }

  if (!partial || has("currency")) {
    // Not truncated to 3 first: "PESOS" should be rejected, not read as "PES".
    const currency = trimmed(payload.currency, 20).toUpperCase() || "PHP";
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new AppError(400, "Currency must be a 3-letter code, for example PHP.");
    }
    fields.currency = currency;
  }

  if (!partial || has("cover_image_url")) {
    const cover = trimmed(payload.cover_image_url, 2000);
    if (!cover) throw new AppError(400, "A cover image is required.");
    fields.cover_image_url = cover;
  }

  if (has("short_description")) {
    fields.short_description = trimmed(payload.short_description, 1000) || null;
  }
  if (has("details")) {
    fields.details = trimmed(payload.details, 20000) || null;
  }
  if (has("in_stock")) {
    fields.in_stock = Boolean(payload.in_stock);
  }
  if (has("internal_purchase_enabled")) {
    fields.internal_purchase_enabled = Boolean(payload.internal_purchase_enabled);
  }

  return fields;
};

const mapBook = (row, links = []) => ({
  ...row,
  external_links: links,
});

/** Links for a set of books, grouped by book id. */
export const listExternalLinksByBookIds = async (bookIds) => {
  const grouped = new Map();
  if (!Array.isArray(bookIds) || bookIds.length === 0) return grouped;

  const result = await query(
    `
    SELECT book_id, label, url, region, channel
    FROM public.book_external_links
    WHERE book_id = ANY($1::int[])
    ORDER BY book_id ASC, sort_order ASC, id ASC
    `,
    [bookIds],
  );

  for (const row of result.rows) {
    const list = grouped.get(row.book_id) || [];
    list.push({
      label: row.label,
      url: row.url,
      region: row.region,
      channel: row.channel,
    });
    grouped.set(row.book_id, list);
  }

  return grouped;
};

const attachLinks = async (rows) => {
  const grouped = await listExternalLinksByBookIds(rows.map((row) => row.id));
  return rows.map((row) => mapBook(row, grouped.get(row.id) || []));
};

/** Admin: every book, archived ones included unless filtered out. */
export const listBooksForAdmin = async ({ includeArchived = true } = {}) => {
  const result = await query(
    `
    SELECT ${BOOK_COLUMNS}
    FROM public.books
    ${includeArchived ? "" : "WHERE is_active = true"}
    ORDER BY id ASC
    `,
  );

  return attachLinks(result.rows);
};

const replaceExternalLinks = async (client, bookId, links) => {
  await client.query("DELETE FROM public.book_external_links WHERE book_id = $1", [bookId]);
  for (const link of links) {
    await client.query(
      `
      INSERT INTO public.book_external_links (book_id, label, url, region, channel, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [bookId, link.label, link.url, link.region, link.channel, link.sort_order],
    );
  }
};

// `slug` is unique; surface the collision as a 409 instead of a 500.
const rethrowSlugConflict = (error) => {
  if (error?.code === "23505") {
    throw new AppError(409, "Another book already uses that url slug.");
  }
  throw error;
};

export const createBook = async (payload) => {
  const fields = parseBookInput(payload);
  const links = parseExternalLinks(payload?.external_links) || [];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query(
      `
      INSERT INTO public.books (
        slug, title, price_cents, currency, cover_image_url,
        short_description, details, in_stock, internal_purchase_enabled
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING ${BOOK_COLUMNS}
      `,
      [
        fields.slug,
        fields.title,
        fields.price_cents,
        fields.currency,
        fields.cover_image_url,
        fields.short_description ?? null,
        fields.details ?? null,
        fields.in_stock ?? true,
        fields.internal_purchase_enabled ?? true,
      ],
    );

    const book = inserted.rows[0];
    await replaceExternalLinks(client, book.id, links);
    await client.query("COMMIT");
    return mapBook(book, links.map(({ sort_order: _sortOrder, ...link }) => link));
  } catch (error) {
    await client.query("ROLLBACK");
    return rethrowSlugConflict(error);
  } finally {
    client.release();
  }
};

export const updateBook = async (bookId, payload) => {
  const id = Number(bookId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(404, "Book not found.");
  }

  const fields = parseBookInput(payload, { partial: true });
  const links = parseExternalLinks(payload?.external_links);

  if (Object.keys(fields).length === 0 && links === undefined) {
    throw new AppError(400, "Nothing to update.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let row;
    if (Object.keys(fields).length > 0) {
      const entries = Object.entries(fields);
      const assignments = entries.map(([column], index) => `${column} = $${index + 2}`);
      const updated = await client.query(
        `
        UPDATE public.books
        SET ${assignments.join(", ")}
        WHERE id = $1
        RETURNING ${BOOK_COLUMNS}
        `,
        [id, ...entries.map(([, value]) => value)],
      );
      row = updated.rows[0];
    } else {
      const existing = await client.query(
        `SELECT ${BOOK_COLUMNS} FROM public.books WHERE id = $1`,
        [id],
      );
      row = existing.rows[0];
    }

    if (!row) {
      throw new AppError(404, "Book not found.");
    }

    if (links !== undefined) {
      await replaceExternalLinks(client, id, links);
    }

    await client.query("COMMIT");
    const grouped = await listExternalLinksByBookIds([id]);
    return mapBook(row, grouped.get(id) || []);
  } catch (error) {
    await client.query("ROLLBACK");
    return rethrowSlugConflict(error);
  } finally {
    client.release();
  }
};

/**
 * Archive rather than delete. Books are referenced by cart_items, order_items
 * and related_books; removing the row would either fail or orphan past orders.
 * The storefront already filters on is_active, so archiving hides it at once.
 */
export const setBookActive = async (bookId, isActive) => {
  const id = Number(bookId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(404, "Book not found.");
  }

  const result = await query(
    `
    UPDATE public.books
    SET is_active = $2
    WHERE id = $1
    RETURNING ${BOOK_COLUMNS}
    `,
    [id, Boolean(isActive)],
  );

  if (result.rows.length === 0) {
    throw new AppError(404, "Book not found.");
  }

  const grouped = await listExternalLinksByBookIds([id]);
  return mapBook(result.rows[0], grouped.get(id) || []);
};
