import { checkQuery } from '../../sqlcheck.mjs'

export const checks = {
  'owner-counts': (t) => checkQuery(t, 'queries/1-owner-counts.sql'),
  takings: (t) => checkQuery(t, 'queries/2-takings.sql'),
  'dog-weights': (t) => checkQuery(t, 'queries/3-dog-weights.sql'),
  'big-charges': (t) => checkQuery(t, 'queries/4-big-charges.sql')
}
