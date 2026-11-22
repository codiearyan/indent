import type { LabSummary, PathDef } from '@shared/types'
import type { Experience } from '@/stores/settings'

/** The repos of the roadmaps picked as goals, in the order the goals were picked. */
export function goalLabIds(paths: PathDef[], goals: string[]): string[] {
  return goals.flatMap(
    (goal) => paths.find((p) => p.id === goal)?.stages.flatMap((stage) => stage.labs) ?? []
  )
}

/**
 * Repos in the order to suggest them: the roadmaps picked as goals first, then every roadmap's
 * order, then repos no roadmap names. Outside the goals, new learners, and anyone without a goal
 * who is not experienced, get foundations first; experienced ones get foundations last.
 */
export function recommendedOrder(
  labs: LabSummary[],
  paths: PathDef[],
  goals: string[],
  experience: Experience | null
): LabSummary[] {
  const byId = new Map(labs.map((lab) => [lab.id, lab]))
  const fromGoal = goalLabIds(paths, goals)
  const everyPath = paths.flatMap((path) => path.stages.flatMap((stage) => stage.labs))
  const ids = [...new Set([...fromGoal, ...everyPath, ...labs.map((lab) => lab.id)])]
  const ordered = ids.flatMap((id) => byId.get(id) ?? [])
  const goalSet = new Set(fromGoal)
  const inGoal = ordered.filter((lab) => goalSet.has(lab.id))
  const rest = ordered.filter((lab) => !goalSet.has(lab.id))
  const foundations = (lab: LabSummary): number => Number(lab.kind === 'foundations')
  if (experience === 'new' || (inGoal.length === 0 && experience !== 'experienced')) {
    rest.sort((a, b) => foundations(b) - foundations(a))
  }
  if (experience === 'experienced') {
    rest.sort((a, b) => foundations(a) - foundations(b))
  }
  return [...inGoal, ...rest]
}
