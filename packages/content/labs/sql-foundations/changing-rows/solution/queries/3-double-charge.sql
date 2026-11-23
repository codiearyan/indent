-- Task 3: Pepper's blood test on 30 September is on the bill twice, the second time typed as
-- 58 pounds. Remove that second row from treatments, and only that row, inside a transaction:
--   start a transaction
--   delete the row
--   look at Pepper's charges with a SELECT
--   keep the change
--   node run.mjs queries/3-double-charge.sql

BEGIN;

DELETE FROM treatments WHERE id = 26;

SELECT * FROM treatments WHERE visit_id = 5;

COMMIT;
