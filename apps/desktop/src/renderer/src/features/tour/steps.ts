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
    anchor: TOUR.tasksTab,
    title: 'Tasks',
    text: 'This is what you build in this issue. A task turns green once your code passes its hidden checks.',
    prepare: showLeft('tasks')
  },
  {
    anchor: TOUR.insightsTab,
    title: 'Lesson',
    text: 'The lesson: the story, the problem and the ideas you need for the tasks.',
    prepare: showLeft('insights')
  },
  {
    anchor: TOUR.audio,
    title: 'Read aloud',
    text: 'Have the lesson read aloud, part by part, while you keep reading or coding.',
    prepare: showLeft('insights')
  },
  {
    anchor: TOUR.taskCheck,
    title: 'Check',
    text: 'Runs the hidden tests for just this task and tells you in plain words what to look at.',
    prepare: showLeft('tasks')
  },
  {
    anchor: TOUR.taskNext,
    title: 'Help',
    text: 'Next steps, then hints as checks fail, then the tutor. It says what you can open now and what unlocks next.',
    prepare: showLeft('tasks')
  },
  {
    anchor: TOUR.editorTabs,
    title: 'Your files',
    text: 'The files you have open, starting with the ones this issue is about. Switch or close them here.'
  },
  {
    anchor: TOUR.editor,
    title: 'The editor',
    text: 'Write your code here. Everything saves to disk as you type.'
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
    text: 'A chat that knows the lesson, your tasks, the open file and your latest check. Switch the AI under the message box.'
  },
  {
    anchor: TOUR.view,
    title: 'View',
    text: 'Text size, layout, theme and reset live here.'
  },
  {
    anchor: TOUR.help,
    title: 'This tour',
    text: 'Open it again any time from here.'
  }
]
