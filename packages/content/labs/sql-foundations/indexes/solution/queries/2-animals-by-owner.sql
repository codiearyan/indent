-- Task 2: finding an owner's animals, on their own or in a join from owners, reads every row of
-- animals. Make an index on animals so that both use it.
-- Write your CREATE INDEX here, and an EXPLAIN QUERY PLAN of your own to read the plan before
-- and after.

CREATE INDEX animals_by_owner ON animals (owner_id);

EXPLAIN QUERY PLAN SELECT name FROM animals WHERE owner_id = 9;
--   node run.mjs queries/2-animals-by-owner.sql
