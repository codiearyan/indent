// Relative imports keep this file loadable by vitest, which has no path aliases.
import type { LabSummary, Level } from '../../../../shared/types'
import type { Status } from './labStatus'

export interface LabFilters {
  query: string
  status: 'all' | Status
  /** Shelves to keep; none means every shelf. */
  fields: string[]
  /** Language ids to keep; none means every language. */
  languages: string[]
  /** Levels to keep; none means every level. */
  levels: Level[]
}

export const NO_FILTERS: LabFilters = {
  query: '',
  status: 'all',
  fields: [],
  languages: [],
  levels: []
}

export const LEVELS: { value: Level; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' }
]

/** Within one kind of filter any choice may match; across the kinds of filter all must. */
export function matchesFilters(lab: LabSummary, status: Status, filters: LabFilters): boolean {
  const needle = filters.query.trim().toLowerCase()
  return (
    (filters.status === 'all' || filters.status === status) &&
    (filters.fields.length === 0 || filters.fields.includes(lab.category)) &&
    (filters.languages.length === 0 || filters.languages.includes(lab.language)) &&
    (filters.levels.length === 0 || (!!lab.level && filters.levels.includes(lab.level))) &&
    (!needle ||
      [lab.title, lab.description, lab.category, ...lab.tags].some((text) =>
        text.toLowerCase().includes(needle)
      ))
  )
}
