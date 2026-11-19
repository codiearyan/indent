import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light'
export type TextZone = 'lesson' | 'tasks' | 'editor' | 'terminal'
export type PanelKey = 'files' | 'terminal' | 'chat' | 'zen'

export const TEXT_SCALE_MIN = 0.8
export const TEXT_SCALE_MAX = 1.6
export const TEXT_SCALE_PRESETS = { S: 0.9, M: 1, L: 1.15, XL: 1.3 } as const

interface SettingsState {
  theme: Theme
  /** 1 = 100%. Lesson and tasks scale through CSS; editor and terminal multiply their font size. */
  textScale: Record<TextZone, number>
  /** Which optional panels are showing. `zen` hides everything but the editor. */
  panels: Record<PanelKey, boolean>
  lessonSide: 'left' | 'right'
  leftTab: 'insights' | 'tasks'
  tourSeen: boolean
  /** The first-run setup was finished or skipped. */
  onboarded: boolean
  /** Ids of DSA patterns whose animation was played to the end. */
  dsaWatched: string[]
  markDsaWatched(id: string): void
  toggleTheme(): void
  setTextScale(zone: TextZone, value: number): void
  setAllTextScale(value: number): void
  setPanel(key: PanelKey, open: boolean): void
  togglePanel(key: PanelKey): void
  setLessonSide(side: 'left' | 'right'): void
  setLeftTab(tab: 'insights' | 'tasks'): void
  setTourSeen(seen: boolean): void
  setOnboarded(onboarded: boolean): void
  resetLayout(): void
}

const defaultScale: Record<TextZone, number> = { lesson: 1, tasks: 1, editor: 1, terminal: 1 }
const defaultPanels: Record<PanelKey, boolean> = {
  files: false,
  terminal: false,
  chat: false,
  zen: false
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      textScale: defaultScale,
      panels: defaultPanels,
      lessonSide: 'left',
      leftTab: 'insights',
      tourSeen: false,
      onboarded: false,
      dsaWatched: [],
      markDsaWatched: (id) =>
        set((s) => (s.dsaWatched.includes(id) ? s : { dsaWatched: [...s.dsaWatched, id] })),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setTextScale: (zone, value) => set((s) => ({ textScale: { ...s.textScale, [zone]: value } })),
      setAllTextScale: (value) =>
        set({ textScale: { lesson: value, tasks: value, editor: value, terminal: value } }),
      setPanel: (key, open) => set((s) => ({ panels: { ...s.panels, [key]: open } })),
      togglePanel: (key) => set((s) => ({ panels: { ...s.panels, [key]: !s.panels[key] } })),
      setLessonSide: (lessonSide) => set({ lessonSide }),
      setLeftTab: (leftTab) => set({ leftTab }),
      setTourSeen: (tourSeen) => set({ tourSeen }),
      setOnboarded: (onboarded) => set({ onboarded }),
      resetLayout: () => set({ panels: defaultPanels, lessonSide: 'left' })
    }),
    {
      name: 'indent-settings',
      version: 2,
      // Settings saved before the first-run setup existed belong to someone already set up.
      migrate: (saved, version) =>
        (version < 2 ? { ...(saved as object), onboarded: true } : saved) as SettingsState
    }
  )
)

function applyToDocument({ theme, textScale }: SettingsState): void {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.setProperty('--scale-lesson', String(textScale.lesson))
  root.style.setProperty('--scale-tasks', String(textScale.tasks))
}

applyToDocument(useSettings.getState())
useSettings.subscribe(applyToDocument)
