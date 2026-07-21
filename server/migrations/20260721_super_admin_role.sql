BEGIN;

-- Introduces the `super_admin` role. `users.role` is a plain text column with no
-- CHECK constraint, so only the seed promotion is needed here.
--
-- Role ladder: customer < admin < super_admin. A super admin can do everything an
-- admin can, plus manage page content.
--
-- Idempotent: re-running promotes nobody. If the seed account does not exist yet,
-- register it first and re-run the migration.
UPDATE public.users
SET role = 'super_admin'
WHERE lower(email) = 'goliathdavid024@gmail.com'
  AND role IS DISTINCT FROM 'super_admin';

COMMIT;
