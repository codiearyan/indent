import {
  CalendarCheck,
  CircleCheck,
  FolderCheck,
  ListChecks,
  Route,
  type LucideIcon
} from 'lucide-react'
import type { MilestoneId } from '@shared/types'

export const MILESTONE_ICONS: Record<MilestoneId, LucideIcon> = {
  'first-task': CircleCheck,
  'first-issue': ListChecks,
  'first-repo': FolderCheck,
  'streak-7': CalendarCheck,
  'streak-30': CalendarCheck,
  'streak-100': CalendarCheck,
  roadmap: Route
}
