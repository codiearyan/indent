import { useSettings } from '@/stores/settings'
import { TOUR, type TourAnchor } from './anchors'

export interface TourStep {
  anchor: TourAnchor
  title: string
  text: string
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
    title: 'Your tasks',
    text: 'This is what you build in this chapter. A task turns green once your code passes its hidden checks.',
    prepare: showLeft('tasks')
  },
  {
    anchor: TOUR.insightsTab,
    title: 'Chapter insights',
    text: 'The lesson: the story, the problem and the ideas you need for the tasks.',
    prepare: showLeft('insights')
  },
  {
    anchor: TOUR.audio,
    title: 'Listen instead',
    text: 'Have the lesson read aloud, part by part, while you keep reading or coding.',
    prepare: showLeft('insights')
  },
  {
    anchor: TOUR.taskCheck,
    title: 'Check one task',
    text: 'Runs the hidden tests for just this task and tells you in plain words what to look at.',
    prepare: showLeft('tasks')
  },
  {
    anchor: TOUR.taskNext,
    title: 'Stuck on where to start?',
    text: 'Short steps that point you in the right direction without giving the answer away.',
    prepare: showLeft('tasks')
  },
  {
    anchor: TOUR.editorTabs,
    title: 'Your files',
    text: 'The files this chapter is about. Switch between them here.'
  },
  {
    anchor: TOUR.editor,
    title: 'The editor',
    text: 'Write your code here. Everything saves to disk as you type.'
  },
  {
    anchor: TOUR.checkAll,
    title: 'Check all tasks',
    text: 'Runs every check at once when you think you are done.'
  },
  {
    anchor: TOUR.terminal,
    title: 'A real terminal',
    text: 'A shell in your chapter folder. Run your code and explore. You do not need it to check your work.',
    prepare: showTerminal
  },
  {
    anchor: TOUR.mode,
    title: 'Hard or easy',
    text: 'Hard mode pays full points. Easy mode pays half and lets you open solutions after a check.'
  },
  {
    anchor: TOUR.level,
    title: 'Your level',
    text: 'Points from passed tasks add up here. Open it to see how far the next level is.'
  },
  {
    anchor: TOUR.aiSuggestions,
    title: 'AI help',
    text: 'Pick the AI that helps you, and turn grey inline suggestions in the editor on or off.'
  },
  {
    anchor: TOUR.reset,
    title: 'Start the files over',
    text: 'Brings back the starter files. Your passed tasks and points stay.'
  },
  {
    anchor: TOUR.chat,
    title: 'Ask the tutor',
    text: 'A chat that knows the lesson, your tasks, the open file and your latest check.'
  },
  {
    anchor: TOUR.textSize,
    title: 'Text size',
    text: 'Make the lesson, tasks, editor or terminal bigger or smaller. It is saved on this device.'
  }
]
