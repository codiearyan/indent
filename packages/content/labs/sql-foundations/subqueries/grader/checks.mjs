import { checkQuery } from '../../sqlcheck.mjs'

const options = { more: 'hidden-subqueries.sql', subqueries: true }

export const checks = {
  'dog-owners': (t) => checkQuery(t, 'queries/1-dog-owners.sql', options),
  'heavier-than-average': (t) => checkQuery(t, 'queries/2-heavier-than-average.sql', options),
  'fernlea-visits': (t) => checkQuery(t, 'queries/3-fernlea-visits.sql', options),
  'average-bill': (t) => checkQuery(t, 'queries/4-average-bill.sql', options)
}
