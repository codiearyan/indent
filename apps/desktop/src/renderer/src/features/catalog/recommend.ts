import type { LabSummary, Level, PathDef } from '@shared/types'
import type { Experience } from '@/stores/settings'

const LEVEL_ORDER: Record<Level, number> = { easy: 0, medium: 1, hard: 2 }

export function goalLabIds(paths: PathDef[], goal: string | null): string[] {
  const path = paths.find((p) => p.id === goal)
  return path ? path.stages.flatMap((stage) => stage.labs) : []
}

/**
 * Repos in the order to suggest them: the goal's roadmap first, then every roadmap's order, then
 * repos no roadmap names. Outside the goal, new learners get easy repos first and experienced
 * ones get easy repos last.
 */
export function recommendedOrder(
  labs: LabSummary[],
  paths: PathDef[],
  goal: string | null,
  experience: Experience | null
): LabSummary[] {
  const byId = new Map(labs.map((lab) => [lab.id, lab]))
  const fromGoal = goalLabIds(paths, goal)
  const everyPath = paths.flatMap((path) => path.stages.flatMap((stage) => stage.labs))
  const ids = [...new Set([...fromGoal, ...everyPath, ...labs.map((lab) => lab.id)])]
  const ordered = ids.flatMap((id) => byId.get(id) ?? [])
  const goalSet = new Set(fromGoal)
  const inGoal = ordered.filter((lab) => goalSet.has(lab.id))
  const rest = ordered.filter((lab) => !goalSet.has(lab.id))
  const level = (lab: LabSummary): number => LEVEL_ORDER[lab.level ?? 'medium']
  if (experience === 'new') rest.sort((a, b) => level(a) - level(b))
  if (experience === 'experienced') {
    rest.sort((a, b) => Number(a.level === 'easy') - Number(b.level === 'easy'))
  }
  return [...inGoal, ...rest]
}
