import { checkQuery } from '../../sqlcheck.mjs'

export const checks = {
  'october-deliveries': (t) => checkQuery(t, 'queries/1-october-deliveries.sql', { ordered: true }),
  'driver-load': (t) => checkQuery(t, 'queries/2-driver-load.sql', { ordered: true }),
  'never-ordered': (t) => checkQuery(t, 'queries/3-never-ordered.sql')
}
