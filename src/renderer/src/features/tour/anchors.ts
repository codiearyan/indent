/**
 * Elements the guided tour points at, in tour order. The owning component puts
 * `data-tour={TOUR.x}` on the element; the tour finds it with a selector.
 */
export const TOUR = {
  tasksTab: 'tasks-tab',
  insightsTab: 'insights-tab',
  audio: 'audio',
  taskCheck: 'task-check',
  taskNext: 'task-next',
  editorTabs: 'editor-tabs',
  editor: 'editor',
  checkAll: 'check-all',
  terminal: 'terminal',
  mode: 'mode',
  level: 'level',
  aiSuggestions: 'ai-suggestions',
  reset: 'reset',
  chat: 'chat',
  textSize: 'text-size'
} as const

export type TourAnchor = (typeof TOUR)[keyof typeof TOUR]
