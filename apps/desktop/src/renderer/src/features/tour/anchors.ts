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
  chat: 'chat',
  aiSuggestions: 'ai-suggestions',
  view: 'view',
  help: 'help',
  upNext: 'up-next',
  upNextStrip: 'up-next-strip',
  repoIssues: 'repo-issues',
  repoFigures: 'repo-figures',
  repoStart: 'repo-start'
} as const

export type TourAnchor = (typeof TOUR)[keyof typeof TOUR]
