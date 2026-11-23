import { checkQuery } from '../../sqlcheck.mjs'

export const checks = {
  'november-calls': (t) => checkQuery(t, 'queries/1-november-calls.sql'),
  'animals-per-owner': (t) => checkQuery(t, 'queries/2-animals-per-owner.sql'),
  'spent-per-animal': (t) => checkQuery(t, 'queries/3-spent-per-animal.sql'),
  'dogs-per-owner': (t) => checkQuery(t, 'queries/4-dog-counts.sql')
}
