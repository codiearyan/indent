import { checkQuery } from '../../sqlcheck.mjs'

export const checks = {
  'owner-names': (t) => checkQuery(t, 'queries/1-owner-names.sql'),
  'larkhill-animals': (t) => checkQuery(t, 'queries/2-larkhill-animals.sql'),
  'treatment-dates': (t) => checkQuery(t, 'queries/3-treatment-dates.sql'),
  'ifan-visits': (t) => checkQuery(t, 'queries/4-ifan-visits.sql', { ordered: true })
}
