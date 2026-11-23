import { checkQuery } from '../../sqlcheck.mjs'

export const checks = {
  'every-owner': (t) => checkQuery(t, 'queries/1-every-owner.sql'),
  'never-visited': (t) => checkQuery(t, 'queries/2-never-visited.sql'),
  'free-visits': (t) => checkQuery(t, 'queries/3-free-visits.sql')
}
