import { checkQuery } from '../../sqlcheck.mjs'

export const checks = {
  'port-ellery-cafes': (t) => checkQuery(t, 'queries/1-port-ellery-cafes.sql', { ordered: true }),
  'shelf-picks': (t) => checkQuery(t, 'queries/2-shelf-picks.sql'),
  'missing-emails': (t) => checkQuery(t, 'queries/3-missing-emails.sql', { ordered: true })
}
