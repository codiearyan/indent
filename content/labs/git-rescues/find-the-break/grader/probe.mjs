import { ticketTotal } from './fares.mjs'

const cases = [
  [['bike'], 100],
  [['adult', 'adult', 'adult', 'bike'], 2050],
  [['adult', 'adult', 'adult', 'adult', 'bike'], 2430],
  [['child', 'child', 'child', 'child'], 1170]
]
console.log(JSON.stringify(cases.map(([tickets, want]) => ({ tickets, want, got: ticketTotal(tickets) }))))
