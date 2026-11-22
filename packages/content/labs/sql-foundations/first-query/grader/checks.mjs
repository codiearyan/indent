import { checkQuery } from '../../sqlcheck.mjs'

export const checks = {
  'every-animal': (t) => checkQuery(t, 'queries/1-every-animal.sql'),
  'every-owner': (t) => checkQuery(t, 'queries/2-every-owner.sql'),
  'fix-the-query': (t) => checkQuery(t, 'queries/3-fix-the-query.sql')
}
