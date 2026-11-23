-- Task 2: fix the takings report. It must return one row per method of payment, for every
-- payment made in November 2026, however its paid_at is written:
--   method
--   payments        how many payments
--   takings_pence   what they came to
-- Keep the three columns and their names. Any order of rows.
--   node run.mjs queries/2-takings.sql

SELECT method, COUNT(*) AS payments, SUM(amount_pence) AS takings_pence
FROM payments
WHERE paid_at >= '2026-11-01' AND paid_at < '2026-12-01'
GROUP BY method;
