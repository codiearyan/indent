import { checkQuery } from '../../sqlcheck.mjs'

export const checks = {
  'above-average': (t) => checkQuery(t, 'queries/1-above-average.sql', { ordered: true }),
  'cake-buyers': (t) => checkQuery(t, 'queries/2-cake-buyers.sql'),
  'big-spenders': (t) => checkQuery(t, 'queries/3-big-spenders.sql', { ordered: true })
}
