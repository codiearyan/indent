-- Hollybank Vets: the people who bring animals in, their animals, every visit,
-- and the treatments each visit was charged for.
-- Lines that start with two dashes are notes for people. SQLite skips them.

CREATE TABLE owners (
  id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,                 -- NULL when the owner never gave one
  town TEXT NOT NULL
);

CREATE TABLE animals (
  id INTEGER PRIMARY KEY,
  owner_id INTEGER NOT NULL,  -- the id of the animal's owner in owners
  name TEXT NOT NULL,
  species TEXT NOT NULL,      -- the kind of animal, in lower case: 'dog', 'cat', 'rabbit' and so on
  breed TEXT,                 -- NULL when nobody knows
  born TEXT,                  -- YYYY-MM-DD, NULL when nobody knows
  weight_kg REAL              -- NULL until the animal is first weighed
);

CREATE TABLE visits (
  id INTEGER PRIMARY KEY,
  animal_id INTEGER NOT NULL, -- the id of the animal in animals
  visit_date TEXT NOT NULL,   -- YYYY-MM-DD
  vet TEXT NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT                  -- NULL when the vet wrote none
);

CREATE TABLE treatments (
  id INTEGER PRIMARY KEY,
  visit_id INTEGER NOT NULL,  -- the id of the visit in visits
  name TEXT NOT NULL,
  kind TEXT NOT NULL,         -- 'consultation', 'vaccine', 'medicine', 'test' and so on
  price REAL NOT NULL         -- in pounds
);
