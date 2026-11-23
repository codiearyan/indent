-- Task 3: make the table reminders, for the booster letters the front desk sends.
--   id         the table's key, as in task 1
--   animal_id  a whole number, never empty
--   due        text, never empty: the date the booster is due, YYYY-MM-DD
--   send_by    text, never empty: 'phone' when a row does not say
-- Write your CREATE TABLE here, above the rows that try it.

CREATE TABLE reminders (
  id INTEGER PRIMARY KEY,
  animal_id INTEGER NOT NULL,
  due TEXT NOT NULL,
  send_by TEXT NOT NULL DEFAULT 'phone'
);

-- These rows try your table. Run the file and read what happens to each one.
-- Check runs only your CREATE TABLE, and then tries rows of its own.
INSERT INTO reminders (animal_id, due) VALUES (1, '2026-10-14');
INSERT INTO reminders (animal_id, due, send_by) VALUES (12, '2027-10-06', 'email');
INSERT INTO reminders (animal_id, due, send_by) VALUES (12, '2027-10-06', NULL);
SELECT * FROM reminders;
--   node run.mjs queries/3-reminders.sql
