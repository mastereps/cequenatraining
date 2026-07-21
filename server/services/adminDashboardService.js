import { pool } from "../db.js";

const SITE_TIMEZONE = "Asia/Manila";
const WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Percent change between two periods, rounded to one decimal.
 * Returns null when there is no previous value to compare against - the UI
 * omits the delta chip rather than showing a meaningless "+100%".
 */
export const percentChange = (current, previous) => {
  const now = Number(current) || 0;
  const before = Number(previous) || 0;
  if (before <= 0) return null;
  return Math.round(((now - before) / before) * 1000) / 10;
};

const toDayKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
};

/**
 * Expands sparse `{ day, total }` rows into a dense, chronological array of
 * `days` counts ending on `endDay` (inclusive). Days with no rows read 0.
 */
export const fillDailySeries = (rows, endDay, days) => {
  const totals = new Map(
    (rows || []).map((row) => [toDayKey(row.day), Number(row.total) || 0]),
  );
  const end = new Date(`${toDayKey(endDay)}T00:00:00Z`).getTime();

  const series = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = toDayKey(new Date(end - offset * DAY_MS));
    series.push({ day, total: totals.get(day) ?? 0 });
  }
  return series;
};

const sumSeries = (series) => series.reduce((total, point) => total + point.total, 0);

const countIn = async (sql, params = []) => {
  const { rows } = await pool.query(sql, params);
  return Number(rows[0]?.total) || 0;
};

// Two 7-day windows of registrations, used for both the headline stat and the
// overview chart's this-week / last-week lines.
const loadRegistrationSeries = async () => {
  const { rows } = await pool.query(
    `
      SELECT (created_at AT TIME ZONE $1)::date AS day, COUNT(*)::int AS total
      FROM webinar_registrations
      WHERE created_at >= NOW() - ($2 || ' days')::interval
      GROUP BY 1
      ORDER BY 1
    `,
    [SITE_TIMEZONE, String(WINDOW_DAYS * 2)],
  );

  const today = new Date();
  const full = fillDailySeries(rows, today, WINDOW_DAYS * 2);
  return {
    current: full.slice(WINDOW_DAYS),
    previous: full.slice(0, WINDOW_DAYS),
  };
};

const loadStats = async (registrationSeries) => {
  const [
    totalRegistrations,
    upcomingWebinars,
    bookSales,
    bookSalesCurrent,
    bookSalesPrevious,
    revenue,
    revenueCurrent,
    revenuePrevious,
    activeUsers,
    usersCurrent,
    usersPrevious,
    publishedPages,
  ] = await Promise.all([
    countIn("SELECT COUNT(*)::int AS total FROM webinar_registrations"),
    countIn(
      "SELECT COUNT(*)::int AS total FROM webinars WHERE start_at > NOW() AND is_published",
    ),
    countIn(
      `SELECT COALESCE(SUM(oi.quantity), 0)::int AS total
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.payment_status = 'paid'`,
    ),
    countIn(
      `SELECT COALESCE(SUM(oi.quantity), 0)::int AS total
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.payment_status = 'paid' AND o.paid_at >= NOW() - INTERVAL '7 days'`,
    ),
    countIn(
      `SELECT COALESCE(SUM(oi.quantity), 0)::int AS total
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.payment_status = 'paid'
         AND o.paid_at >= NOW() - INTERVAL '14 days'
         AND o.paid_at < NOW() - INTERVAL '7 days'`,
    ),
    countIn(
      `SELECT COALESCE(SUM(COALESCE(total_cents, subtotal_cents)), 0)::bigint AS total
       FROM orders WHERE payment_status = 'paid'`,
    ),
    countIn(
      `SELECT COALESCE(SUM(COALESCE(total_cents, subtotal_cents)), 0)::bigint AS total
       FROM orders WHERE payment_status = 'paid' AND paid_at >= NOW() - INTERVAL '7 days'`,
    ),
    countIn(
      `SELECT COALESCE(SUM(COALESCE(total_cents, subtotal_cents)), 0)::bigint AS total
       FROM orders
       WHERE payment_status = 'paid'
         AND paid_at >= NOW() - INTERVAL '14 days'
         AND paid_at < NOW() - INTERVAL '7 days'`,
    ),
    countIn("SELECT COUNT(*)::int AS total FROM users"),
    countIn(
      "SELECT COUNT(*)::int AS total FROM users WHERE created_at >= NOW() - INTERVAL '7 days'",
    ),
    countIn(
      `SELECT COUNT(*)::int AS total FROM users
       WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days'`,
    ),
    countIn(
      "SELECT COUNT(*)::int AS total FROM page_sections WHERE is_visible",
    ),
  ]);

  return {
    totalRegistrations: {
      value: totalRegistrations,
      delta: percentChange(
        sumSeries(registrationSeries.current),
        sumSeries(registrationSeries.previous),
      ),
    },
    // No honest 7-day comparison exists for a forward-looking count.
    upcomingWebinars: { value: upcomingWebinars, delta: null },
    bookSales: {
      value: bookSales,
      delta: percentChange(bookSalesCurrent, bookSalesPrevious),
    },
    revenueCents: {
      value: revenue,
      delta: percentChange(revenueCurrent, revenuePrevious),
    },
    activeUsers: {
      value: activeUsers,
      delta: percentChange(usersCurrent, usersPrevious),
    },
    publishedPages: { value: publishedPages, delta: null },
  };
};

const loadUpcomingWebinars = async () => {
  const { rows } = await pool.query(
    `
      SELECT slug, title, start_at, is_published
      FROM webinars
      WHERE start_at > NOW()
      ORDER BY start_at ASC
      LIMIT 4
    `,
  );
  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    start_at: row.start_at,
    status: row.is_published ? "upcoming" : "scheduled",
  }));
};

const loadRecentRegistrations = async () => {
  const { rows } = await pool.query(
    `
      SELECT r.full_name, r.email, r.status, r.created_at, w.title AS webinar_title
      FROM webinar_registrations r
      JOIN webinars w ON w.id = r.webinar_id
      ORDER BY r.created_at DESC
      LIMIT 5
    `,
  );
  return rows;
};

const loadRecentOrders = async () => {
  const { rows } = await pool.query(
    `
      SELECT
        o.id,
        o.payment_status,
        o.paid_at,
        o.created_at,
        COALESCE(o.total_cents, o.subtotal_cents) AS total_cents,
        COALESCE(
          MIN(COALESCE(oi.item_title, b.title)),
          'Order'
        ) AS title
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN books b ON b.id = oi.book_id
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `,
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    total_cents: Number(row.total_cents) || 0,
    payment_status: row.payment_status,
    created_at: row.created_at,
  }));
};

export const getDashboardSummary = async () => {
  const registrationSeries = await loadRegistrationSeries();

  const [stats, upcomingWebinars, recentRegistrations, recentOrders] = await Promise.all([
    loadStats(registrationSeries),
    loadUpcomingWebinars(),
    loadRecentRegistrations(),
    loadRecentOrders(),
  ]);

  return {
    stats,
    registrationsSeries: registrationSeries,
    upcomingWebinars,
    recentRegistrations,
    recentOrders,
  };
};
