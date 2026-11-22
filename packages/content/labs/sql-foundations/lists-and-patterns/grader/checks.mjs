import { checkQuery } from '../../sqlcheck.mjs'

export const checks = {
  'vaccines-and-tests': (t) => checkQuery(t, 'queries/1-vaccines-and-tests.sql'),
  terriers: (t) => checkQuery(t, 'queries/2-terriers.sql'),
  'october-visits': (t) => checkQuery(t, 'queries/3-october-visits.sql'),
  'other-species': (t) => checkQuery(t, 'queries/4-other-species.sql')
}
