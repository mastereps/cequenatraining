# Database Setup

The backend uses PostgreSQL through `pg`. Persistent state includes users, catalog data, legacy carts and orders, webinar registrations, payment review state, rate limits, idempotency records, and the email outbox.

## Source Of Truth

The current local schema is composed from:

1. Root snapshot: `../fullstack_testv10.sql`
2. Ordered migrations:
   - `migrations/20260204_webinar_registration_system.sql`
   - `migrations/20260225_webinar_payment_gate.sql`
   - `migrations/20260325_webinar_manual_payment_flow.sql`
   - `migrations/20260411_add_language_webinars.sql`

Apply the migrations in filename order after restoring the snapshot. The base dump alone does not contain the full current webinar payment schema or the later webinar seed rows.

## Table Groups

| Area | Tables |
| --- | --- |
| Catalog | `books`, `book_images`, `categories`, `book_categories`, `related_books`, `events` |
| Users | `users` |
| Legacy commerce | `carts`, `cart_items`, `orders`, `order_items`, `payments`, `payment_events`, `event_registrations` |
| Webinars | `webinars`, `webinar_registrations`, `webinar_payment_sessions`, `webinar_payment_proofs`, `webinar_rate_limits` |
| Operations | `email_outbox`, `api_idempotency_keys` |

## Webinar Lifecycle

`webinar_registrations` stores attendee state:

- Registration state: `pending`, `verified`, or `cancelled`
- Payment state: `unpaid`, `proof_submitted`, `paid`, `rejected`, or `refunded`
- Delivery state: `zoom_link_sent_at`

Paid webinar proof submissions are stored in `webinar_payment_proofs`. Hosted provider checkout tracking remains in `webinar_payment_sessions`, although the current webinar frontend uses manual GCash proof review.

## Email Outbox

Business transactions append messages to `email_outbox`. The worker changes message state from `pending` to `sending`, then to `sent` or `failed`. This keeps webinar state updates and email intent in the same database transaction.

## Test Database Guidance

The default backend unit suite does not connect to PostgreSQL. Future integration tests should:

1. Use a dedicated database such as `fullstack_test_api_test`.
2. Restore the base snapshot and apply ordered migrations before the suite.
3. Disable outbound email with `EMAIL_OUTBOX_DRY_RUN=true`.
4. Clean inserted rows between tests.
5. Refuse to run when the configured database name does not clearly identify a test database.
