import { checkQuery } from '../../sqlcheck.mjs'

export const checks = {
  'status-counts': (t) => checkQuery(t, 'queries/1-status-counts.sql'),
  'category-prices': (t) => checkQuery(t, 'queries/2-category-prices.sql', { ordered: true }),
  'regular-cafes': (t) => checkQuery(t, 'queries/3-regular-cafes.sql', { ordered: true })
}
