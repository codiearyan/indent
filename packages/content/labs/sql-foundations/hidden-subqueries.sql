-- More hidden rows for the checks of the issue on subqueries. Check adds them to hidden-seed.sql:
-- a dog whose weight is above an average typed in from seed.sql but below the real one, a cat with
-- no weight, a dog that brings the average to the weight of another animal exactly, and two visits
-- to Mabel on one day, each with its own bill.

INSERT INTO animals (id, owner_id, name, species, breed, born, weight_kg) VALUES
  (340, 213, 'Juno', 'dog', 'Beagle', '2024-03-03', 10.2),
  (341, 213, 'Wisp', 'cat', NULL, NULL, NULL),
  (342, 213, 'Bramley', 'dog', 'Spaniel cross', '2022-05-30', 14.23);

INSERT INTO visits (id, animal_id, visit_date, vet, reason, notes) VALUES
  (440, 340, '2026-09-15', 'Mabel Tranter', 'Booster vaccine', NULL),
  (441, 341, '2026-09-15', 'Mabel Tranter', 'First vaccine', NULL);

INSERT INTO treatments (id, visit_id, name, kind, price) VALUES
  (540, 440, 'Booster vaccine', 'vaccine', 54.0),
  (541, 441, 'First vaccine', 'vaccine', 60.0);
