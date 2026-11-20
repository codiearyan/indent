import { gradeBand } from './board.js'

export function matches(route, query, band) {
  const text = query.trim().toLowerCase()
  if (!route.name.toLowerCase().includes(text)) return false
  return band === '' || gradeBand(route.grade) === band
}
