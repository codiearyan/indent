import { checkQuery } from '../../sqlcheck.mjs'

export const checks = {
  'no-email': (t) => checkQuery(t, 'queries/1-no-email.sql'),
  'visit-notes': (t) => checkQuery(t, 'queries/2-visit-notes.sql'),
  'not-labradors': (t) => checkQuery(t, 'queries/3-not-labradors.sql'),
  'contact-list': (t) => checkQuery(t, 'queries/4-contact-list.sql')
}
