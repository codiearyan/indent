-- Task 1: prove it. List every payment made in November 2026 that the takings report in
-- 2-takings.sql leaves out.
-- Return three columns, in this order:
--   id
--   paid_at
--   amount_pence
-- Any order of rows.
--   node run.mjs queries/1-left-out-payments.sql

SELECT id, paid_at, amount_pence
FROM payments
WHERE paid_at > '2026-11-30' AND paid_at < '2026-12-01';
