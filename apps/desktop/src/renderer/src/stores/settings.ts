import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_CODE_THEME, type CodeThemeId } from '@indent/design/code-palette'
import { fontStack } from '@/lib/fonts'
import { setShortcutOverrides, type ShortcutOverrides } from '@/lib/shortcuts'
import type { GuideStage } from '@/features/tour/guide'
import { mergeSettings } from './mergeSettings'

export type Theme = 'dark' | 'light'
export type Appearance = Theme | 'system'
export type EditorOption = 'wordWrap' | 'lineNumbers' | 'minimap'
export type TextZone = 'lesson' | 'tasks' | 'editor' | 'terminal'
export type PanelKey = 'files' | 'terminal' | 'chat' | 'zen' | 'browser'
export type Experience = 'new' | 'some' | 'experienced'
export type CursorStyle = 'block' | 'bar' | 'underline'

export interface Typography {
  /** null is the bundled default (IBM Plex). */
  uiFont: string | null
  /** Pixels of lesson and task text; the lesson and tasks zones scale on top of it. */
  uiSize: number
  monoFont: string | null
  /** Pixels of code in the editor and the terminal; their zones scale on top of it. */
  monoSize: number
  lineHeight: number
  ligatures: boolean
  cursor: CursorStyle
}

export const DEFAULT_TYPOGRAPHY: Typography = {
  uiFont: null,
  uiSize: 15,
  monoFont: null,
  monoSize: 13,
  lineHeight: 1.6,
  ligatures: false,
  cursor: 'block'
}

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
  typography: Typography
  /** Which optional panels are showing. `zen` hides everything but the editor. */
  panels: Record<PanelKey, boolean>
  lessonSide: 'left' | 'right'
  leftTab: 'insights' | 'tasks'
  tourSeen: boolean
  /** The first-run setup was finished or skipped. */
  onboarded: boolean
  /** The request for a star on GitHub was answered or closed; it is never shown again. */
  starAsked: boolean
  /** How many times the app has opened, this time included. */
  launches: number
  /** Anonymous usage stats; on unless turned off in Settings. Nothing is sent while false. */
  telemetry: boolean
  /** Look for a new version of the app on start and every few hours. */
  autoUpdate: boolean
  /** The app version seen last, so a new one can say what changed once. */
  lastVersion: string | null
  /** Id of the roadmap picked as a goal in the setup or on Roadmaps; null when not sure yet. */
  goal: string | null
  experience: Experience | null
  /** Ids of DSA patterns whose animation was played to the end. */
  dsaWatched: string[]
  /** Keys picked in Settings, only for the shortcuts that differ from their defaults. */
  shortcuts: ShortcutOverrides
  /** Where the guide from the setup into the first issue is; null when it is not running. */
  guide: GuideStage | null
  setShortcuts(shortcuts: ShortcutOverrides): void
  markDsaWatched(id: string): void
  toggleTheme(): void
  setAppearance(appearance: Appearance): void
  setCodeTheme(codeTheme: CodeThemeId): void
  setEditorOption(option: EditorOption, on: boolean): void
  setTextScale(zone: TextZone, value: number): void
  setAllTextScale(value: number): void
  setTypography(change: Partial<Typography>): void
  setPanel(key: PanelKey, open: boolean): void
  togglePanel(key: PanelKey): void
  setLessonSide(side: 'left' | 'right'): void
  setLeftTab(tab: 'insights' | 'tasks'): void
  setTourSeen(seen: boolean): void
  setOnboarded(onboarded: boolean): void
  setStarAsked(asked: boolean): void
  setTelemetry(telemetry: boolean): void
  setAutoUpdate(autoUpdate: boolean): void
  setLastVersion(lastVersion: string): void
  setGoal(goal: string | null): void
  setExperience(experience: Experience): void
  resetLayout(): void
  setGuide(guide: GuideStage | null): void
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
      typography: DEFAULT_TYPOGRAPHY,
      panels: defaultPanels,
      lessonSide: 'left',
      leftTab: 'insights',
      tourSeen: false,
      onboarded: false,
      starAsked: false,
      launches: 0,
      telemetry: true,
      autoUpdate: true,
      lastVersion: null,
      goal: null,
      experience: null,
      dsaWatched: [],
      shortcuts: {},
      guide: null,
      setShortcuts: (shortcuts) => set({ shortcuts }),
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
      setTypography: (change) => set((s) => ({ typography: { ...s.typography, ...change } })),
      setPanel: (key, open) => set((s) => ({ panels: { ...s.panels, [key]: open } })),
      togglePanel: (key) => set((s) => ({ panels: { ...s.panels, [key]: !s.panels[key] } })),
      setLessonSide: (lessonSide) => set({ lessonSide }),
      setLeftTab: (leftTab) => set({ leftTab }),
      setTourSeen: (tourSeen) => set({ tourSeen }),
      setOnboarded: (onboarded) => set({ onboarded }),
      setStarAsked: (starAsked) => set({ starAsked }),
      setTelemetry: (telemetry) => set({ telemetry }),
      setAutoUpdate: (autoUpdate) => set({ autoUpdate }),
      setLastVersion: (lastVersion) => set({ lastVersion }),
      setGoal: (goal) => set({ goal }),
      setExperience: (experience) => set({ experience }),
      resetLayout: () => set({ panels: defaultPanels, lessonSide: 'left' }),
      setGuide: (guide) => set({ guide })
    }),
    {
      name: 'indent-settings',
      version: 1,
      merge: (saved, current) => mergeSettings(saved, current, systemTheme())
    }
  )
)

function applyToDocument({ theme, textScale, typography: t }: SettingsState): void {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  const base = t.uiSize / DEFAULT_TYPOGRAPHY.uiSize
  root.style.setProperty('--scale-lesson', String(base * textScale.lesson))
  root.style.setProperty('--scale-tasks', String(base * textScale.tasks))
  const font = (name: string, value: string | null): void => {
    if (value) root.style.setProperty(name, value)
    else root.style.removeProperty(name)
  }
  font('--font-ui', t.uiFont && fontStack(t.uiFont, 'sans'))
  font('--font-code', t.monoFont && fontStack(t.monoFont, 'mono'))
}

applyToDocument(useSettings.getState())
setShortcutOverrides(useSettings.getState().shortcuts)
// Read back from storage above, so this counts this start on top of the earlier ones.
useSettings.setState((s) => ({ launches: s.launches + 1 }))
useSettings.subscribe(applyToDocument)
useSettings.subscribe((s, previous) => {
  if (s.shortcuts !== previous.shortcuts) setShortcutOverrides(s.shortcuts)
})

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const { appearance, setAppearance } = useSettings.getState()
  if (appearance === 'system') setAppearance('system')
})
