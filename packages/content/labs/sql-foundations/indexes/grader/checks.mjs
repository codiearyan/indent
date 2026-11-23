import { checkIndex } from '../../sqlcheck.mjs'

export const checks = {
  'index-by-date': (t) =>
    checkIndex(t, 'queries/1-visit-dates.sql', {
      plans: [
        { sql: "SELECT * FROM visits WHERE visit_date = '2026-09-30'", about: 'a search for the visits of one date' },
        { sql: "SELECT * FROM visits WHERE visit_date BETWEEN '2026-10-01' AND '2026-10-31'", about: 'a search for the visits of a range of dates' }
      ]
    }),
  'index-by-owner': (t) =>
    checkIndex(t, 'queries/2-animals-by-owner.sql', {
      plans: [
        { sql: 'SELECT name, species FROM animals WHERE owner_id = 5', about: "a search for one owner's animals" },
        {
          sql: "SELECT o.last_name, a.name FROM owners AS o JOIN animals AS a ON a.owner_id = o.id WHERE o.town = 'Hollybank'",
          about: 'a join from the owners in one town to their animals'
        }
      ]
    }),
  'index-vet-and-date': (t) =>
    checkIndex(t, 'queries/3-vet-and-date.sql', {
      plans: [
        {
          sql: "SELECT visit_date, reason FROM visits WHERE vet = 'Mabel Tranter' AND visit_date >= '2026-10-01'",
          about: "a search for one vet's visits from a date on",
          search: 'vet=? AND visit_date>?'
        }
      ]
    }),
  'drop-unused-index': (t) =>
    checkIndex(t, 'queries/4-unused-index.sql', { keep: ['treatments_by_visit', 'owners_by_town'] })
}
