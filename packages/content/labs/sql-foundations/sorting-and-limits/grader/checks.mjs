import { checkQuery } from '../../sqlcheck.mjs'

export const checks = {
  'phone-book': (t) => checkQuery(t, 'queries/1-phone-book.sql', { ordered: true }),
  'heaviest-dogs': (t) => checkQuery(t, 'queries/2-heaviest-dogs.sql', { ordered: true }),
  'visits-by-vet': (t) => checkQuery(t, 'queries/3-visits-by-vet.sql', { ordered: true }),
  'oldest-three': (t) => checkQuery(t, 'queries/4-oldest-three.sql', { ordered: true })
}
