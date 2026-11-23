-- Hidden rows for the checks of the issues that change rows. Check adds them to the issue's own
-- seed.sql, so a WHERE or an id that only fits the rows the learner can see changes a row it should
-- not: an owner whose id is the next free one in seed.sql, a second dog called Moss, a second dog of
-- Agnes Dimmock's with no breed and Moss's weight, another blood test typed as 58 pounds, and visits
-- in 2024, on the last day of 2025 and on the first day of 2026.

INSERT INTO owners (id, first_name, last_name, phone, email, town) VALUES
  (14, 'Owain', 'Rhys', '01632 960214', NULL, 'Fernlea'),
  (214, 'Delyth', 'Marsh', '01632 960215', 'delyth@marsh.example', 'Larkhill');

INSERT INTO animals (id, owner_id, name, species, breed, born, weight_kg) VALUES
  (330, 4, 'Sorrel', 'dog', NULL, NULL, 22.4),
  (331, 214, 'Moss', 'dog', NULL, '2020-04-04', 22.4);

INSERT INTO visits (id, animal_id, visit_date, vet, reason, notes) VALUES
  (430, 331, '2024-06-11', 'Ifan Pryce', 'Booster vaccine', NULL),
  (431, 330, '2025-12-31', 'Mabel Tranter', 'Cough', 'Kennel cough. Rest for a week.'),
  (432, 330, '2026-01-01', 'Ifan Pryce', 'Cough check', NULL);

INSERT INTO treatments (id, visit_id, name, kind, price) VALUES
  (530, 431, 'Blood test', 'test', 58.0),
  (531, 432, 'Consultation', 'consultation', 45.0);
