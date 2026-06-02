# API Reference

Base path: `/api`

The frontend normally sends cookies with `credentials: "include"`. Newer auth and webinar endpoints return `{ error, details? }` on expected failures.

## Health

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/health` | Returns `{ status: "ok" }`. |

## Authentication

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/auth/me` | Returns the signed-cookie session user or `null`. |
| `POST` | `/auth/register` | Body: `name`, `email`, `password`. Creates a customer and sets the auth cookie. |
| `POST` | `/auth/login` | Body: `email`, `password`. Sets the auth cookie. |
| `POST` | `/auth/logout` | Clears the auth cookie. |

## Contact And Catalog

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/contact` | Body: `email`, `message`. Requires configured SMTP. Message limit: 5000 characters. |
| `GET` | `/events` | Returns legacy marketing event rows. |
| `GET` | `/books` | Optional query: `limit`, `offset`. Returns active books. |
| `GET` | `/books/:slug` | Returns one active book plus `images`. |
| `GET` | `/books/:slug/related` | Resolves manual relations, then shared categories, then fallback books. |

## Legacy Cart

These routes remain available but are separate from the frontend's current local-storage cart behavior.

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/cart` | Creates a server-side cart. |
| `GET` | `/cart/:cartId` | Returns cart metadata and joined items. |
| `POST` | `/cart/:cartId/items` | Body: `book_id`, `quantity`. Inserts or increments an item. |
| `PUT` | `/cart/:cartId/items/:bookId` | Body: positive `quantity`. Updates an item. Non-positive values are currently rejected. |
| `DELETE` | `/cart/:cartId/items/:bookId` | Removes an item. |
| `POST` | `/cart/:cartId/checkout` | Creates a pending order from the cart snapshot and marks the cart ordered. |

## Book Payment

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/payments/gcash` | Auth required. Body: `items: [{ id, quantity }]`. Validates books, creates a PayMongo checkout, and persists a pending order. |
| `POST` | `/webhooks/paymongo` | Requires `Paymongo-Signature`. Deduplicates provider events and updates book orders or webinar payment sessions. |

The frontend currently hides book checkout with `CART_CHECKOUT_ENABLED = false`.

## Webinars

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/webinars` | Filters: `search`, `from`, `to`, `topic`, `availability=open|full`, `limit`. Returns published upcoming webinars. |
| `GET` | `/webinars/:slug` | Returns webinar details, price metadata, seat counts, poster fields, and delivery mode. |
| `GET` | `/webinars/:slug/registration-status` | Query: `email` and/or `user_id`. A signed-in user cannot query another user id. |
| `POST` | `/webinars/:slug/register` | Body: `full_name`, `email`, optional `user_id`, optional `optional_fields`. Queues a verification email. |
| `GET` | `/verify` | Query: `token`. Verifies the registration and may queue confirmation for eligible webinars. |
| `POST` | `/webinars/:slug/payment-session` | Automatic webinar checkout compatibility endpoint. Unpaid registrations receive `409` directing them to manual proof submission. |
| `POST` | `/webinars/:slug/payment-proof` | Body: optional `email`, optional `user_id`, `reference_number`, `payer_name`, `payer_gcash_number`. Requires a verified paid-webinar registration. |
| `POST` | `/webinars/:slug/resend-confirmation` | Body: `email`. Optional `Idempotency-Key` header. Enforces rate limit and cooldown. |

## Admin Webinar Payment Review

These routes require an authenticated user with role `admin`.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/webinars/:slug/payment-proofs` | Optional query: `status=submitted|approved|rejected`. |
| `POST` | `/webinars/:slug/payment-approve` | Body: `registration_id`, optional `review_notes`. Marks payment paid and queues the appropriate email. |
| `POST` | `/webinars/:slug/payment-reject` | Body: `registration_id`, optional `review_notes`. Marks payment rejected. |
| `POST` | `/webinars/:slug/send-zoom-links` | Queues Zoom-link emails for eligible paid attendees still waiting for delivery. |
