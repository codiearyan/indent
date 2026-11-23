-- Task 4: each vet's average bill per visit.
-- A visit's bill is the prices of its treatments added up. Count only visits with at least one
-- treatment.
-- Return two columns, in this order:
--   vet
--   average_bill  the average of that vet's bills, rounded to 2 decimal places
-- One row per vet. Any order of rows.
--   node run.mjs queries/4-average-bill.sql

SELECT vet, ROUND(AVG(bill), 2) AS average_bill
FROM (
  SELECT v.vet, SUM(t.price) AS bill
  FROM visits AS v
  JOIN treatments AS t ON t.visit_id = v.id
  GROUP BY v.id, v.vet
) AS bills
GROUP BY vet;
