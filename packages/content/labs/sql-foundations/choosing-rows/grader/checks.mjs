import { checkQuery } from '../../sqlcheck.mjs'

export const checks = {
  cats: (t) => checkQuery(t, 'queries/1-cats.sql'),
  'heavy-dogs': (t) => checkQuery(t, 'queries/2-heavy-dogs.sql'),
  'out-of-town': (t) => checkQuery(t, 'queries/3-out-of-town.sql'),
  'light-small-pets': (t) => checkQuery(t, 'queries/4-light-small-pets.sql')
}
