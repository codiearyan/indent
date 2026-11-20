import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_CODE_THEME, type CodeThemeId } from '@indent/design/code-palette'
import { mergeSettings } from './mergeSettings'

export type Theme = 'dark' | 'light'
export type Appearance = Theme | 'system'
export type EditorOption = 'wordWrap' | 'lineNumbers' | 'minimap'
export type TextZone = 'lesson' | 'tasks' | 'editor' | 'terminal'
export type PanelKey = 'files' | 'terminal' | 'chat' | 'zen' | 'browser'

export const TEXT_SCALE_MIN = 0.8
export const TEXT_SCALE_MAX = 1.6
export const TEXT_SCALE_PRESETS = { S: 0.9, M: 1, L: 1.15, XL: 1.3 } as const

export interface SettingsState {
  /** What the person picked; `system` follows the computer. */
  appearance: Appearance
  /** The theme on screen now: `appearance` with `system` resolved. */
  theme: Theme
  codeTheme: CodeThemeId
  editor: Record<EditorOption, boolean>
  /** 1 = 100%. Lesson and tasks scale through CSS; editor and terminal multiply their font size. */
  textScale: Record<TextZone, number>
  /** Which optional panels are showing. `zen` hides everything but the editor. */
  panels: Record<PanelKey, boolean>
  lessonSide: 'left' | 'right'
  leftTab: 'insights' | 'tasks'
  tourSeen: boolean
  /** The first-run setup was finished or skipped. */
  onboarded: boolean
  /** The request for a star on GitHub was answered or closed; it is never shown again. */
  starAsked: boolean
  /** Ids of DSA patterns whose animation was played to the end. */
  dsaWatched: string[]
  markDsaWatched(id: string): void
  toggleTheme(): void
  setAppearance(appearance: Appearance): void
  setCodeTheme(codeTheme: CodeThemeId): void
  setEditorOption(option: EditorOption, on: boolean): void
  setTextScale(zone: TextZone, value: number): void
  setAllTextScale(value: number): void
  setPanel(key: PanelKey, open: boolean): void
  togglePanel(key: PanelKey): void
  setLessonSide(side: 'left' | 'right'): void
  setLeftTab(tab: 'insights' | 'tasks'): void
  setTourSeen(seen: boolean): void
  setOnboarded(onboarded: boolean): void
  setStarAsked(asked: boolean): void
  resetLayout(): void
}

const defaultScale: Record<TextZone, number> = { lesson: 1, tasks: 1, editor: 1, terminal: 1 }
const defaultPanels: Record<PanelKey, boolean> = {
  files: false,
  terminal: false,
  chat: false,
  zen: false,
  browser: true
}

const defaultEditor: Record<EditorOption, boolean> = {
  wordWrap: false,
  lineNumbers: true,
  minimap: false
}

const systemTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

const resolve = (appearance: Appearance): Theme =>
  appearance === 'system' ? systemTheme() : appearance

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      appearance: 'dark',
      theme: 'dark',
      codeTheme: DEFAULT_CODE_THEME,
      editor: defaultEditor,
      textScale: defaultScale,
      panels: defaultPanels,
      lessonSide: 'left',
      leftTab: 'insights',
      tourSeen: false,
      onboarded: false,
      starAsked: false,
      dsaWatched: [],
      markDsaWatched: (id) =>
        set((s) => (s.dsaWatched.includes(id) ? s : { dsaWatched: [...s.dsaWatched, id] })),
      toggleTheme: () =>
        set((s) => {
          const theme = s.theme === 'dark' ? 'light' : 'dark'
          return { appearance: theme, theme }
        }),
      setAppearance: (appearance) => set({ appearance, theme: resolve(appearance) }),
      setCodeTheme: (codeTheme) => set({ codeTheme }),
      setEditorOption: (option, on) => set((s) => ({ editor: { ...s.editor, [option]: on } })),
      setTextScale: (zone, value) => set((s) => ({ textScale: { ...s.textScale, [zone]: value } })),
      setAllTextScale: (value) =>
        set({ textScale: { lesson: value, tasks: value, editor: value, terminal: value } }),
      setPanel: (key, open) => set((s) => ({ panels: { ...s.panels, [key]: open } })),
      togglePanel: (key) => set((s) => ({ panels: { ...s.panels, [key]: !s.panels[key] } })),
      setLessonSide: (lessonSide) => set({ lessonSide }),
      setLeftTab: (leftTab) => set({ leftTab }),
      setTourSeen: (tourSeen) => set({ tourSeen }),
      setOnboarded: (onboarded) => set({ onboarded }),
      setStarAsked: (starAsked) => set({ starAsked }),
      resetLayout: () => set({ panels: defaultPanels, lessonSide: 'left' })
    }),
    {
      name: 'indent-settings',
      version: 1,
      merge: (saved, current) => mergeSettings(saved, current, systemTheme())
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

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const { appearance, setAppearance } = useSettings.getState()
  if (appearance === 'system') setAppearance('system')
})
