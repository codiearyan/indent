import { useSettings } from '@/stores/settings'
import { TOUR, type TourAnchor } from './anchors'

export interface TourStep {
  anchor: TourAnchor
  title: string
  text: string
  /** The label of the button that moves on, when it does more than show the next step. */
  next?: string
  /** Makes the target visible before the step looks for it. */
  prepare?(): void
}

const showLeft = (tab: 'insights' | 'tasks') => (): void => {
  const settings = useSettings.getState()
  settings.setPanel('zen', false)
  settings.setLeftTab(tab)
}

const showTerminal = (): void => useSettings.getState().setPanel('zen', false)

export const TOUR_STEPS: TourStep[] = [
  {
    anchor: TOUR.insightsTab,
    title: 'Lesson',
    text: 'The story and the ideas you need. Press play at the bottom to hear it read aloud.',
    prepare: showLeft('insights')
  },
  {
    anchor: TOUR.tasksTab,
    title: 'Tasks',
    text: 'What you build. Check a task to run its hidden tests; hints unlock as checks fail.',
    prepare: showLeft('tasks')
  },
  {
    anchor: TOUR.editor,
    title: 'The editor',
    text: 'Write your code here. It saves to disk as you type.'
  },
  {
    anchor: TOUR.checkAll,
    title: 'Run checks',
    text: 'Runs every check at once when you think you are done.'
  },
  {
    anchor: TOUR.terminal,
    title: 'A real terminal',
    text: "A shell in this issue's folder. Run your code and explore. Checks do not need it.",
    prepare: showTerminal
  },
  {
    anchor: TOUR.chat,
    title: 'Tutor',
    text: 'Ask about this issue. It knows your lesson, tasks, open file and latest check. Switch the AI under the message box.'
  }
]
