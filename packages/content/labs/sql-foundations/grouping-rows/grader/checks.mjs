import { checkQuery } from '../../sqlcheck.mjs'

export const checks = {
  'species-counts': (t) => checkQuery(t, 'queries/1-species-counts.sql'),
  'breed-counts': (t) => checkQuery(t, 'queries/2-breed-counts.sql'),
  'takings-per-kind': (t) => checkQuery(t, 'queries/3-takings-per-kind.sql', { ordered: true }),
  'big-bills': (t) => checkQuery(t, 'queries/4-big-bills.sql')
}
