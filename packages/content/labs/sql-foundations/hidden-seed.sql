-- Hidden data for the checks: other owners, animals, visits and treatments in the same tables.
-- It holds the edges the shipped data does not: values right on a limit, a town, a species and
-- a kind of treatment the shipped data never has, and more empty cells.
-- The rows added last are for sorting and totals: a tie on a birthday, a charge right on a limit,
-- a bill right on a limit, and an owner who shares an email with another.

INSERT INTO owners (id, first_name, last_name, phone, email, town) VALUES
  (201, 'Freya', 'Nkemelu', '01632 960201', NULL, 'Hollybank'),
  (202, 'Nnamdi', 'Fairlie', '01632 960202', 'nnamdi@fairlie.example', 'Brackenford'),
  (203, 'Elspeth', 'Gower', '01632 960203', 'elspeth.gower@mail.example', 'Hollybank'),
  (204, 'Rhodri', 'Lisle', '01632 960204', NULL, 'Larkhill'),
  (205, 'Mirela', 'Mabey', '01632 960205', 'mirela@mabey.example', 'Hollybank'),
  (206, 'Zainab', 'Kettering', '01632 960206', NULL, 'Fernlea'),
  (207, 'Alfie', 'Bellweather', '01632 960207', 'alfie.b@mail.example', 'Hollybank'),
  (208, 'Seren', 'Moffat', '01632 960208', 'seren@moffat.example', 'Elmstead'),
  (209, 'Duncan', 'Tull', '01632 960209', NULL, 'Hollybank'),
  (210, 'Gwen', 'Rook', '01632 960210', 'gwen.rook@mail.example', 'Larkhill'),
  (211, 'Idris', 'Wynne', '01632 960211', 'gwen.rook@mail.example', 'Larkhill');

INSERT INTO animals (id, owner_id, name, species, breed, born, weight_kg) VALUES
  (301, 201, 'Mango', 'dog', 'Labrador', '2019-01-01', 25.0),
  (302, 201, 'Sage', 'cat', 'Maine coon', '2021-04-04', 7.2),
  (303, 202, 'Rocky', 'dog', 'Boxer', '2018-08-08', 30.1),
  (304, 203, 'Daisy', 'rabbit', 'Lionhead', '2024-01-20', 1.3),
  (305, 203, 'Poppy', 'rabbit', 'Netherland dwarf', '2025-02-11', 0.7),
  (306, 204, 'Kit', 'cat', NULL, '2026-09-01', 0.6),
  (307, 205, 'Bruno', 'dog', NULL, NULL, NULL),
  (308, 205, 'Pebble', 'tortoise', NULL, NULL, 0.5),
  (309, 206, 'Squeak', 'guinea pig', 'Abyssinian', '2025-06-06', 0.97),
  (310, 206, 'Nugget', 'guinea pig', NULL, '2024-12-12', 1.0),
  (311, 207, 'Rex', 'dog', 'Yorkshire terrier mix', '2020-10-10', 3.2),
  (312, 207, 'Smudge', 'cat', 'Tabby', '2017-07-07', 5.0),
  (313, 208, 'Archie', 'dog', 'Tibetan Terrier', '2016-03-03', 11.0),
  (314, 208, 'Dot', 'ferret', NULL, '2023-05-05', 1.2),
  (315, 209, 'Luna', 'cat', NULL, NULL, 4.4),
  (316, 209, 'Max', 'dog', 'Labrador', '2015-12-25', 33.3),
  (317, 210, 'Bun', 'rabbit', NULL, '2022-02-02', NULL),
  (318, 210, 'Ginger', 'dog', 'Irish setter', '2022-06-15', 14.0),
  (319, 204, 'Clementine', 'goat', 'Pygmy goat', '2021-03-30', 28.0),
  (320, 206, 'Murphy', 'dog', 'Collie cross', '2020-11-11', 25.4),
  (321, 209, 'Tansy', 'cat', NULL, '2017-07-07', NULL);

INSERT INTO visits (id, animal_id, visit_date, vet, reason, notes) VALUES
  (401, 301, '2026-10-01', 'Ifan Pryce', 'Booster vaccine', NULL),
  (402, 303, '2026-10-31', 'Mabel Tranter', 'Cut pad', 'Cleaned and bandaged.'),
  (403, 305, '2025-10-20', 'Mabel Tranter', 'Nail trim', NULL),
  (404, 307, '2026-09-29', 'Ifan Pryce', 'Vomiting', 'Bland food for three days.'),
  (405, 309, '2026-11-02', 'Ifan Pryce', 'Weight check', NULL),
  (406, 311, '2026-10-17', 'Mabel Tranter', 'Itchy skin', 'Flea treatment given.'),
  (407, 313, '2026-03-10', 'Ifan Pryce', 'Booster vaccine', NULL),
  (408, 316, '2026-06-01', 'Mabel Tranter', 'Lump check', 'A harmless fatty lump.'),
  (409, 306, '2026-10-09', 'Ifan Pryce', 'First vaccine', NULL),
  (410, 314, '2024-10-15', 'Mabel Tranter', 'Bite wound', 'Antibiotics for a week.'),
  (411, 303, '2026-11-12', 'Mabel Tranter', 'Broken leg', 'Leg pinned. Crate rest for six weeks.'),
  (412, 312, '2026-11-19', 'Ifan Pryce', 'Dental check', 'Two teeth out.'),
  (413, 318, '2026-11-21', 'Ifan Pryce', 'Limping', NULL);

INSERT INTO treatments (id, visit_id, name, kind, price) VALUES
  (501, 401, 'Booster vaccine', 'vaccine', 54.0),
  (502, 402, 'Consultation', 'consultation', 48.0),
  (503, 402, 'Bandage', 'procedure', 18.0),
  (504, 404, 'Anti-sickness', 'medicine', 16.4),
  (505, 404, 'Blood test', 'test', 90.0),
  (506, 405, 'Weight check', 'consultation', 0.0),
  (507, 406, 'Flea treatment', 'medicine', 21.0),
  (508, 406, 'Skin scraping', 'test', 38.0),
  (509, 407, 'Booster vaccine', 'vaccine', 54.0),
  (510, 408, 'Needle sample', 'test', 70.0),
  (511, 409, 'First vaccine', 'vaccine', 60.0),
  (512, 409, 'Microchip', 'procedure', 25.0),
  (513, 410, 'Antibiotics', 'medicine', 22.3),
  (514, 410, 'Ultrasound scan', 'scan', 120.0),
  (515, 411, 'Leg surgery', 'procedure', 380.0),
  (516, 411, 'X-ray', 'test', 95.0),
  (517, 411, 'Bone plate', 'procedure', 290.0),
  (518, 412, 'Dental under anaesthetic', 'procedure', 250.0),
  (519, 413, 'Consultation', 'consultation', 48.0),
  (520, 413, 'Anti-inflammatory', 'medicine', 52.0);

-- Added for joins: Idris Wynne's son, also Idris Wynne, who shares the house phone and has two
-- animals, one of them a second Max; a second owner with no animals; a visit for that Max, a free
-- visit for Rocky, and a second visit for Ginger that costs the same as her first consultation.

INSERT INTO owners (id, first_name, last_name, phone, email, town) VALUES
  (212, 'Idris', 'Wynne', '01632 960211', NULL, 'Larkhill'),
  (213, 'Tegan', 'Ashby', '01632 960213', 'tegan@ashby.example', 'Elmstead');

INSERT INTO animals (id, owner_id, name, species, breed, born, weight_kg) VALUES
  (322, 212, 'Max', 'cat', NULL, '2024-04-04', 4.9),
  (323, 212, 'Pip', 'dog', 'Whippet', '2022-09-09', 12.6);

INSERT INTO visits (id, animal_id, visit_date, vet, reason, notes) VALUES
  (414, 322, '2026-11-05', 'Mabel Tranter', 'Booster vaccine', NULL),
  (415, 303, '2026-11-20', 'Mabel Tranter', 'Bandage change', 'Healing well.'),
  (416, 318, '2026-11-22', 'Ifan Pryce', 'Limping', 'Better. Keep resting.');

INSERT INTO treatments (id, visit_id, name, kind, price) VALUES
  (521, 414, 'Booster vaccine', 'vaccine', 54.0),
  (522, 416, 'Consultation', 'consultation', 48.0);

-- A second Rocky, another dog, who ate a sock: two visits on the same day, the first with two
-- X-rays at the same price, the second a free check.

INSERT INTO animals (id, owner_id, name, species, breed, born, weight_kg) VALUES
  (324, 205, 'Rocky', 'dog', 'Beagle', '2023-08-08', 18.2);

INSERT INTO visits (id, animal_id, visit_date, vet, reason, notes) VALUES
  (417, 324, '2026-11-14', 'Ifan Pryce', 'Ate a sock', NULL),
  (418, 324, '2026-11-14', 'Mabel Tranter', 'Sock check', 'Sock passed. No harm done.');

INSERT INTO treatments (id, visit_id, name, kind, price) VALUES
  (523, 417, 'Consultation', 'consultation', 48.0),
  (524, 417, 'X-ray', 'test', 95.0),
  (525, 417, 'X-ray', 'test', 95.0);
