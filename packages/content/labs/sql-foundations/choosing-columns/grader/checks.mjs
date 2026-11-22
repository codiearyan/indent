import { checkQuery } from '../../sqlcheck.mjs'

export const checks = {
  'names-and-species': (t) => checkQuery(t, 'queries/1-names-and-species.sql'),
  'phone-list': (t) => checkQuery(t, 'queries/2-phone-list.sql'),
  'full-names': (t) => checkQuery(t, 'queries/3-full-names.sql'),
  'weight-in-grams': (t) => checkQuery(t, 'queries/4-weight-in-grams.sql')
}
